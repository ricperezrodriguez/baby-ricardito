// bottle.models.ts

import { HourMap, Page, PageRequest, StatsRequest } from '@app/features/shared/tracker.models';

export const BOTTLE_MILK_TYPE = {
  BREAST_MILK: 'breast_milk',
  FORMULA: 'formula',
  MIXED: 'mixed',
} as const;

/** What the bottle contains: expressed breast milk, formula, or a mix of both */
export type BottleMilkType = (typeof BOTTLE_MILK_TYPE)[keyof typeof BOTTLE_MILK_TYPE];

export const BOTTLE_MILK_TYPES: readonly BottleMilkType[] = [
  BOTTLE_MILK_TYPE.BREAST_MILK,
  BOTTLE_MILK_TYPE.FORMULA,
  BOTTLE_MILK_TYPE.MIXED,
];

export const DEFAULT_BOTTLE_MILK_TYPE: BottleMilkType = BOTTLE_MILK_TYPE.BREAST_MILK;

export const BOTTLE_NOTES_MAX_LENGTH = 500;

/** Allowed amount of a bottle feed, in whole millilitres (inclusive) */
export const BOTTLE_AMOUNT_MIN_ML = 1;
export const BOTTLE_AMOUNT_MAX_ML = 500;

/** Amounts offered as quick choices in the creation modal, in millilitres */
export const BOTTLE_QUICK_AMOUNTS_ML: readonly number[] = [60, 90, 120, 150, 180];

/** Bottle feed: a single instant with the amount taken. What the backend returns */
export interface BottleFeed {
  id: string;
  babyId: string;

  fedAt: string; // ISO 8601 (UTC); never in the future
  /** Whole millilitres, `BOTTLE_AMOUNT_MIN_ML`..`BOTTLE_AMOUNT_MAX_ML` */
  amountMl: number;
  milkType: BottleMilkType;

  /** Up to `BOTTLE_NOTES_MAX_LENGTH` characters; absent when there are none */
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export type BottleFeedsPageRequest = PageRequest & {
  /** Only feeds of these milk types; every type when omitted or empty */
  milkTypes?: readonly BottleMilkType[];
};

export type BottleFeedsPage = Page<BottleFeed>;

/** Create a feed (sent from the front) */
export interface CreateBottleFeedDto {
  babyId: string;
  fedAt: string;
  amountMl: number;
  milkType: BottleMilkType;
  notes?: string;
}

/** Update a feed. Omitted fields keep their value. */
export type UpdateBottleFeedDto = Partial<Omit<CreateBottleFeedDto, 'babyId'>>;

/** Charts of the history page, in display order */
export const BOTTLE_HISTORY_CHART_IDS = [
  'feedsPerDay',
  'mlPerDay',
  'averageAmount',
  'averageInterval',
  'hourMap',
] as const;

export type BottleHistoryChartId = (typeof BOTTLE_HISTORY_CHART_IDS)[number];

/** History page preferences stored per baby in the backend */
export interface BottleHistoryPreferences {
  hiddenCharts: BottleHistoryChartId[];
}

export type BottleStatsRequest = StatsRequest;

/** Feeds of one local day */
export interface BottleDayStats {
  /** Local day, `yyyy-MM-dd` */
  date: string;
  feeds: number;
  totalMl: number;
  /** Rounded average amount of the day's feeds; null without feeds */
  averageAmountMl: number | null;
  /** Average time between a feed and the previous one (start to start, even from the day before); null without a previous feed */
  averageIntervalSeconds: number | null;
}

export interface BottleStatsTotals {
  feeds: number;
  totalMl: number;
  breastMilkMl: number;
  formulaMl: number;
  mixedMl: number;
  /** Rounded `totalMl` divided by every day of the range (empty days included); null without feeds */
  averageDailyMl: number | null;
  /** Feeds divided by the days of the range, 1 decimal; null without feeds */
  averageFeedsPerDay: number | null;
  /** Rounded average amount per feed; null without feeds */
  averageAmountMl: number | null;
  averageIntervalSeconds: number | null;
}

/** Feeds aggregated by the backend; one entry in `days` per local day of the range (zeros included) */
export interface BottleStats extends BottleStatsRequest {
  days: BottleDayStats[];
  totals: BottleStatsTotals;
  /** Feeds per weekday (0 = Monday ... 6 = Sunday) and hour of the day (0-23) */
  hourMap: HourMap;
}
