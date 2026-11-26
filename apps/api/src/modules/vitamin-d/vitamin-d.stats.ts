import type {
  StatsQuery,
  VitaminDDayStats,
  VitaminDDayStatus,
  VitaminDStats,
  VitaminDStatsTotals,
} from '@baby-ricardito/contracts';
import { createEmptyHourMap, createLocalMomentReader, listDateKeys } from '../../common/time';

const MS_PER_DAY = 86_400_000;

export interface VitaminDStatsDose {
  givenAt: Date;
  drops: number | null;
}

interface LocalDose {
  dose: VitaminDStatsDose;
  at: number;
  date: string;
}

/** Sum of the recorded drops; null when none of the doses has drops. */
function sumDrops(doses: VitaminDStatsDose[]): number | null {
  const recorded = doses.flatMap(({ drops }) => (drops === null ? [] : [drops]));
  return recorded.length === 0 ? null : recorded.reduce((sum, drops) => sum + drops, 0);
}

function previousDateKey(dateKey: string): string {
  return new Date(Date.parse(dateKey) - MS_PER_DAY).toISOString().slice(0, 10);
}

function dayStatus(date: string, doses: number, today: string, firstDate: string | null): VitaminDDayStatus {
  if (doses > 0) {
    return 'given';
  }
  if (date >= today) {
    return 'pending';
  }
  return firstDate === null || date < firstDate ? 'notStarted' : 'missed';
}

/** Consecutive given days ending today, or yesterday while today has no dose yet. */
function countCurrentStreak(givenDates: ReadonlySet<string>, today: string): number {
  let cursor = givenDates.has(today) ? today : previousDateKey(today);
  let streak = 0;
  while (givenDates.has(cursor)) {
    streak += 1;
    cursor = previousDateKey(cursor);
  }
  return streak;
}

function countLongestStreak(days: VitaminDDayStats[]): number {
  let longest = 0;
  let running = 0;
  for (const { status } of days) {
    running = status === 'given' ? running + 1 : 0;
    longest = Math.max(longest, running);
  }
  return longest;
}

function buildTotals(
  days: VitaminDDayStats[],
  rangeDoses: VitaminDStatsDose[],
  allDoses: LocalDose[],
  today: string,
): VitaminDStatsTotals {
  const daysGiven = days.filter(({ status }) => status === 'given').length;
  const daysMissed = days.filter(({ status }) => status === 'missed').length;
  const daysInRange = daysGiven + daysMissed;
  const latest = allDoses.reduce<LocalDose | null>(
    (best, entry) => (best === null || entry.at > best.at ? entry : best),
    null,
  );

  return {
    doses: rangeDoses.length,
    drops: sumDrops(rangeDoses),
    daysGiven,
    daysMissed,
    daysInRange,
    adherencePercent: daysInRange === 0 ? null : Math.round((daysGiven / daysInRange) * 100),
    currentStreakDays: countCurrentStreak(new Set(allDoses.map(({ date }) => date)), today),
    longestStreakDays: countLongestStreak(days),
    lastGivenAt: latest === null ? null : latest.dose.givenAt.toISOString(),
  };
}

/**
 * Aggregates the doses by local day (in the request time zone). The status of a day depends on the
 * current moment (`now`, epoch milliseconds) and on the first dose ever recorded; streaks and the
 * last dose use the whole history, the rest only the requested range.
 */
export function calculateVitaminDStats(
  allDoses: VitaminDStatsDose[],
  request: StatsQuery,
  now: number,
): VitaminDStats {
  const readMoment = createLocalMomentReader(request.tz);
  const local: LocalDose[] = allDoses.map((dose) => {
    const at = dose.givenAt.getTime();
    return { dose, at, date: readMoment(at).date };
  });
  const today = readMoment(now).date;
  const firstDate = local.reduce<string | null>(
    (first, { date }) => (first === null || date < first ? date : first),
    null,
  );

  const inRange = local.filter(({ date }) => date >= request.from && date <= request.to);
  const days: VitaminDDayStats[] = listDateKeys(request.from, request.to).map((date) => {
    const doses = inRange.filter((entry) => entry.date === date).map(({ dose }) => dose);
    return { date, doses: doses.length, drops: sumDrops(doses), status: dayStatus(date, doses.length, today, firstDate) };
  });

  const hourMap = createEmptyHourMap();
  for (const { at } of inRange) {
    const { weekday, hour } = readMoment(at);
    hourMap[weekday]![hour]! += 1;
  }

  const totals = buildTotals(days, inRange.map(({ dose }) => dose), local, today);
  return { from: request.from, to: request.to, timeZone: request.tz, days, totals, hourMap };
}
