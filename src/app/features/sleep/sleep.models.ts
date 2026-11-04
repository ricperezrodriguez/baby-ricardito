// sleep.models.ts

import { HourMap, Page, PageRequest, StatsRequest } from '@app/features/shared/tracker.models';

/** Sleep status, derived from `endTime` (`in_progress` while the baby is still asleep) */
export type SleepStatus = 'in_progress' | 'finished';

export const SLEEP_NOTES_MAX_LENGTH = 500;

/** Sleep session (nap or night): what the backend returns. Nap vs night is not stored, see `sleep.span.ts`. */
export interface SleepSession {
  id: string;
  babyId: string;

  startTime: string; // ISO 8601 (UTC); never in the future
  /** null while the baby is still asleep; never in the future */
  endTime: string | null;
  /** `in_progress` when `endTime` is null */
  status: SleepStatus;
  /** Calculated by the backend; for an ongoing sleep it is measured up to the moment of the request */
  durationSeconds: number;

  /** Up to `SLEEP_NOTES_MAX_LENGTH` characters; absent when there are none */
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export type SleepSessionsPageRequest = PageRequest;

export type SleepSessionsPage = Page<SleepSession>;

/**
 * Create a session (sent from the front). Without `endTime` the sleep starts as ongoing
 * (409 SLEEP_IN_PROGRESS when another one is ongoing). Manual/retroactive entries are allowed;
 * overlapping another sleep is rejected (409 SLEEP_OVERLAP).
 */
export interface CreateSleepSessionDto {
  babyId: string;
  startTime: string;
  endTime?: string | null;
  notes?: string;
}

/** Update a session. Waking up the baby is a PATCH with `endTime`; there is no finish endpoint. */
export type UpdateSleepSessionDto = Partial<Omit<CreateSleepSessionDto, 'babyId'>>;

/** Charts of the history page, in display order (`averageDuration` has two lines: naps and night) */
export const SLEEP_HISTORY_CHART_IDS = [
  'sleepsPerDay',
  'hoursPerDay',
  'averageDuration',
  'averageAwake',
  'hourMap',
] as const;

export type SleepHistoryChartId = (typeof SLEEP_HISTORY_CHART_IDS)[number];

/** History page preferences stored per baby in the backend */
export interface SleepHistoryPreferences {
  hiddenCharts: SleepHistoryChartId[];
}

/** Allowed thresholds of the awake alert (time awake since the last sleep), in hours */
export const SLEEP_AWAKE_ALERT_THRESHOLDS = [2, 3, 4, 5] as const;

export type SleepAwakeAlertThreshold = (typeof SLEEP_AWAKE_ALERT_THRESHOLDS)[number];

/** Awake alert settings stored per baby in the backend */
export interface SleepAwakeAlertSettings {
  enabled: boolean;
  thresholdHours: SleepAwakeAlertThreshold;
}

export const DEFAULT_SLEEP_AWAKE_ALERT_SETTINGS: SleepAwakeAlertSettings = {
  enabled: true,
  thresholdHours: 3,
};

/** Allowed thresholds of the long nap alert (an ongoing daytime sleep), in hours */
export const SLEEP_LONG_NAP_ALERT_THRESHOLDS = [3, 4, 5, 6] as const;

export type SleepLongNapAlertThreshold = (typeof SLEEP_LONG_NAP_ALERT_THRESHOLDS)[number];

/** Long nap alert settings stored per baby in the backend; it only applies to ongoing sleeps that started by day */
export interface SleepLongNapAlertSettings {
  enabled: boolean;
  thresholdHours: SleepLongNapAlertThreshold;
}

export const DEFAULT_SLEEP_LONG_NAP_ALERT_SETTINGS: SleepLongNapAlertSettings = {
  enabled: true,
  thresholdHours: 4,
};

export type SleepStatsRequest = StatsRequest;

/** Sleeps that started on one local day (see `SleepStats` for how time is assigned to days) */
export interface SleepDayStats {
  /** Local day, `yyyy-MM-dd` */
  date: string;
  /** Finished sleeps that started this day */
  sleeps: number;
  /** Seconds asleep during this local day (a sleep crossing midnight is split between both days) */
  totalSeconds: number;
  /** Longest sleep that started this day; 0 without sleeps */
  longestSleepSeconds: number;
  averageDurationSeconds: number | null;
  /** Average awake time before the sleeps that started this day; null without a previous sleep */
  averageAwakeSeconds: number | null;
  /** Average duration of the naps (start 07:00-18:59); null without naps */
  napAverageDurationSeconds: number | null;
  /** Average duration of the night sleeps (start 19:00-06:59); null without night sleeps */
  nightAverageDurationSeconds: number | null;
}

export interface SleepStatsTotals {
  sleeps: number;
  totalSeconds: number;
  /** Seconds asleep divided by ALL the days of the range (zeros included); null without sleeps */
  averageDailySeconds: number | null;
  longestSleepSeconds: number;
  averageDurationSeconds: number | null;
  averageAwakeSeconds: number | null;
  napAverageDurationSeconds: number | null;
  nightAverageDurationSeconds: number | null;
}

/**
 * Finished sleeps aggregated by the backend; one entry in `days` per local day of the range (zeros included).
 * Time asleep (`totalSeconds`, `hourMap`) is split per local day; `sleeps` and `longestSleepSeconds`
 * belong to the day the sleep started; the awake time (previous wake-up to this start) to the day of the later sleep.
 */
export interface SleepStats extends SleepStatsRequest {
  days: SleepDayStats[];
  totals: SleepStatsTotals;
  /** MINUTES asleep per weekday (0 = Monday ... 6 = Sunday) and hour of the day (0-23) */
  hourMap: HourMap;
}
