// vitamin-d.models.ts

import { HourMap, Page, PageRequest, StatsRequest } from '@app/features/shared/tracker.models';

export const VITAMIN_D_NOTES_MAX_LENGTH = 500;

/** Allowed number of drops of a dose (inclusive) */
export const VITAMIN_D_DROPS_MIN = 1;
export const VITAMIN_D_DROPS_MAX = 10;

/** Drops offered as quick choices in the creation modal */
export const VITAMIN_D_QUICK_DROPS: readonly number[] = [1, 2, 3, 4];

/** Vitamin D dose: a single instant, optionally with the number of drops. What the backend returns */
export interface VitaminDDose {
  id: string;
  babyId: string;

  givenAt: string; // ISO 8601 (UTC); never in the future
  /** Whole drops, `VITAMIN_D_DROPS_MIN`..`VITAMIN_D_DROPS_MAX`; absent when not recorded */
  drops?: number;

  /** Up to `VITAMIN_D_NOTES_MAX_LENGTH` characters; absent when there are none */
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export type VitaminDDosesPageRequest = PageRequest;

export type VitaminDDosesPage = Page<VitaminDDose>;

/** Create a dose (sent from the front). A missing or null `drops` means "not recorded". */
export interface CreateVitaminDDoseDto {
  babyId: string;
  givenAt: string;
  drops?: number | null;
  notes?: string;
}

/** Update a dose. Omitted fields keep their value; `drops: null` clears the drops. */
export type UpdateVitaminDDoseDto = Partial<Omit<CreateVitaminDDoseDto, 'babyId'>>;

/** Charts of the history page, in display order */
export const VITAMIN_D_HISTORY_CHART_IDS = ['calendar', 'dosesPerDay', 'dropsPerDay', 'hourMap'] as const;

export type VitaminDHistoryChartId = (typeof VITAMIN_D_HISTORY_CHART_IDS)[number];

/** History page preferences stored per baby in the backend */
export interface VitaminDHistoryPreferences {
  hiddenCharts: VitaminDHistoryChartId[];
}

/** Clock hours (of the day) selectable for the "dose not given yet" alert: 12:00 ... 22:00 */
export const VITAMIN_D_MISSED_ALERT_THRESHOLDS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] as const;

export type VitaminDMissedAlertThreshold = (typeof VITAMIN_D_MISSED_ALERT_THRESHOLDS)[number];

/**
 * "Dose not given today" alert settings stored per baby in the backend.
 * `thresholdHours` is the CLOCK HOUR of the day (18 = 18:00) from which the alert shows.
 */
export interface VitaminDMissedAlertSettings {
  enabled: boolean;
  thresholdHours: VitaminDMissedAlertThreshold;
}

export const DEFAULT_VITAMIN_D_MISSED_ALERT_SETTINGS: VitaminDMissedAlertSettings = {
  enabled: true,
  thresholdHours: 18,
};

export type VitaminDStatsRequest = StatsRequest;

/**
 * Status of a local day:
 * - `given`: at least one dose
 * - `pending`: today (or later) without doses yet
 * - `notStarted`: before the local day of the first dose ever recorded
 * - `missed`: any other day without doses
 */
export type VitaminDDayStatus = 'given' | 'missed' | 'pending' | 'notStarted';

/** Doses of one local day */
export interface VitaminDDayStats {
  /** Local day, `yyyy-MM-dd` */
  date: string;
  doses: number;
  /** Sum of the drops recorded that day; null when none of its doses has drops */
  drops: number | null;
  status: VitaminDDayStatus;
}

export interface VitaminDStatsTotals {
  doses: number;
  /** Sum of the drops recorded in the range; null when none */
  drops: number | null;
  daysGiven: number;
  daysMissed: number;
  /** `daysGiven + daysMissed`: pending and notStarted days are excluded */
  daysInRange: number;
  /** Rounded `daysGiven / daysInRange * 100`; null when `daysInRange` is 0 */
  adherencePercent: number | null;
  /** Whole history: consecutive given days ending today (or yesterday while today is still pending) */
  currentStreakDays: number;
  /** Longest run of consecutive given days within the requested range */
  longestStreakDays: number;
  /** Whole history: instant of the latest dose; null when there is none */
  lastGivenAt: string | null;
}

/** Doses aggregated by the backend; one entry in `days` per local day of the range (zeros included) */
export interface VitaminDStats extends VitaminDStatsRequest {
  days: VitaminDDayStats[];
  totals: VitaminDStatsTotals;
  /** Doses per weekday (0 = Monday ... 6 = Sunday) and hour of the day (0-23) */
  hourMap: HourMap;
}
