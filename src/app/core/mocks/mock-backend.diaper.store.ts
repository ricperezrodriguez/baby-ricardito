import { Service } from '@angular/core';
import {
  DEFAULT_DIAPER_POOP_ALERT_SETTINGS,
  DIAPER_HISTORY_CHART_IDS,
  DiaperChange,
  DiaperChangesPage,
  DiaperHistoryPreferences,
  DiaperPoopAlertSettings,
  DiaperStats,
  DiaperStatsRequest,
  DiaperType,
} from '@app/features/diaper/diaper.models';
import { notFound } from '@app/core/mocks/mock-backend.errors';
import { parseHiddenChartsBody } from '@app/core/mocks/mock-backend.parsing';
import { revokePhotoUrl } from '@app/core/mocks/mock-backend.photos';
import { SEED_BABY_ID } from '@app/core/mocks/mock-backend.seed-utils';
import { createSeedDiaperChanges } from '@app/core/mocks/mock-backend.diaper.seed';
import { calculateDiaperStats } from '@app/core/mocks/mock-backend.diaper.stats';
import {
  DiaperChangeInput,
  applyUpdate,
  assertValidChange,
  parseCreateBody,
  parsePhotoBody,
  parsePoopAlertBody,
  parseUpdateBody,
} from '@app/core/mocks/mock-backend.diaper.validation';

type BabyChanges = Map<string, DiaperChange>;

function toChangeMap(changes: DiaperChange[]): BabyChanges {
  return new Map(changes.map((change) => [change.id, change]));
}

function byChangedAtDescending(a: DiaperChange, b: DiaperChange): number {
  return Date.parse(b.changedAt) - Date.parse(a.changedAt) || b.id.localeCompare(a.id);
}

function buildChange(
  base: Pick<DiaperChange, 'id' | 'babyId' | 'createdAt'>,
  input: DiaperChangeInput,
  updatedAt: string,
): DiaperChange {
  const { notes, photoUrl, ...content } = input;
  return {
    ...base,
    ...content,
    ...(notes === undefined ? {} : { notes }),
    ...(photoUrl === undefined ? {} : { photoUrl }),
    updatedAt,
  };
}

/** In-memory diaper data store: lives as long as the app stays open. */
@Service()
export class MockDiaperStore {
  private readonly changesByBaby = new Map<string, BabyChanges>([
    [SEED_BABY_ID, toChangeMap(createSeedDiaperChanges(new Date()))],
  ]);
  private readonly historyPreferencesByBaby = new Map<string, DiaperHistoryPreferences>();
  private readonly poopAlertByBaby = new Map<string, DiaperPoopAlertSettings>();

  /** Newest first; `types` empty means every type. */
  list(babyId: string, limit: number, offset: number, types: readonly DiaperType[]): DiaperChangesPage {
    const changes = [...this.requireBabyChanges(babyId).values()]
      .filter((change) => types.length === 0 || types.includes(change.type))
      .sort(byChangedAtDescending);
    return { items: changes.slice(offset, offset + limit), total: changes.length, limit, offset };
  }

  getById(babyId: string, changeId: string): DiaperChange {
    return this.requireChange(babyId, changeId);
  }

  stats(babyId: string, request: DiaperStatsRequest): DiaperStats {
    return calculateDiaperStats([...this.requireBabyChanges(babyId).values()], request);
  }

  getHistoryPreferences(babyId: string): DiaperHistoryPreferences {
    this.requireBabyChanges(babyId);
    return this.historyPreferencesByBaby.get(babyId) ?? { hiddenCharts: [] };
  }

  saveHistoryPreferences(babyId: string, body: unknown): DiaperHistoryPreferences {
    this.requireBabyChanges(babyId);
    const preferences = parseHiddenChartsBody(body, DIAPER_HISTORY_CHART_IDS);
    this.historyPreferencesByBaby.set(babyId, preferences);
    return preferences;
  }

  getPoopAlertSettings(babyId: string): DiaperPoopAlertSettings {
    this.requireBabyChanges(babyId);
    return this.poopAlertByBaby.get(babyId) ?? { ...DEFAULT_DIAPER_POOP_ALERT_SETTINGS };
  }

  savePoopAlertSettings(babyId: string, body: unknown): DiaperPoopAlertSettings {
    this.requireBabyChanges(babyId);
    const settings = parsePoopAlertBody(body);
    this.poopAlertByBaby.set(babyId, settings);
    return settings;
  }

  create(babyId: string, body: unknown): DiaperChange {
    const changes = this.requireBabyChanges(babyId);
    const input = parseCreateBody(body);
    assertValidChange(input, Date.now());

    const timestamp = new Date().toISOString();
    const change = buildChange({ id: crypto.randomUUID(), babyId, createdAt: timestamp }, input, timestamp);
    changes.set(change.id, change);
    return change;
  }

  update(babyId: string, changeId: string, body: unknown): DiaperChange {
    const current = this.requireChange(babyId, changeId);
    const input = applyUpdate(current, parseUpdateBody(body));
    assertValidChange(input, Date.now());
    return this.replace(current, input);
  }

  remove(babyId: string, changeId: string): void {
    const change = this.requireChange(babyId, changeId);
    this.requireBabyChanges(babyId).delete(changeId);
    revokePhotoUrl(change.photoUrl);
  }

  setPhoto(babyId: string, changeId: string, body: unknown): DiaperChange {
    const current = this.requireChange(babyId, changeId);
    const photo = parsePhotoBody(body);
    return this.replace(current, { ...current, photoUrl: URL.createObjectURL(photo) });
  }

  removePhoto(babyId: string, changeId: string): DiaperChange {
    const current = this.requireChange(babyId, changeId);
    return this.replace(current, { ...current, photoUrl: null });
  }

  private replace(current: DiaperChange, input: DiaperChangeInput): DiaperChange {
    const updated = buildChange(
      { id: current.id, babyId: current.babyId, createdAt: current.createdAt },
      input,
      new Date().toISOString(),
    );
    this.requireBabyChanges(current.babyId).set(updated.id, updated);
    if (current.photoUrl !== updated.photoUrl) {
      revokePhotoUrl(current.photoUrl);
    }
    return updated;
  }

  private requireBabyChanges(babyId: string): BabyChanges {
    const changes = this.changesByBaby.get(babyId);
    if (changes === undefined) {
      throw notFound('BABY_NOT_FOUND', `Baby "${babyId}" does not exist.`);
    }
    return changes;
  }

  private requireChange(babyId: string, changeId: string): DiaperChange {
    const change = this.requireBabyChanges(babyId).get(changeId);
    if (change === undefined) {
      throw notFound('CHANGE_NOT_FOUND', `Diaper change "${changeId}" does not exist.`);
    }
    return change;
  }
}
