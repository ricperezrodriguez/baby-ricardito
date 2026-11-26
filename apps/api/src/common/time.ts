import type { HourMap } from '@baby-ricardito/contracts';

const MS_PER_DAY = 86_400_000;

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface LocalMoment {
  date: string;
  weekday: number;
  hour: number;
}

/** Reads the local day (`yyyy-MM-dd`), weekday (Monday = 0) and hour of an instant in `timeZone`. */
export function createLocalMomentReader(
  timeZone: string,
): (epochMilliseconds: number) => LocalMoment {
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });
  return (epochMilliseconds) => {
    const parts = Object.fromEntries(
      format.formatToParts(epochMilliseconds).map((part) => [part.type, part.value]),
    );
    return {
      date: `${parts['year']}-${parts['month']}-${parts['day']}`,
      weekday: WEEKDAYS.indexOf(parts['weekday']!),
      hour: Number(parts['hour']),
    };
  };
}

export function listDateKeys(from: string, to: string): string[] {
  const keys: string[] = [];
  const end = Date.parse(to);
  for (let cursor = Date.parse(from); cursor <= end; cursor += MS_PER_DAY) {
    keys.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return keys;
}

/** 7 weekdays (Monday = 0) x 24 hours, all zeros. */
export function createEmptyHourMap(): HourMap {
  return WEEKDAYS.map(() => new Array<number>(24).fill(0));
}

/** Rounded average; null without values. */
export function average(values: number[]): number | null {
  return values.length === 0
    ? null
    : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Average with one decimal; null without values. */
export function averageDays(values: number[]): number | null {
  return values.length === 0
    ? null
    : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

/** Whole calendar days between two local days (`yyyy-MM-dd`); negative when `laterDate` is earlier. */
export function wholeDaysBetween(earlierDate: string, laterDate: string): number {
  return Math.round((Date.parse(laterDate) - Date.parse(earlierDate)) / MS_PER_DAY);
}

/** Whole local days between two consecutive records, assigned to the local day of the later one. */
export interface DayInterval {
  /** Local day of the later record, `yyyy-MM-dd` */
  date: string;
  days: number;
}

/**
 * Intervals of a single series of records sorted ascending by instant. Two records on the same
 * local day make no interval; each one is assigned to the day of the most recent record.
 */
export function listDayIntervals(records: readonly { date: string }[]): DayInterval[] {
  const intervals: DayInterval[] = [];
  for (let index = 1; index < records.length; index += 1) {
    const days = wholeDaysBetween(records[index - 1]!.date, records[index]!.date);
    if (days > 0) {
      intervals.push({ date: records[index]!.date, days });
    }
  }
  return intervals;
}
