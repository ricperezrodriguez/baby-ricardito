// bath.models.ts

import { Page, PageRequest, StatsRequest } from '@app/features/shared/tracker.models';

export const BATH_NOTES_MAX_LENGTH = 500;

/** How the baby reacted to the bath */
export const BATH_REACTIONS = ['happy', 'neutral', 'sad'] as const;

export type BathReaction = (typeof BATH_REACTIONS)[number];

/** Bath: a single instant and whether the hair was washed. What the backend returns */
export interface Bath {
  id: string;
  babyId: string;

  bathedAt: string; // ISO 8601 (UTC); never in the future
  hairWashed: boolean;

  /** Absent when it was not recorded */
  reaction?: BathReaction;

  /** Up to `BATH_NOTES_MAX_LENGTH` characters; absent when there are none */
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export type BathsPageRequest = PageRequest;

export type BathsPage = Page<Bath>;

/** Create a bath (sent from the front) */
export interface CreateBathDto {
  babyId: string;
  bathedAt: string;
  hairWashed: boolean;
  reaction?: BathReaction;
  notes?: string;
}

/**
 * Update a bath. Omitted fields keep their value; null `reaction` clears it; empty or null `notes`
 * clears them.
 */
export type UpdateBathDto = Partial<Omit<CreateBathDto, 'babyId' | 'reaction' | 'notes'>> & {
  reaction?: BathReaction | null;
  notes?: string | null;
};

/** Charts of the history page, in display order */
export const BATH_HISTORY_CHART_IDS = ['calendar', 'intervals', 'hairSplit'] as const;

export type BathHistoryChartId = (typeof BATH_HISTORY_CHART_IDS)[number];

/** History page preferences stored per baby in the backend */
export interface BathHistoryPreferences {
  hiddenCharts: BathHistoryChartId[];
}

/** Days without a bath after which the "overdue" alert can show */
export const BATH_OVERDUE_ALERT_THRESHOLDS = [2, 3, 4, 7] as const;

export type BathOverdueAlertThreshold = (typeof BATH_OVERDUE_ALERT_THRESHOLDS)[number];

/** "Bath overdue" alert settings stored per baby in the backend. */
export interface BathOverdueAlertSettings {
  enabled: boolean;
  thresholdDays: BathOverdueAlertThreshold;
}

export const DEFAULT_BATH_OVERDUE_ALERT_SETTINGS: BathOverdueAlertSettings = {
  enabled: true,
  thresholdDays: 3,
};

export type BathStatsRequest = StatsRequest;

/** Baths of one local day */
export interface BathDayStats {
  /** Local day, `yyyy-MM-dd` */
  date: string;
  baths: number;
  /** Baths of the day with the hair washed */
  hairWashes: number;
}

/** Whole local days between two consecutive baths, assigned to the local day of the most recent one. */
export interface BathInterval {
  /** Local day of the most recent bath, `yyyy-MM-dd` */
  date: string;
  days: number;
}

export interface BathStatsTotals {
  baths: number;
  /** Local days of the range with at least one bath */
  daysWithBath: number;
  /** Local days of the range (length of `days`) */
  daysInRange: number;
  /** Baths of the range with the hair washed */
  hairWashes: number;
  /** Average of the intervals of the range, one decimal; null without intervals */
  averageIntervalDays: number | null;
  /** Longest interval of the range; null without intervals */
  longestIntervalDays: number | null;
  /** Whole history (not the range): instant of the latest bath; null when none */
  lastBathAt: string | null;
  /** Whole history (not the range): instant of the latest bath with the hair washed; null when none */
  lastHairWashAt: string | null;
}

/** Baths aggregated by the backend; one entry in `days` per local day of the range (zeros included) */
export interface BathStats extends BathStatsRequest {
  days: BathDayStats[];
  intervals: BathInterval[];
  totals: BathStatsTotals;
}
