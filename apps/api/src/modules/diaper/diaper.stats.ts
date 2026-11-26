import type {
  DiaperDayStats,
  DiaperStats,
  DiaperStatsTotals,
  DiaperStoolColorCounts,
  DiaperType,
  StatsQuery,
  StoolColor,
} from '@baby-ricardito/contracts';
import { average, createEmptyHourMap, createLocalMomentReader, listDateKeys } from '../../common/time';

const MS_PER_SECOND = 1_000;

export interface DiaperStatsChange {
  changedAt: Date;
  type: DiaperType;
  stoolColor: StoolColor | null;
  hasRash: boolean;
}

function createEmptyColorCounts(): DiaperStoolColorCounts {
  return { yellow: 0, green: 0, brown: 0, black: 0, red: 0, white: 0, unspecified: 0 };
}

function countByType(changes: DiaperStatsChange[], type: DiaperType): number {
  return changes.filter((change) => change.type === type).length;
}

function countStoolColors(changes: DiaperStatsChange[]): DiaperStoolColorCounts {
  const counts = createEmptyColorCounts();
  for (const change of changes) {
    if (change.type !== 'wet') {
      counts[change.stoolColor ?? 'unspecified'] += 1;
    }
  }
  return counts;
}

/** 1 decimal; null without changes. */
function averagePerDay(changes: number, days: number): number | null {
  return changes === 0 || days === 0 ? null : Math.round((changes / days) * 10) / 10;
}

/** Aggregates the changes by local day. Intervals are measured against the previous change, even from the day before. */
export function calculateDiaperStats(allChanges: DiaperStatsChange[], request: StatsQuery): DiaperStats {
  const readMoment = createLocalMomentReader(request.tz);
  const sorted = allChanges
    .map((change) => {
      const at = change.changedAt.getTime();
      return { change, at, moment: readMoment(at) };
    })
    .sort((a, b) => a.at - b.at);

  const intervalsByDay = new Map<string, number[]>();
  sorted.forEach((entry, index) => {
    if (index > 0) {
      const gaps = intervalsByDay.get(entry.moment.date) ?? [];
      gaps.push((entry.at - sorted[index - 1]!.at) / MS_PER_SECOND);
      intervalsByDay.set(entry.moment.date, gaps);
    }
  });

  const inRange = sorted.filter(({ moment }) => moment.date >= request.from && moment.date <= request.to);
  const dayKeys = listDateKeys(request.from, request.to);
  const days: DiaperDayStats[] = dayKeys.map((date) => {
    const changes = inRange.filter(({ moment }) => moment.date === date).map(({ change }) => change);
    return {
      date,
      changes: changes.length,
      wet: countByType(changes, 'wet'),
      dirty: countByType(changes, 'dirty'),
      both: countByType(changes, 'both'),
      rashChanges: changes.filter((change) => change.hasRash).length,
      averageIntervalSeconds: average(intervalsByDay.get(date) ?? []),
    };
  });

  const hourMap = createEmptyHourMap();
  for (const { moment } of inRange) {
    hourMap[moment.weekday]![moment.hour]! += 1;
  }

  const rangeChanges = inRange.map(({ change }) => change);
  const totals: DiaperStatsTotals = {
    changes: rangeChanges.length,
    wet: countByType(rangeChanges, 'wet'),
    dirty: countByType(rangeChanges, 'dirty'),
    both: countByType(rangeChanges, 'both'),
    rashChanges: rangeChanges.filter((change) => change.hasRash).length,
    averageChangesPerDay: averagePerDay(rangeChanges.length, dayKeys.length),
    averageIntervalSeconds: average(dayKeys.flatMap((date) => intervalsByDay.get(date) ?? [])),
    stoolColors: countStoolColors(rangeChanges),
  };

  return { from: request.from, to: request.to, timeZone: request.tz, days, totals, hourMap };
}
