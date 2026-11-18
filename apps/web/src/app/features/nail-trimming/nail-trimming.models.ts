// nail-trimming.models.ts

import { Page, PageRequest, StatsRequest } from '@app/features/shared/tracker.models';

export const NAIL_TRIM_NOTES_MAX_LENGTH = 500;

/** Zones whose nails can be trimmed, in display order */
export const NAIL_AREAS = ['hands', 'feet'] as const;

export type NailTrimArea = (typeof NAIL_AREAS)[number];

/** Nail trim: a single instant and the zones trimmed. What the backend returns */
export interface NailTrim {
  id: string;
  babyId: string;

  trimmedAt: string; // ISO 8601 (UTC); never in the future
  /** Non-empty, no duplicates, in `NAIL_AREAS` order */
  areas: NailTrimArea[];

  /** Up to `NAIL_TRIM_NOTES_MAX_LENGTH` characters; absent when there are none */
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export type NailTrimsPageRequest = PageRequest;

export type NailTrimsPage = Page<NailTrim>;

/** Create a trim (sent from the front) */
export interface CreateNailTrimDto {
  babyId: string;
  trimmedAt: string;
  areas: NailTrimArea[];
  notes?: string;
}

/** Update a trim. Omitted fields keep their value; `areas` replaces the whole list; empty or null `notes` clears them. */
export type UpdateNailTrimDto = Partial<Omit<CreateNailTrimDto, 'babyId' | 'notes'>> & {
  notes?: string | null;
};

/** Charts of the history page, in display order */
export const NAIL_TRIMMING_HISTORY_CHART_IDS = ['calendar', 'intervals', 'areaSplit'] as const;

export type NailTrimmingHistoryChartId = (typeof NAIL_TRIMMING_HISTORY_CHART_IDS)[number];

/** History page preferences stored per baby in the backend */
export interface NailTrimmingHistoryPreferences {
  hiddenCharts: NailTrimmingHistoryChartId[];
}

/** Days without trimming after which the "overdue" alert can show */
export const NAIL_TRIM_OVERDUE_ALERT_THRESHOLDS = [5, 7, 10, 14] as const;

export type NailTrimOverdueAlertThreshold = (typeof NAIL_TRIM_OVERDUE_ALERT_THRESHOLDS)[number];

/** "Nails overdue" alert settings stored per baby in the backend. */
export interface NailTrimOverdueAlertSettings {
  enabled: boolean;
  thresholdDays: NailTrimOverdueAlertThreshold;
}

export const DEFAULT_NAIL_TRIM_OVERDUE_ALERT_SETTINGS: NailTrimOverdueAlertSettings = {
  enabled: true,
  thresholdDays: 7,
};

export type NailTrimmingStatsRequest = StatsRequest;

/** Trims of one local day; a hands+feet trim counts in both `hands` and `feet` */
export interface NailTrimDayStats {
  /** Local day, `yyyy-MM-dd` */
  date: string;
  trims: number;
  hands: number;
  feet: number;
}

/**
 * Whole local days between two consecutive trims of the same zone, assigned to the local day of
 * the most recent one. A hands+feet trim takes part in the intervals of both zones.
 */
export interface NailTrimInterval {
  /** Local day of the most recent trim, `yyyy-MM-dd` */
  date: string;
  area: NailTrimArea;
  days: number;
}

export interface NailTrimmingStatsTotals {
  trims: number;
  /** `handsOnly + feetOnly + both === trims` */
  handsOnly: number;
  feetOnly: number;
  both: number;
  /** Average of the hands intervals of the range, one decimal; null without intervals */
  averageHandsIntervalDays: number | null;
  averageFeetIntervalDays: number | null;
  /** Longest interval of the range, either zone; null without intervals */
  longestIntervalDays: number | null;
  /** Whole history (not the range): instant of the latest trim that included the zone; null when none */
  lastHandsAt: string | null;
  lastFeetAt: string | null;
}

/** Trims aggregated by the backend; one entry in `days` per local day of the range (zeros included) */
export interface NailTrimmingStats extends NailTrimmingStatsRequest {
  days: NailTrimDayStats[];
  intervals: NailTrimInterval[];
  totals: NailTrimmingStatsTotals;
}
