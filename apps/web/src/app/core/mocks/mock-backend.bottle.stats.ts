import {
  BOTTLE_MILK_TYPE,
  BottleDayStats,
  BottleFeed,
  BottleMilkType,
  BottleStats,
  BottleStatsRequest,
  BottleStatsTotals,
} from '@app/features/bottle/bottle.models';
import {
  average,
  createEmptyHourMap,
  createLocalMomentReader,
  listDateKeys,
} from '@app/core/mocks/mock-backend.time';

const MS_PER_SECOND = 1_000;

function sumMl(feeds: BottleFeed[]): number {
  return feeds.reduce((sum, feed) => sum + feed.amountMl, 0);
}

function sumMlOfType(feeds: BottleFeed[], milkType: BottleMilkType): number {
  return sumMl(feeds.filter((feed) => feed.milkType === milkType));
}

/** Rounded average amount per feed; null without feeds. */
function averageAmount(feeds: BottleFeed[]): number | null {
  return average(feeds.map((feed) => feed.amountMl));
}

/** Total millilitres over all the days of the range (empty ones included); null without feeds. */
function averageDailyMl(totalMl: number, feeds: number, days: number): number | null {
  return feeds === 0 || days === 0 ? null : Math.round(totalMl / days);
}

/** 1 decimal; null without feeds. */
function averageFeedsPerDay(feeds: number, days: number): number | null {
  return feeds === 0 || days === 0 ? null : Math.round((feeds / days) * 10) / 10;
}

/**
 * Aggregates the feeds by local day. Intervals are measured start to start against the previous feed
 * (even from the day before) and belong to the day of the later feed.
 */
export function calculateBottleStats(allFeeds: BottleFeed[], request: BottleStatsRequest): BottleStats {
  const readMoment = createLocalMomentReader(request.timeZone);
  const sorted = allFeeds
    .map((feed) => {
      const at = Date.parse(feed.fedAt);
      return { feed, at, moment: readMoment(at) };
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
  const days: BottleDayStats[] = dayKeys.map((date) => {
    const feeds = inRange.filter(({ moment }) => moment.date === date).map(({ feed }) => feed);
    return {
      date,
      feeds: feeds.length,
      totalMl: sumMl(feeds),
      averageAmountMl: averageAmount(feeds),
      averageIntervalSeconds: average(intervalsByDay.get(date) ?? []),
    };
  });

  const hourMap = createEmptyHourMap();
  for (const { moment } of inRange) {
    hourMap[moment.weekday][moment.hour] += 1;
  }

  const rangeFeeds = inRange.map(({ feed }) => feed);
  const totalMl = sumMl(rangeFeeds);
  const totals: BottleStatsTotals = {
    feeds: rangeFeeds.length,
    totalMl,
    breastMilkMl: sumMlOfType(rangeFeeds, BOTTLE_MILK_TYPE.BREAST_MILK),
    formulaMl: sumMlOfType(rangeFeeds, BOTTLE_MILK_TYPE.FORMULA),
    mixedMl: sumMlOfType(rangeFeeds, BOTTLE_MILK_TYPE.MIXED),
    averageDailyMl: averageDailyMl(totalMl, rangeFeeds.length, dayKeys.length),
    averageFeedsPerDay: averageFeedsPerDay(rangeFeeds.length, dayKeys.length),
    averageAmountMl: averageAmount(rangeFeeds),
    averageIntervalSeconds: average(dayKeys.flatMap((date) => intervalsByDay.get(date) ?? [])),
  };

  return { ...request, days, totals, hourMap };
}
