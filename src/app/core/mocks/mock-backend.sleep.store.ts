import { Service } from '@angular/core';
import {
  DEFAULT_SLEEP_AWAKE_ALERT_SETTINGS,
  DEFAULT_SLEEP_LONG_NAP_ALERT_SETTINGS,
  SLEEP_AWAKE_ALERT_THRESHOLDS,
  SLEEP_HISTORY_CHART_IDS,
  SLEEP_LONG_NAP_ALERT_THRESHOLDS,
  SleepAwakeAlertSettings,
  SleepHistoryPreferences,
  SleepLongNapAlertSettings,
  SleepSession,
  SleepSessionsPage,
  SleepStats,
  SleepStatsRequest,
} from '@app/features/sleep/sleep.models';
import { notFound } from '@app/core/mocks/mock-backend.errors';
import { parseHiddenChartsBody } from '@app/core/mocks/mock-backend.parsing';
import { SEED_BABY_ID } from '@app/core/mocks/mock-backend.seed-utils';
import { createSeedSleepSessions } from '@app/core/mocks/mock-backend.sleep.seed';
import { calculateSleepStats } from '@app/core/mocks/mock-backend.sleep.stats';
import {
  SleepSessionInput,
  StoredSleepSession,
  applyUpdate,
  assertNoConflicts,
  assertValidSleep,
  parseAlertBody,
  parseCreateBody,
  parseUpdateBody,
} from '@app/core/mocks/mock-backend.sleep.validation';

type BabySleeps = Map<string, StoredSleepSession>;

function toSleepMap(sessions: StoredSleepSession[]): BabySleeps {
  return new Map(sessions.map((session) => [session.id, session]));
}

function byStartTimeDescending(a: StoredSleepSession, b: StoredSleepSession): number {
  return Date.parse(b.startTime) - Date.parse(a.startTime) || b.id.localeCompare(a.id);
}

/** Adds the derived fields; the duration of an ongoing sleep is measured up to `now`. */
function toSession(stored: StoredSleepSession, now: number): SleepSession {
  const start = Date.parse(stored.startTime);
  const end = stored.endTime === null ? now : Date.parse(stored.endTime);
  return {
    ...stored,
    status: stored.endTime === null ? 'in_progress' : 'finished',
    durationSeconds: Math.max(0, Math.round((end - start) / 1_000)),
  };
}

/** In-memory sleep data store: lives as long as the app stays open. */
@Service()
export class MockSleepStore {
  private readonly sleepsByBaby = new Map<string, BabySleeps>([
    [SEED_BABY_ID, toSleepMap(createSeedSleepSessions(new Date()))],
  ]);
  private readonly historyPreferencesByBaby = new Map<string, SleepHistoryPreferences>();
  private readonly awakeAlertByBaby = new Map<string, SleepAwakeAlertSettings>();
  private readonly longNapAlertByBaby = new Map<string, SleepLongNapAlertSettings>();

  /** Newest start first, so an ongoing sleep is always the first one. */
  list(babyId: string, limit: number, offset: number): SleepSessionsPage {
    const now = Date.now();
    const sessions = [...this.requireBabySleeps(babyId).values()].sort(byStartTimeDescending);
    return {
      items: sessions.slice(offset, offset + limit).map((session) => toSession(session, now)),
      total: sessions.length,
      limit,
      offset,
    };
  }

  getById(babyId: string, sessionId: string): SleepSession {
    return toSession(this.requireSleep(babyId, sessionId), Date.now());
  }

  stats(babyId: string, request: SleepStatsRequest): SleepStats {
    return calculateSleepStats([...this.requireBabySleeps(babyId).values()], request);
  }

  getHistoryPreferences(babyId: string): SleepHistoryPreferences {
    this.requireBabySleeps(babyId);
    return this.historyPreferencesByBaby.get(babyId) ?? { hiddenCharts: [] };
  }

  saveHistoryPreferences(babyId: string, body: unknown): SleepHistoryPreferences {
    this.requireBabySleeps(babyId);
    const preferences = parseHiddenChartsBody(body, SLEEP_HISTORY_CHART_IDS);
    this.historyPreferencesByBaby.set(babyId, preferences);
    return preferences;
  }

  getAwakeAlertSettings(babyId: string): SleepAwakeAlertSettings {
    this.requireBabySleeps(babyId);
    return this.awakeAlertByBaby.get(babyId) ?? { ...DEFAULT_SLEEP_AWAKE_ALERT_SETTINGS };
  }

  saveAwakeAlertSettings(babyId: string, body: unknown): SleepAwakeAlertSettings {
    this.requireBabySleeps(babyId);
    const settings = parseAlertBody(body, SLEEP_AWAKE_ALERT_THRESHOLDS);
    this.awakeAlertByBaby.set(babyId, settings);
    return settings;
  }

  getLongNapAlertSettings(babyId: string): SleepLongNapAlertSettings {
    this.requireBabySleeps(babyId);
    return this.longNapAlertByBaby.get(babyId) ?? { ...DEFAULT_SLEEP_LONG_NAP_ALERT_SETTINGS };
  }

  saveLongNapAlertSettings(babyId: string, body: unknown): SleepLongNapAlertSettings {
    this.requireBabySleeps(babyId);
    const settings = parseAlertBody(body, SLEEP_LONG_NAP_ALERT_THRESHOLDS);
    this.longNapAlertByBaby.set(babyId, settings);
    return settings;
  }

  create(babyId: string, body: unknown): SleepSession {
    const sleeps = this.requireBabySleeps(babyId);
    const input = parseCreateBody(body);
    const now = Date.now();
    assertValidSleep(input, now);
    assertNoConflicts(input, [...sleeps.values()]);

    const timestamp = new Date(now).toISOString();
    const stored: StoredSleepSession = {
      id: crypto.randomUUID(),
      babyId,
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    sleeps.set(stored.id, stored);
    return toSession(stored, now);
  }

  update(babyId: string, sessionId: string, body: unknown): SleepSession {
    const current = this.requireSleep(babyId, sessionId);
    const input = applyUpdate(current, parseUpdateBody(body));
    const now = Date.now();
    assertValidSleep(input, now);
    assertNoConflicts(
      input,
      [...this.requireBabySleeps(babyId).values()].filter((sleep) => sleep.id !== sessionId),
    );
    return toSession(this.replace(current, input, now), now);
  }

  remove(babyId: string, sessionId: string): void {
    this.requireSleep(babyId, sessionId);
    this.requireBabySleeps(babyId).delete(sessionId);
  }

  private replace(current: StoredSleepSession, input: SleepSessionInput, now: number): StoredSleepSession {
    const { notes, ...content } = input;
    const updated: StoredSleepSession = {
      id: current.id,
      babyId: current.babyId,
      ...content,
      ...(notes === undefined ? {} : { notes }),
      createdAt: current.createdAt,
      updatedAt: new Date(now).toISOString(),
    };
    this.requireBabySleeps(current.babyId).set(updated.id, updated);
    return updated;
  }

  private requireBabySleeps(babyId: string): BabySleeps {
    const sleeps = this.sleepsByBaby.get(babyId);
    if (sleeps === undefined) {
      throw notFound('BABY_NOT_FOUND', `Baby "${babyId}" does not exist.`);
    }
    return sleeps;
  }

  private requireSleep(babyId: string, sessionId: string): StoredSleepSession {
    const sleep = this.requireBabySleeps(babyId).get(sessionId);
    if (sleep === undefined) {
      throw notFound('SLEEP_NOT_FOUND', `Sleep session "${sessionId}" does not exist.`);
    }
    return sleep;
  }
}
