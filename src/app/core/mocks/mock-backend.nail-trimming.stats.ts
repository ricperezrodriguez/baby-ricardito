import { createLocalMomentReader, listDateKeys } from '@app/core/mocks/mock-backend.time';
import {
  NAIL_AREAS,
  NailTrim,
  NailTrimArea,
  NailTrimDayStats,
  NailTrimInterval,
  NailTrimmingStats,
  NailTrimmingStatsRequest,
  NailTrimmingStatsTotals,
} from '@app/features/nail-trimming/nail-trimming.models';

const MS_PER_DAY = 86_400_000;

interface LocalTrim {
  trim: NailTrim;
  at: number;
  date: string;
}

function includesArea({ trim }: LocalTrim, area: NailTrimArea): boolean {
  return trim.areas.includes(area);
}

function wholeDaysBetween(earlierDate: string, laterDate: string): number {
  return Math.round((Date.parse(laterDate) - Date.parse(earlierDate)) / MS_PER_DAY);
}

/** Average with one decimal; null without values. */
function averageDays(values: number[]): number | null {
  return values.length === 0
    ? null
    : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

/**
 * Intervals of one zone over the whole history (ascending). Two trims on the same local day make no
 * interval; the result is assigned to the day of the most recent trim.
 */
function listZoneIntervals(allTrims: LocalTrim[], area: NailTrimArea): NailTrimInterval[] {
  const zoneTrims = allTrims.filter((entry) => includesArea(entry, area));
  const intervals: NailTrimInterval[] = [];
  for (let index = 1; index < zoneTrims.length; index += 1) {
    const days = wholeDaysBetween(zoneTrims[index - 1].date, zoneTrims[index].date);
    if (days > 0) {
      intervals.push({ date: zoneTrims[index].date, area, days });
    }
  }
  return intervals;
}

function latestInstant(allTrims: LocalTrim[], area: NailTrimArea): string | null {
  const latest = allTrims.filter((entry) => includesArea(entry, area)).at(-1);
  return latest === undefined ? null : latest.trim.trimmedAt;
}

function buildTotals(
  rangeTrims: NailTrim[],
  intervals: NailTrimInterval[],
  allTrims: LocalTrim[],
): NailTrimmingStatsTotals {
  const daysOf = (area: NailTrimArea): number[] =>
    intervals.filter((entry) => entry.area === area).map(({ days }) => days);
  const countAreas = (...areas: NailTrimArea[]): number =>
    rangeTrims.filter(
      (trim) =>
        areas.length === trim.areas.length && areas.every((area) => trim.areas.includes(area)),
    ).length;

  return {
    trims: rangeTrims.length,
    handsOnly: countAreas('hands'),
    feetOnly: countAreas('feet'),
    both: countAreas(...NAIL_AREAS),
    averageHandsIntervalDays: averageDays(daysOf('hands')),
    averageFeetIntervalDays: averageDays(daysOf('feet')),
    longestIntervalDays:
      intervals.length === 0 ? null : Math.max(...intervals.map(({ days }) => days)),
    lastHandsAt: latestInstant(allTrims, 'hands'),
    lastFeetAt: latestInstant(allTrims, 'feet'),
  };
}

/**
 * Aggregates the trims by local day (in the request time zone). Intervals are measured per zone
 * against the previous trim of that zone, even when it falls before the range; the last trim of
 * each zone uses the whole history, the rest only the requested range.
 */
export function calculateNailTrimmingStats(
  allTrims: NailTrim[],
  request: NailTrimmingStatsRequest,
): NailTrimmingStats {
  const readMoment = createLocalMomentReader(request.timeZone);
  const local: LocalTrim[] = allTrims
    .map((trim) => {
      const at = Date.parse(trim.trimmedAt);
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
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || NAIL_AREAS.indexOf(a.area) - NAIL_AREAS.indexOf(b.area),
    );

  const totals = buildTotals(
    inRange.map(({ trim }) => trim),
    intervals,
    local,
  );
  return { ...request, days, intervals, totals };
}
