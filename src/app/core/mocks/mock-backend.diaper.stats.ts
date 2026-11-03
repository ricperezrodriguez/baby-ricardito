import {
  DIAPER_TYPE,
  DiaperChange,
  DiaperDayStats,
  DiaperStats,
  DiaperStatsRequest,
  DiaperStatsTotals,
  DiaperStoolColorCounts,
} from '@app/features/diaper/diaper.models';
import {
  average,
  createEmptyHourMap,
  createLocalMomentReader,
  listDateKeys,
} from '@app/core/mocks/mock-backend.time';

const MS_PER_SECOND = 1_000;

function createEmptyColorCounts(): DiaperStoolColorCounts {
  return { yellow: 0, green: 0, brown: 0, black: 0, red: 0, white: 0, unspecified: 0 };
}

function countByType(changes: DiaperChange[], type: DiaperChange['type']): number {
  return changes.filter((change) => change.type === type).length;
}

function countStoolColors(changes: DiaperChange[]): DiaperStoolColorCounts {
  const counts = createEmptyColorCounts();
  for (const change of changes) {
    if (change.type !== DIAPER_TYPE.WET) {
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
export function calculateDiaperStats(allChanges: DiaperChange[], request: DiaperStatsRequest): DiaperStats {
  const readMoment = createLocalMomentReader(request.timeZone);
  const sorted = allChanges
    .map((change) => {
      const at = Date.parse(change.changedAt);
      return { change, at, moment: readMoment(at) };
    })
    .sort((a, b) => a.at - b.at);

  const intervalsByDay = new Map<string, number[]>();
  sorted.forEach((entry, index) => {
    if (index > 0) {
      const gaps = intervalsByDay.get(entry.moment.date) ?? [];
      gaps.push((entry.at - sorted[index - 1].at) / MS_PER_SECOND);
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
      wet: countByType(changes, DIAPER_TYPE.WET),
      dirty: countByType(changes, DIAPER_TYPE.DIRTY),
      both: countByType(changes, DIAPER_TYPE.BOTH),
      rashChanges: changes.filter((change) => change.hasRash).length,
      averageIntervalSeconds: average(intervalsByDay.get(date) ?? []),
    };
  });

  const hourMap = createEmptyHourMap();
  for (const { moment } of inRange) {
    hourMap[moment.weekday][moment.hour] += 1;
  }

  const rangeChanges = inRange.map(({ change }) => change);
  const totals: DiaperStatsTotals = {
    changes: rangeChanges.length,
    wet: countByType(rangeChanges, DIAPER_TYPE.WET),
    dirty: countByType(rangeChanges, DIAPER_TYPE.DIRTY),
    both: countByType(rangeChanges, DIAPER_TYPE.BOTH),
    rashChanges: rangeChanges.filter((change) => change.hasRash).length,
    averageChangesPerDay: averagePerDay(rangeChanges.length, dayKeys.length),
    averageIntervalSeconds: average(dayKeys.flatMap((date) => intervalsByDay.get(date) ?? [])),
    stoolColors: countStoolColors(rangeChanges),
  };

  return { ...request, days, totals, hourMap };
}
