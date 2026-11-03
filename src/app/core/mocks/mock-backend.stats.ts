import {
  BreastfeedingDayStats,
  BreastfeedingHistoryPreferences,
  BreastfeedingSession,
  BreastfeedingStats,
  BreastfeedingStatsRequest,
  BreastfeedingStatsTotals,
  HISTORY_CHART_IDS,
} from '@app/features/breastfeeding/breastfeeding.models';
import { parseHiddenChartsBody } from '@app/core/mocks/mock-backend.parsing';
import {
  average,
  createEmptyHourMap,
  createLocalMomentReader,
  listDateKeys,
} from '@app/core/mocks/mock-backend.time';

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

  const hourMap = createEmptyHourMap();
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

/** Validates the body of the preferences update and removes duplicated charts. */
export function parseHistoryPreferencesBody(body: unknown): BreastfeedingHistoryPreferences {
  return parseHiddenChartsBody(body, HISTORY_CHART_IDS);
}
