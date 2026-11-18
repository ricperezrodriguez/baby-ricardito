import { Service } from '@angular/core';
import { notFound } from '@app/core/mocks/mock-backend.errors';
import { createSeedNailTrims } from '@app/core/mocks/mock-backend.nail-trimming.seed';
import { calculateNailTrimmingStats } from '@app/core/mocks/mock-backend.nail-trimming.stats';
import {
  NailTrimInput,
  applyUpdate,
  assertValidTrim,
  parseCreateBody,
  parseOverdueAlertBody,
  parseUpdateBody,
} from '@app/core/mocks/mock-backend.nail-trimming.validation';
import { parseHiddenChartsBody } from '@app/core/mocks/mock-backend.parsing';
import { SEED_BABY_ID } from '@app/core/mocks/mock-backend.seed-utils';
import {
  DEFAULT_NAIL_TRIM_OVERDUE_ALERT_SETTINGS,
  NAIL_TRIMMING_HISTORY_CHART_IDS,
  NailTrim,
  NailTrimOverdueAlertSettings,
  NailTrimmingHistoryPreferences,
  NailTrimmingStats,
  NailTrimmingStatsRequest,
  NailTrimsPage,
} from '@app/features/nail-trimming/nail-trimming.models';

type BabyTrims = Map<string, NailTrim>;

function toTrimMap(trims: NailTrim[]): BabyTrims {
  return new Map(trims.map((trim) => [trim.id, trim]));
}

function byTrimmedAtDescending(a: NailTrim, b: NailTrim): number {
  return Date.parse(b.trimmedAt) - Date.parse(a.trimmedAt) || b.id.localeCompare(a.id);
}

function buildTrim(
  base: Pick<NailTrim, 'id' | 'babyId' | 'createdAt'>,
  input: NailTrimInput,
  updatedAt: string,
): NailTrim {
  return { ...base, ...input, updatedAt };
}

/** In-memory nail trimming data store: lives as long as the app stays open. */
@Service()
export class MockNailTrimmingStore {
  private readonly trimsByBaby = new Map<string, BabyTrims>([
    [SEED_BABY_ID, toTrimMap(createSeedNailTrims(new Date()))],
  ]);
  private readonly historyPreferencesByBaby = new Map<string, NailTrimmingHistoryPreferences>();
  private readonly overdueAlertByBaby = new Map<string, NailTrimOverdueAlertSettings>();

  /** Newest first. */
  list(babyId: string, limit: number, offset: number): NailTrimsPage {
    const trims = [...this.requireBabyTrims(babyId).values()].sort(byTrimmedAtDescending);
    return { items: trims.slice(offset, offset + limit), total: trims.length, limit, offset };
  }

  getById(babyId: string, trimId: string): NailTrim {
    return this.requireTrim(babyId, trimId);
  }

  stats(babyId: string, request: NailTrimmingStatsRequest): NailTrimmingStats {
    return calculateNailTrimmingStats([...this.requireBabyTrims(babyId).values()], request);
  }

  getHistoryPreferences(babyId: string): NailTrimmingHistoryPreferences {
    this.requireBabyTrims(babyId);
    return this.historyPreferencesByBaby.get(babyId) ?? { hiddenCharts: [] };
  }

  saveHistoryPreferences(babyId: string, body: unknown): NailTrimmingHistoryPreferences {
    this.requireBabyTrims(babyId);
    const preferences = parseHiddenChartsBody(body, NAIL_TRIMMING_HISTORY_CHART_IDS);
    this.historyPreferencesByBaby.set(babyId, preferences);
    return preferences;
  }

  getOverdueAlertSettings(babyId: string): NailTrimOverdueAlertSettings {
    this.requireBabyTrims(babyId);
    return this.overdueAlertByBaby.get(babyId) ?? { ...DEFAULT_NAIL_TRIM_OVERDUE_ALERT_SETTINGS };
  }

  saveOverdueAlertSettings(babyId: string, body: unknown): NailTrimOverdueAlertSettings {
    this.requireBabyTrims(babyId);
    const settings = parseOverdueAlertBody(body);
    this.overdueAlertByBaby.set(babyId, settings);
    return settings;
  }

  create(babyId: string, body: unknown): NailTrim {
    const trims = this.requireBabyTrims(babyId);
    const input = parseCreateBody(body);
    assertValidTrim(input, Date.now());

    const timestamp = new Date().toISOString();
    const trim = buildTrim(
      { id: crypto.randomUUID(), babyId, createdAt: timestamp },
      input,
      timestamp,
    );
    trims.set(trim.id, trim);
    return trim;
  }

  update(babyId: string, trimId: string, body: unknown): NailTrim {
    const current = this.requireTrim(babyId, trimId);
    const input = applyUpdate(current, parseUpdateBody(body));
    assertValidTrim(input, Date.now());

    const updated = buildTrim(
      { id: current.id, babyId: current.babyId, createdAt: current.createdAt },
      input,
      new Date().toISOString(),
    );
    this.requireBabyTrims(babyId).set(updated.id, updated);
    return updated;
  }

  remove(babyId: string, trimId: string): void {
    this.requireTrim(babyId, trimId);
    this.requireBabyTrims(babyId).delete(trimId);
  }

  private requireBabyTrims(babyId: string): BabyTrims {
    const trims = this.trimsByBaby.get(babyId);
    if (trims === undefined) {
      throw notFound('BABY_NOT_FOUND', `Baby "${babyId}" does not exist.`);
    }
    return trims;
  }

  private requireTrim(babyId: string, trimId: string): NailTrim {
    const trim = this.requireBabyTrims(babyId).get(trimId);
    if (trim === undefined) {
      throw notFound('NAIL_TRIM_NOT_FOUND', `Nail trim "${trimId}" does not exist.`);
    }
    return trim;
  }
}
