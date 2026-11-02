import {
  BreastfeedingDayStats,
  BreastfeedingSession,
  BreastfeedingStats,
  BreastfeedingStatsRequest,
  BreastfeedingStatsTotals,
  HISTORY_CHART_IDS,
  HistoryChartId,
} from '@app/features/breastfeeding/breastfeeding.models';
import { badRequest } from '@app/core/mocks/mock-backend.errors';

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_RANGE_DAYS = 366;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface LocalMoment {
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

/** Validates the query string of the stats endpoint. */
export function parseStatsRequest(params: {
  from: string | null;
  to: string | null;
  timeZone: string | null;
}): BreastfeedingStatsRequest {
  const from = parseDateKey(params.from, 'from');
  const to = parseDateKey(params.to, 'to');
  if (to < from) {
    throw badRequest('INVALID_RANGE', '"to" must not be earlier than "from".');
  }
  if ((to - from) / 86_400_000 + 1 > MAX_RANGE_DAYS) {
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

function createLocalMomentReader(timeZone: string): (epochMilliseconds: number) => LocalMoment {
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

function listDateKeys(from: string, to: string): string[] {
  const keys: string[] = [];
  const end = Date.parse(to);
  for (let cursor = Date.parse(from); cursor <= end; cursor += 86_400_000) {
    keys.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return keys;
}

function average(values: number[]): number | null {
  return values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function sumBy(sessions: BreastfeedingSession[], pick: (session: BreastfeedingSession) => number): number {
  return sessions.reduce((sum, session) => sum + pick(session), 0);
}

/** Aggregates the finished feeds by local day. Intervals are measured against the previous feed, even from the day before. */
export function calculateStats(
  allSessions: BreastfeedingSession[],
  request: BreastfeedingStatsRequest,
): BreastfeedingStats {
  const readMoment = createLocalMomentReader(request.timeZone);
  const finished = allSessions
    .filter((session) => session.status === 'finished')
    .map((session) => ({ session, start: Date.parse(session.startTime), moment: readMoment(Date.parse(session.startTime)) }))
    .sort((a, b) => a.start - b.start);

  const intervalsByDay = new Map<string, number[]>();
  finished.forEach((entry, index) => {
    if (index > 0) {
      const gaps = intervalsByDay.get(entry.moment.date) ?? [];
      gaps.push((entry.start - finished[index - 1].start) / 1_000);
      intervalsByDay.set(entry.moment.date, gaps);
    }
  });

  const inRange = finished.filter(({ moment }) => moment.date >= request.from && moment.date <= request.to);
  const days: BreastfeedingDayStats[] = listDateKeys(request.from, request.to).map((date) => {
    const sessions = inRange.filter(({ moment }) => moment.date === date).map(({ session }) => session);
    return {
      date,
      feeds: sessions.length,
      totalSeconds: sumBy(sessions, (session) => session.totalDurationSeconds),
      leftSeconds: sumBy(sessions, (session) => session.leftBreastDurationSeconds),
      rightSeconds: sumBy(sessions, (session) => session.rightBreastDurationSeconds),
      averageDurationSeconds: average(sessions.map((session) => session.totalDurationSeconds)),
      averageIntervalSeconds: average(intervalsByDay.get(date) ?? []),
    };
  });

  const hourMap = WEEKDAYS.map(() => new Array<number>(24).fill(0));
  for (const { moment } of inRange) {
    hourMap[moment.weekday][moment.hour] += 1;
  }

  const rangeSessions = inRange.map(({ session }) => session);
  const rangeIntervals = days.flatMap(({ date }) => intervalsByDay.get(date) ?? []);
  const totals: BreastfeedingStatsTotals = {
    feeds: rangeSessions.length,
    totalSeconds: sumBy(rangeSessions, (session) => session.totalDurationSeconds),
    leftSeconds: sumBy(rangeSessions, (session) => session.leftBreastDurationSeconds),
    rightSeconds: sumBy(rangeSessions, (session) => session.rightBreastDurationSeconds),
    averageDurationSeconds: average(rangeSessions.map((session) => session.totalDurationSeconds)),
    averageIntervalSeconds: average(rangeIntervals),
  };

  return { ...request, days, totals, hourMap };
}

function isChartId(value: unknown): value is HistoryChartId {
  return HISTORY_CHART_IDS.some((id) => id === value);
}

/** Validates the body of the preferences update and removes duplicated charts. */
export function parseHistoryPreferencesBody(body: unknown): { hiddenCharts: HistoryChartId[] } {
  const hidden = typeof body === 'object' && body !== null ? (body as Record<string, unknown>)['hiddenCharts'] : null;
  if (!Array.isArray(hidden) || !hidden.every(isChartId)) {
    throw badRequest(
      'INVALID_PREFERENCES',
      `"hiddenCharts" must be an array with any of: ${HISTORY_CHART_IDS.join(', ')}.`,
    );
  }
  return { hiddenCharts: [...new Set(hidden)] };
}
