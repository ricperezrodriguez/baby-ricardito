import type {
  BreastfeedingDayStats,
  BreastfeedingStats,
  BreastfeedingStatsTotals,
  StatsQuery,
} from '@baby-ricardito/contracts';
import { average, createEmptyHourMap, createLocalMomentReader, listDateKeys } from '../../common/time';
import { calculateSessionMetrics } from './breastfeeding.metrics';
import type { SessionTimes } from './breastfeeding.metrics';

const MS_PER_SECOND = 1_000;

interface FinishedFeed {
  start: number;
  moment: ReturnType<ReturnType<typeof createLocalMomentReader>>;
  total: number;
  left: number;
  right: number;
}

function sumBy(feeds: FinishedFeed[], pick: (feed: FinishedFeed) => number): number {
  return feeds.reduce((sum, feed) => sum + pick(feed), 0);
}

/**
 * Aggregates the finished feeds by local day. Intervals are measured start to start against the previous
 * feed, even from the day before, and belong to the day of the later feed.
 */
export function calculateBreastfeedingStats(finishedSessions: SessionTimes[], request: StatsQuery): BreastfeedingStats {
  const readMoment = createLocalMomentReader(request.tz);
  const finished: FinishedFeed[] = finishedSessions
    .map((session) => {
      const metrics = calculateSessionMetrics(session, Date.now());
      const start = session.startTime.getTime();
      return {
        start,
        moment: readMoment(start),
        total: metrics.totalDurationSeconds,
        left: metrics.leftBreastDurationSeconds,
        right: metrics.rightBreastDurationSeconds,
      };
    })
    .sort((a, b) => a.start - b.start);

  const intervalsByDay = new Map<string, number[]>();
  finished.forEach((entry, index) => {
    if (index > 0) {
      const gaps = intervalsByDay.get(entry.moment.date) ?? [];
      gaps.push((entry.start - finished[index - 1]!.start) / MS_PER_SECOND);
      intervalsByDay.set(entry.moment.date, gaps);
    }
  });

  const inRange = finished.filter(({ moment }) => moment.date >= request.from && moment.date <= request.to);
  const days: BreastfeedingDayStats[] = listDateKeys(request.from, request.to).map((date) => {
    const feeds = inRange.filter(({ moment }) => moment.date === date);
    return {
      date,
      feeds: feeds.length,
      totalSeconds: sumBy(feeds, (feed) => feed.total),
      leftSeconds: sumBy(feeds, (feed) => feed.left),
      rightSeconds: sumBy(feeds, (feed) => feed.right),
      averageDurationSeconds: average(feeds.map((feed) => feed.total)),
      averageIntervalSeconds: average(intervalsByDay.get(date) ?? []),
    };
  });

  const hourMap = createEmptyHourMap();
  for (const { moment } of inRange) {
    hourMap[moment.weekday]![moment.hour]! += 1;
  }

  const totals: BreastfeedingStatsTotals = {
    feeds: inRange.length,
    totalSeconds: sumBy(inRange, (feed) => feed.total),
    leftSeconds: sumBy(inRange, (feed) => feed.left),
    rightSeconds: sumBy(inRange, (feed) => feed.right),
    averageDurationSeconds: average(inRange.map((feed) => feed.total)),
    averageIntervalSeconds: average(days.flatMap(({ date }) => intervalsByDay.get(date) ?? [])),
  };

  return { from: request.from, to: request.to, timeZone: request.tz, days, totals, hourMap };
}
