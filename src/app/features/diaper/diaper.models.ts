// diaper.models.ts

import { HourMap, Page, PageRequest, StatsRequest } from '@app/features/shared/tracker.models';

export const DIAPER_TYPE = {
  WET: 'wet',
  DIRTY: 'dirty',
  BOTH: 'both',
} as const;

/** Content of the diaper (exclusive): only pee, only poop, or both */
export type DiaperType = (typeof DIAPER_TYPE)[keyof typeof DIAPER_TYPE];

export const DIAPER_TYPES: readonly DiaperType[] = [DIAPER_TYPE.WET, DIAPER_TYPE.DIRTY, DIAPER_TYPE.BOTH];

/** Types that include poop (used to find the last poop) */
export const STOOL_DIAPER_TYPES: readonly DiaperType[] = [DIAPER_TYPE.DIRTY, DIAPER_TYPE.BOTH];

export const STOOL_COLORS = ['yellow', 'green', 'brown', 'black', 'red', 'white'] as const;

export type StoolColor = (typeof STOOL_COLORS)[number];

/** `mucous` means "con moco" */
export const STOOL_CONSISTENCIES = ['liquid', 'soft', 'mucous', 'firm'] as const;

export type StoolConsistency = (typeof STOOL_CONSISTENCIES)[number];

export const DIAPER_NOTES_MAX_LENGTH = 500;

/** Diaper change: what the backend returns */
export interface DiaperChange {
  id: string;
  babyId: string;

  changedAt: string; // ISO 8601 (UTC); never in the future
  type: DiaperType;

  /** Only for `dirty` and `both`; always null for `wet` */
  stoolColor: StoolColor | null;
  /** Only for `dirty` and `both`; always null for `wet` */
  stoolConsistency: StoolConsistency | null;
  hasRash: boolean;

  /** Up to `DIAPER_NOTES_MAX_LENGTH` characters; absent when there are none */
  notes?: string;
  /** URL of the photo of the diaper; absent or null when it has none */
  photoUrl?: string | null;

  createdAt: string;
  updatedAt: string;
}

export type DiaperChangesPageRequest = PageRequest & {
  /** Only changes of these types; every type when omitted or empty */
  types?: readonly DiaperType[];
};

export type DiaperChangesPage = Page<DiaperChange>;

/**
 * Create a change (sent from the front).
 * Stool fields with `type: 'wet'` are rejected (422 STOOL_DETAILS_NOT_ALLOWED).
 */
export interface CreateDiaperChangeDto {
  babyId: string;
  changedAt: string;
  type: DiaperType;
  stoolColor?: StoolColor | null;
  stoolConsistency?: StoolConsistency | null;
  hasRash?: boolean;
  notes?: string;
}

/**
 * Update a change. Omitted fields keep their value; when switching to `wet`
 * the client must send `stoolColor: null` and `stoolConsistency: null` explicitly.
 */
export type UpdateDiaperChangeDto = Partial<Omit<CreateDiaperChangeDto, 'babyId'>>;

/** Charts of the history page, in display order */
export const DIAPER_HISTORY_CHART_IDS = [
  'changesPerDay',
  'typeSplit',
  'averageInterval',
  'stoolColors',
  'hourMap',
] as const;

export type DiaperHistoryChartId = (typeof DIAPER_HISTORY_CHART_IDS)[number];

/** History page preferences stored per baby in the backend */
export interface DiaperHistoryPreferences {
  hiddenCharts: DiaperHistoryChartId[];
}

/** Allowed thresholds of the poop alert, in hours */
export const DIAPER_POOP_ALERT_THRESHOLDS = [12, 24, 36, 48, 72] as const;

export type DiaperPoopAlertThreshold = (typeof DIAPER_POOP_ALERT_THRESHOLDS)[number];

/** Poop alert settings stored per baby in the backend */
export interface DiaperPoopAlertSettings {
  enabled: boolean;
  thresholdHours: DiaperPoopAlertThreshold;
}

export const DEFAULT_DIAPER_POOP_ALERT_SETTINGS: DiaperPoopAlertSettings = {
  enabled: true,
  thresholdHours: 48,
};

export type DiaperStatsRequest = StatsRequest;

/** Poop count per color; `unspecified` counts dirty/both changes without color */
export type DiaperStoolColorCounts = Record<StoolColor | 'unspecified', number>;

/** Changes of one local day; `wet + dirty + both === changes` */
export interface DiaperDayStats {
  /** Local day, `yyyy-MM-dd` */
  date: string;
  changes: number;
  wet: number;
  dirty: number;
  both: number;
  rashChanges: number;
  /** Average time between a change and the previous one; null without a previous change */
  averageIntervalSeconds: number | null;
}

export interface DiaperStatsTotals {
  changes: number;
  wet: number;
  dirty: number;
  both: number;
  rashChanges: number;
  /** Changes divided by the days of the range, 1 decimal; null without changes */
  averageChangesPerDay: number | null;
  averageIntervalSeconds: number | null;
  stoolColors: DiaperStoolColorCounts;
}

/** Changes aggregated by the backend; one entry in `days` per local day of the range (zeros included) */
export interface DiaperStats extends DiaperStatsRequest {
  days: DiaperDayStats[];
  totals: DiaperStatsTotals;
  /** Changes per weekday (0 = Monday ... 6 = Sunday) and hour of the day (0-23) */
  hourMap: HourMap;
}
