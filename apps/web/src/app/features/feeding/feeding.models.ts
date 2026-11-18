// feeding.models.ts: shared domain of "feeding" (breastfeeding + bottle)

/** Allowed thresholds of the "time since the last feed" alert, in hours */
export const FEEDING_OVERDUE_ALERT_THRESHOLDS = [1, 1.5, 2, 2.5, 3, 3.5, 4] as const;

export type FeedingOverdueAlertThreshold = (typeof FEEDING_OVERDUE_ALERT_THRESHOLDS)[number];

/** Overdue-feed alert settings stored per baby in the backend */
export interface FeedingOverdueAlertSettings {
  enabled: boolean;
  thresholdHours: FeedingOverdueAlertThreshold;
}

export const DEFAULT_FEEDING_OVERDUE_ALERT_SETTINGS: FeedingOverdueAlertSettings = {
  enabled: true,
  thresholdHours: 3,
};

/** Trackers that count as a feed */
export type FeedingSource = 'breastfeeding' | 'bottle';

/** The most recent feed has ended (a bottle feed is an instant, so it ends when it happens) */
export interface FinishedFeeding {
  status: 'finished';
  /** ISO 8601 (UTC): end of the breastfeeding session or `fedAt` of the bottle feed */
  endedAt: string;
  source: FeedingSource;
  /** `<source>:<recordId>`; stable id of the record, to key alert dismissals */
  fingerprint: string;
}

/** A breastfeeding session is still open: the baby is being fed right now */
export interface FeedingInProgress {
  status: 'in_progress';
}

/** Most recent feed across breastfeeding and bottle; `null` (not this type) when there is none yet */
export type LastFeeding = FinishedFeeding | FeedingInProgress;
