import { Service } from '@angular/core';
import { createSeedBaths } from '@app/core/mocks/mock-backend.bath.seed';
import { calculateBathStats } from '@app/core/mocks/mock-backend.bath.stats';
import {
  BathInput,
  applyUpdate,
  assertValidBath,
  parseCreateBody,
  parseOverdueAlertBody,
  parseUpdateBody,
} from '@app/core/mocks/mock-backend.bath.validation';
import { notFound } from '@app/core/mocks/mock-backend.errors';
import { parseHiddenChartsBody } from '@app/core/mocks/mock-backend.parsing';
import { SEED_BABY_ID } from '@app/core/mocks/mock-backend.seed-utils';
import {
  BATH_HISTORY_CHART_IDS,
  Bath,
  BathHistoryPreferences,
  BathOverdueAlertSettings,
  BathStats,
  BathStatsRequest,
  BathsPage,
  DEFAULT_BATH_OVERDUE_ALERT_SETTINGS,
} from '@app/features/bath/bath.models';

type BabyBaths = Map<string, Bath>;

function toBathMap(baths: Bath[]): BabyBaths {
  return new Map(baths.map((bath) => [bath.id, bath]));
}

function byBathedAtDescending(a: Bath, b: Bath): number {
  return Date.parse(b.bathedAt) - Date.parse(a.bathedAt) || b.id.localeCompare(a.id);
}

function buildBath(
  base: Pick<Bath, 'id' | 'babyId' | 'createdAt'>,
  input: BathInput,
  updatedAt: string,
): Bath {
  return { ...base, ...input, updatedAt };
}

/** In-memory bath data store: lives as long as the app stays open. */
@Service()
export class MockBathStore {
  private readonly bathsByBaby = new Map<string, BabyBaths>([
    [SEED_BABY_ID, toBathMap(createSeedBaths(new Date()))],
  ]);
  private readonly historyPreferencesByBaby = new Map<string, BathHistoryPreferences>();
  private readonly overdueAlertByBaby = new Map<string, BathOverdueAlertSettings>();

  /** Newest first. */
  list(babyId: string, limit: number, offset: number): BathsPage {
    const baths = [...this.requireBabyBaths(babyId).values()].sort(byBathedAtDescending);
    return { items: baths.slice(offset, offset + limit), total: baths.length, limit, offset };
  }

  getById(babyId: string, bathId: string): Bath {
    return this.requireBath(babyId, bathId);
  }

  stats(babyId: string, request: BathStatsRequest): BathStats {
    return calculateBathStats([...this.requireBabyBaths(babyId).values()], request);
  }

  getHistoryPreferences(babyId: string): BathHistoryPreferences {
    this.requireBabyBaths(babyId);
    return this.historyPreferencesByBaby.get(babyId) ?? { hiddenCharts: [] };
  }

  saveHistoryPreferences(babyId: string, body: unknown): BathHistoryPreferences {
    this.requireBabyBaths(babyId);
    const preferences = parseHiddenChartsBody(body, BATH_HISTORY_CHART_IDS);
    this.historyPreferencesByBaby.set(babyId, preferences);
    return preferences;
  }

  getOverdueAlertSettings(babyId: string): BathOverdueAlertSettings {
    this.requireBabyBaths(babyId);
    return this.overdueAlertByBaby.get(babyId) ?? { ...DEFAULT_BATH_OVERDUE_ALERT_SETTINGS };
  }

  saveOverdueAlertSettings(babyId: string, body: unknown): BathOverdueAlertSettings {
    this.requireBabyBaths(babyId);
    const settings = parseOverdueAlertBody(body);
    this.overdueAlertByBaby.set(babyId, settings);
    return settings;
  }

  create(babyId: string, body: unknown): Bath {
    const baths = this.requireBabyBaths(babyId);
    const input = parseCreateBody(body);
    assertValidBath(input, Date.now());

    const timestamp = new Date().toISOString();
    const bath = buildBath(
      { id: crypto.randomUUID(), babyId, createdAt: timestamp },
      input,
      timestamp,
    );
    baths.set(bath.id, bath);
    return bath;
  }

  update(babyId: string, bathId: string, body: unknown): Bath {
    const current = this.requireBath(babyId, bathId);
    const input = applyUpdate(current, parseUpdateBody(body));
    assertValidBath(input, Date.now());

    const updated = buildBath(
      { id: current.id, babyId: current.babyId, createdAt: current.createdAt },
      input,
      new Date().toISOString(),
    );
    this.requireBabyBaths(babyId).set(updated.id, updated);
    return updated;
  }

  remove(babyId: string, bathId: string): void {
    this.requireBath(babyId, bathId);
    this.requireBabyBaths(babyId).delete(bathId);
  }

  private requireBabyBaths(babyId: string): BabyBaths {
    const baths = this.bathsByBaby.get(babyId);
    if (baths === undefined) {
      throw notFound('BABY_NOT_FOUND', `Baby "${babyId}" does not exist.`);
    }
    return baths;
  }

  private requireBath(babyId: string, bathId: string): Bath {
    const bath = this.requireBabyBaths(babyId).get(bathId);
    if (bath === undefined) {
      throw notFound('BATH_NOT_FOUND', `Bath "${bathId}" does not exist.`);
    }
    return bath;
  }
}
