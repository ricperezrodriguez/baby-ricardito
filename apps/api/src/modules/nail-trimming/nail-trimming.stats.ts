import { NAIL_AREAS } from '@baby-ricardito/contracts';
import type {
  NailTrimArea,
  NailTrimDayStats,
  NailTrimInterval,
  NailTrimmingStats,
  NailTrimmingStatsTotals,
  StatsQuery,
} from '@baby-ricardito/contracts';
import { averageDays, createLocalMomentReader, listDateKeys, listDayIntervals } from '../../common/time';

export interface NailTrimStatsRow {
  trimmedAt: Date;
  areas: NailTrimArea[];
}

interface LocalTrim {
  trim: NailTrimStatsRow;
  at: number;
  date: string;
}

function includesArea({ trim }: LocalTrim, area: NailTrimArea): boolean {
  return trim.areas.includes(area);
}

/**
 * Intervals of one zone over the whole history (ascending). Two trims on the same local day make no
 * interval; the result is assigned to the day of the most recent trim.
 */
function listZoneIntervals(allTrims: LocalTrim[], area: NailTrimArea): NailTrimInterval[] {
  return listDayIntervals(allTrims.filter((entry) => includesArea(entry, area))).map(({ date, days }) => ({
    date,
    area,
    days,
  }));
}

function latestInstant(allTrims: LocalTrim[], area: NailTrimArea): string | null {
  const latest = allTrims.filter((entry) => includesArea(entry, area)).at(-1);
  return latest === undefined ? null : latest.trim.trimmedAt.toISOString();
}

function buildTotals(
  rangeTrims: NailTrimStatsRow[],
  intervals: NailTrimInterval[],
  allTrims: LocalTrim[],
): NailTrimmingStatsTotals {
  const daysOf = (area: NailTrimArea): number[] =>
    intervals.filter((entry) => entry.area === area).map(({ days }) => days);
  const countAreas = (...areas: NailTrimArea[]): number =>
    rangeTrims.filter(
      (trim) => areas.length === trim.areas.length && areas.every((area) => trim.areas.includes(area)),
    ).length;

  return {
    trims: rangeTrims.length,
    handsOnly: countAreas('hands'),
    feetOnly: countAreas('feet'),
    both: countAreas(...NAIL_AREAS),
    averageHandsIntervalDays: averageDays(daysOf('hands')),
    averageFeetIntervalDays: averageDays(daysOf('feet')),
    longestIntervalDays: intervals.length === 0 ? null : Math.max(...intervals.map(({ days }) => days)),
    lastHandsAt: latestInstant(allTrims, 'hands'),
    lastFeetAt: latestInstant(allTrims, 'feet'),
  };
}

/**
 * Aggregates the trims by local day (in the request time zone). Intervals are measured per zone
 * against the previous trim of that zone, even when it falls before the range; the last trim of
 * each zone uses the whole history, the rest only the requested range.
 */
export function calculateNailTrimmingStats(allTrims: NailTrimStatsRow[], request: StatsQuery): NailTrimmingStats {
  const readMoment = createLocalMomentReader(request.tz);
  const local: LocalTrim[] = allTrims
    .map((trim) => {
      const at = trim.trimmedAt.getTime();
      return { trim, at, date: readMoment(at).date };
    })
    .sort((a, b) => a.at - b.at);

  const inRange = local.filter(({ date }) => date >= request.from && date <= request.to);
  const days: NailTrimDayStats[] = listDateKeys(request.from, request.to).map((date) => {
    const trims = inRange.filter((entry) => entry.date === date);
    return {
      date,
      trims: trims.length,
      hands: trims.filter((entry) => includesArea(entry, 'hands')).length,
      feet: trims.filter((entry) => includesArea(entry, 'feet')).length,
    };
  });

  const intervals = NAIL_AREAS.flatMap((area) => listZoneIntervals(local, area))
    .filter(({ date }) => date >= request.from && date <= request.to)
    .sort((a, b) => a.date.localeCompare(b.date) || NAIL_AREAS.indexOf(a.area) - NAIL_AREAS.indexOf(b.area));

  const totals = buildTotals(
    inRange.map(({ trim }) => trim),
    intervals,
    local,
  );
  return { from: request.from, to: request.to, timeZone: request.tz, days, intervals, totals };
}
