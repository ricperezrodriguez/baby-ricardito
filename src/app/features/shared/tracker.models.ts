// tracker.models.ts: types shared by the data layer of every tracker feature

/** Name of the multipart field that carries the photo file */
export const PHOTO_UPLOAD_FIELD = 'photo';

/** Photo limits shared by the forms and the mock backend */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export interface PageRequest {
  limit: number;
  offset: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface StatsRequest {
  /** First local day, `yyyy-MM-dd` (inclusive) */
  from: string;
  /** Last local day, `yyyy-MM-dd` (inclusive) */
  to: string;
  /** IANA time zone used to split the records in days and hours */
  timeZone: string;
}

/** Records per weekday (0 = Monday ... 6 = Sunday) and hour of the day (0-23) */
export type HourMap = number[][];
