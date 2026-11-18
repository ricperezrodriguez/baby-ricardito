// breastfeeding.models.ts

export const BREAST_SIDE = {
  LEFT: 'left',
  RIGHT: 'right',
} as const;

/** Name of the multipart field that carries the photo file */
export const BREASTFEEDING_PHOTO_FIELD = 'photo';

/** Photo limits shared by the form and the mock backend (defined in the shared tracker models) */
export { PHOTO_MAX_BYTES } from '@app/features/shared/tracker.models';

/** Breast used */
export type Breast = (typeof BREAST_SIDE)[keyof typeof BREAST_SIDE];

/** Session status (useful when a timer is running) */
export type SessionStatus = 'in_progress' | 'paused' | 'finished';

/** Segment of breastfeeding on a specific breast within a session */
export interface BreastSegment {
  breast: Breast;
  startTime: string; // ISO 8601 (UTC)
  endTime: string | null; // null if the segment is still in progress
}

/** Breastfeeding session: what the backend returns */
export interface BreastfeedingSession {
  id: string;
  babyId: string;

  startTime: string; // ISO 8601 (UTC)
  endTime: string | null;
  status: SessionStatus;

  segments: BreastSegment[];

  // Totals calculated by the backend
  totalDurationSeconds: number;
  leftBreastDurationSeconds: number;
  rightBreastDurationSeconds: number;
  firstBreast: Breast | null; // useful to suggest which breast to start with next time

  notes?: string;
  /** URL of the photo of the feed; absent or null when it has none */
  photoUrl?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface BreastfeedingSessionsPageRequest {
  limit: number;
  offset: number;
}

export interface BreastfeedingSessionsPage {
  items: BreastfeedingSession[];
  total: number;
  limit: number;
  offset: number;
}

/** Create a session (sent from the front) */
export interface CreateBreastfeedingSessionDto {
  babyId: string;
  startTime: string;
  endTime?: string | null;
  segments?: Pick<BreastSegment, 'breast' | 'startTime' | 'endTime'>[];
  notes?: string;
}

/** Update a session (change segments, notes, close the session...) */
export type UpdateBreastfeedingSessionDto = Partial<Omit<CreateBreastfeedingSessionDto, 'babyId'>>;

/** Charts of the history page, in display order */
export const HISTORY_CHART_IDS = [
  'feedsPerDay',
  'minutesPerDay',
  'breastSplit',
  'averageDuration',
  'averageInterval',
  'hourMap',
] as const;

export type HistoryChartId = (typeof HISTORY_CHART_IDS)[number];

/** History page preferences stored per baby in the backend */
export interface BreastfeedingHistoryPreferences {
  hiddenCharts: HistoryChartId[];
}

export interface BreastfeedingStatsRequest {
  /** First local day, `yyyy-MM-dd` (inclusive) */
  from: string;
  /** Last local day, `yyyy-MM-dd` (inclusive) */
  to: string;
  /** IANA time zone used to split the feeds in days and hours */
  timeZone: string;
}

export interface BreastfeedingDayStats {
  /** Local day, `yyyy-MM-dd` */
  date: string;
  feeds: number;
  totalSeconds: number;
  leftSeconds: number;
  rightSeconds: number;
  averageDurationSeconds: number | null;
  /** Average time between the start of a feed and the start of the previous one; null without a previous feed */
  averageIntervalSeconds: number | null;
}

export interface BreastfeedingStatsTotals {
  feeds: number;
  totalSeconds: number;
  leftSeconds: number;
  rightSeconds: number;
  averageDurationSeconds: number | null;
  averageIntervalSeconds: number | null;
}

/** Finished feeds aggregated by the backend; one entry in `days` per local day of the range */
export interface BreastfeedingStats extends BreastfeedingStatsRequest {
  days: BreastfeedingDayStats[];
  totals: BreastfeedingStatsTotals;
  /** Feeds started per weekday (0 = Monday ... 6 = Sunday) and hour of the day (0-23) */
  hourMap: number[][];
}
