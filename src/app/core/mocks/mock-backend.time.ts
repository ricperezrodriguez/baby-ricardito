import { HourMap, StatsRequest } from '@app/features/shared/tracker.models';
import { badRequest } from '@app/core/mocks/mock-backend.errors';

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_RANGE_DAYS = 366;
const MS_PER_DAY = 86_400_000;

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface LocalMoment {
  date: string;
  weekday: number;
  hour: number;
}

function parseDateKey(value: string | null, field: string): number {
  const match = value === null ? null : DATE_KEY_PATTERN.exec(value);
  if (match === null) {
    throw badRequest('INVALID_DATE_FORMAT', `"${field}" must be a date formatted as yyyy-MM-dd.`);
  }
  const [, year, month, day] = match.map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  if (new Date(timestamp).toISOString().slice(0, 10) !== value) {
    throw badRequest('INVALID_DATE_FORMAT', `"${field}" is not a valid date.`);
  }
  return timestamp;
}

/** Validates the query string of a stats endpoint. */
export function parseStatsRequest(params: {
  from: string | null;
  to: string | null;
  timeZone: string | null;
}): StatsRequest {
  const from = parseDateKey(params.from, 'from');
  const to = parseDateKey(params.to, 'to');
  if (to < from) {
    throw badRequest('INVALID_RANGE', '"to" must not be earlier than "from".');
  }
  if ((to - from) / MS_PER_DAY + 1 > MAX_RANGE_DAYS) {
    throw badRequest('INVALID_RANGE', `The range must not exceed ${MAX_RANGE_DAYS} days.`);
  }
  const timeZone = params.timeZone ?? 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    throw badRequest('INVALID_TIME_ZONE', '"tz" must be a valid IANA time zone.');
  }
  return { from: params.from as string, to: params.to as string, timeZone };
}

export function createLocalMomentReader(timeZone: string): (epochMilliseconds: number) => LocalMoment {
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
    const parts = Object.fromEntries(format.formatToParts(epochMilliseconds).map((part) => [part.type, part.value]));
    return {
      date: `${parts['year']}-${parts['month']}-${parts['day']}`,
      weekday: WEEKDAYS.indexOf(parts['weekday']),
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
  return values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
