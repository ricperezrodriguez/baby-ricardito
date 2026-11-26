import type {
  BathDayStats,
  BathInterval,
  BathStats,
  BathStatsTotals,
  StatsQuery,
} from '@baby-ricardito/contracts';
import { averageDays, createLocalMomentReader, listDateKeys, listDayIntervals } from '../../common/time';

export interface BathStatsRow {
  bathedAt: Date;
  hairWashed: boolean;
}

interface LocalBath {
  bath: BathStatsRow;
  at: number;
  date: string;
}

function buildTotals(days: BathDayStats[], intervals: BathInterval[], allBaths: LocalBath[]): BathStatsTotals {
  const intervalDays = intervals.map(({ days: value }) => value);
  return {
    baths: days.reduce((sum, day) => sum + day.baths, 0),
    daysWithBath: days.filter((day) => day.baths > 0).length,
    daysInRange: days.length,
    hairWashes: days.reduce((sum, day) => sum + day.hairWashes, 0),
    averageIntervalDays: averageDays(intervalDays),
    longestIntervalDays: intervalDays.length === 0 ? null : Math.max(...intervalDays),
    lastBathAt: allBaths.at(-1)?.bath.bathedAt.toISOString() ?? null,
    lastHairWashAt: allBaths.filter(({ bath }) => bath.hairWashed).at(-1)?.bath.bathedAt.toISOString() ?? null,
  };
}

/**
 * Aggregates the baths by local day (in the request time zone). Intervals are measured against the
 * previous bath, even when it falls before the range; the latest bath and hair wash use the whole
 * history, the rest only the requested range.
 */
export function calculateBathStats(allBaths: BathStatsRow[], request: StatsQuery): BathStats {
  const readMoment = createLocalMomentReader(request.tz);
  const local: LocalBath[] = allBaths
    .map((bath) => {
      const at = bath.bathedAt.getTime();
      return { bath, at, date: readMoment(at).date };
    })
    .sort((a, b) => a.at - b.at);

  const inRange = local.filter(({ date }) => date >= request.from && date <= request.to);
  const days: BathDayStats[] = listDateKeys(request.from, request.to).map((date) => {
    const baths = inRange.filter((entry) => entry.date === date);
    return {
      date,
      baths: baths.length,
      hairWashes: baths.filter(({ bath }) => bath.hairWashed).length,
    };
  });

  const intervals: BathInterval[] = listDayIntervals(local).filter(
    ({ date }) => date >= request.from && date <= request.to,
  );

  return {
    from: request.from,
    to: request.to,
    timeZone: request.tz,
    days,
    intervals,
    totals: buildTotals(days, intervals, local),
  };
}
