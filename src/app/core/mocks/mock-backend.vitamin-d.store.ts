import { Service } from '@angular/core';
import {
  DEFAULT_VITAMIN_D_MISSED_ALERT_SETTINGS,
  VITAMIN_D_HISTORY_CHART_IDS,
  VitaminDDose,
  VitaminDDosesPage,
  VitaminDHistoryPreferences,
  VitaminDMissedAlertSettings,
  VitaminDStats,
  VitaminDStatsRequest,
} from '@app/features/vitamin-d/vitamin-d.models';
import { notFound } from '@app/core/mocks/mock-backend.errors';
import { parseHiddenChartsBody } from '@app/core/mocks/mock-backend.parsing';
import { SEED_BABY_ID } from '@app/core/mocks/mock-backend.seed-utils';
import { createSeedVitaminDDoses } from '@app/core/mocks/mock-backend.vitamin-d.seed';
import { calculateVitaminDStats } from '@app/core/mocks/mock-backend.vitamin-d.stats';
import {
  VitaminDDoseInput,
  applyUpdate,
  assertValidDose,
  parseCreateBody,
  parseMissedAlertBody,
  parseUpdateBody,
} from '@app/core/mocks/mock-backend.vitamin-d.validation';

type BabyDoses = Map<string, VitaminDDose>;

function toDoseMap(doses: VitaminDDose[]): BabyDoses {
  return new Map(doses.map((dose) => [dose.id, dose]));
}

function byGivenAtDescending(a: VitaminDDose, b: VitaminDDose): number {
  return Date.parse(b.givenAt) - Date.parse(a.givenAt) || b.id.localeCompare(a.id);
}

function buildDose(
  base: Pick<VitaminDDose, 'id' | 'babyId' | 'createdAt'>,
  input: VitaminDDoseInput,
  updatedAt: string,
): VitaminDDose {
  return { ...base, ...input, updatedAt };
}

/** In-memory vitamin D data store: lives as long as the app stays open. */
@Service()
export class MockVitaminDStore {
  private readonly dosesByBaby = new Map<string, BabyDoses>([
    [SEED_BABY_ID, toDoseMap(createSeedVitaminDDoses(new Date()))],
  ]);
  private readonly historyPreferencesByBaby = new Map<string, VitaminDHistoryPreferences>();
  private readonly missedAlertByBaby = new Map<string, VitaminDMissedAlertSettings>();

  /** Newest first. */
  list(babyId: string, limit: number, offset: number): VitaminDDosesPage {
    const doses = [...this.requireBabyDoses(babyId).values()].sort(byGivenAtDescending);
    return { items: doses.slice(offset, offset + limit), total: doses.length, limit, offset };
  }

  getById(babyId: string, doseId: string): VitaminDDose {
    return this.requireDose(babyId, doseId);
  }

  stats(babyId: string, request: VitaminDStatsRequest): VitaminDStats {
    return calculateVitaminDStats([...this.requireBabyDoses(babyId).values()], request, Date.now());
  }

  getHistoryPreferences(babyId: string): VitaminDHistoryPreferences {
    this.requireBabyDoses(babyId);
    return this.historyPreferencesByBaby.get(babyId) ?? { hiddenCharts: [] };
  }

  saveHistoryPreferences(babyId: string, body: unknown): VitaminDHistoryPreferences {
    this.requireBabyDoses(babyId);
    const preferences = parseHiddenChartsBody(body, VITAMIN_D_HISTORY_CHART_IDS);
    this.historyPreferencesByBaby.set(babyId, preferences);
    return preferences;
  }

  getMissedAlertSettings(babyId: string): VitaminDMissedAlertSettings {
    this.requireBabyDoses(babyId);
    return this.missedAlertByBaby.get(babyId) ?? { ...DEFAULT_VITAMIN_D_MISSED_ALERT_SETTINGS };
  }

  saveMissedAlertSettings(babyId: string, body: unknown): VitaminDMissedAlertSettings {
    this.requireBabyDoses(babyId);
    const settings = parseMissedAlertBody(body);
    this.missedAlertByBaby.set(babyId, settings);
    return settings;
  }

  create(babyId: string, body: unknown): VitaminDDose {
    const doses = this.requireBabyDoses(babyId);
    const input = parseCreateBody(body);
    assertValidDose(input, Date.now());

    const timestamp = new Date().toISOString();
    const dose = buildDose({ id: crypto.randomUUID(), babyId, createdAt: timestamp }, input, timestamp);
    doses.set(dose.id, dose);
    return dose;
  }

  update(babyId: string, doseId: string, body: unknown): VitaminDDose {
    const current = this.requireDose(babyId, doseId);
    const input = applyUpdate(current, parseUpdateBody(body));
    assertValidDose(input, Date.now());

    const updated = buildDose(
      { id: current.id, babyId: current.babyId, createdAt: current.createdAt },
      input,
      new Date().toISOString(),
    );
    this.requireBabyDoses(babyId).set(updated.id, updated);
    return updated;
  }

  remove(babyId: string, doseId: string): void {
    this.requireDose(babyId, doseId);
    this.requireBabyDoses(babyId).delete(doseId);
  }

  private requireBabyDoses(babyId: string): BabyDoses {
    const doses = this.dosesByBaby.get(babyId);
    if (doses === undefined) {
      throw notFound('BABY_NOT_FOUND', `Baby "${babyId}" does not exist.`);
    }
    return doses;
  }

  private requireDose(babyId: string, doseId: string): VitaminDDose {
    const dose = this.requireBabyDoses(babyId).get(doseId);
    if (dose === undefined) {
      throw notFound('DOSE_NOT_FOUND', `Vitamin D dose "${doseId}" does not exist.`);
    }
    return dose;
  }
}
