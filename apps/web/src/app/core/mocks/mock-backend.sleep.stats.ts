import { SleepDayStats, SleepStats, SleepStatsRequest, SleepStatsTotals } from '@app/features/sleep/sleep.models';
import { isNightSleepHour } from '@app/features/sleep/sleep.span';
import {
  LocalMoment,
  average,
  createEmptyHourMap,
  createLocalMomentReader,
  listDateKeys,
} from '@app/core/mocks/mock-backend.time';
import { SleepSessionInput } from '@app/core/mocks/mock-backend.sleep.validation';

const MS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
/** Every real UTC offset is a multiple of 15 minutes, so a 15-minute chunk never crosses a local hour or day. */
const CHUNK_MS = 900_000;

interface FinishedSleep {
  start: number;
  end: number;
}

/** Everything that belongs to one local day of the range. */
interface DayBucket {
  asleepSeconds: number;
  durations: number[];
  napDurations: number[];
  nightDurations: number[];
  awakeSeconds: number[];
}

function createBucket(): DayBucket {
  return { asleepSeconds: 0, durations: [], napDurations: [], nightDurations: [], awakeSeconds: [] };
}

function toFinishedSleeps(sessions: readonly SleepSessionInput[]): FinishedSleep[] {
  return sessions
    .flatMap(({ startTime, endTime }) =>
      endTime === null ? [] : [{ start: Date.parse(startTime), end: Date.parse(endTime) }],
    )
    .sort((a, b) => a.start - b.start);
}

function secondsBetween(start: number, end: number): number {
  return Math.round((end - start) / MS_PER_SECOND);
}

/** Splits a sleep in chunks that each lie inside one local hour (and so inside one local day). */
function* chunksOf(sleep: FinishedSleep, readMoment: (at: number) => LocalMoment): Generator<{
  moment: LocalMoment;
  seconds: number;
}> {
  let cursor = sleep.start;
  while (cursor < sleep.end) {
    const next = Math.min(sleep.end, (Math.floor(cursor / CHUNK_MS) + 1) * CHUNK_MS);
    yield { moment: readMoment(cursor), seconds: (next - cursor) / MS_PER_SECOND };
    cursor = next;
  }
}

function longest(values: readonly number[]): number {
  return values.reduce((max, value) => Math.max(max, value), 0);
}

/**
 * Aggregates the finished sleeps by local day. Time asleep is split at local midnight; the count, longest sleep and
 * nap/night averages go to the start day; the awake time (previous end to this start, even from before the range)
 * goes to the day of the later sleep. Nap vs night comes from the local start hour.
 */
export function calculateSleepStats(sessions: readonly SleepSessionInput[], request: SleepStatsRequest): SleepStats {
  const readMoment = createLocalMomentReader(request.timeZone);
  const dayKeys = listDateKeys(request.from, request.to);
  const buckets = new Map(dayKeys.map((date) => [date, createBucket()] as const));
  const asleepSeconds = createEmptyHourMap();

  const finished = toFinishedSleeps(sessions);
  finished.forEach((sleep, index) => {
    const startMoment = readMoment(sleep.start);
    const startBucket = buckets.get(startMoment.date);
    if (startBucket !== undefined) {
      const duration = secondsBetween(sleep.start, sleep.end);
      startBucket.durations.push(duration);
      (isNightSleepHour(startMoment.hour) ? startBucket.nightDurations : startBucket.napDurations).push(duration);
      if (index > 0) {
        startBucket.awakeSeconds.push(Math.max(0, secondsBetween(finished[index - 1].end, sleep.start)));
      }
    }

    if (readMoment(sleep.end).date < request.from || startMoment.date > request.to) {
      return;
    }
    for (const { moment, seconds } of chunksOf(sleep, readMoment)) {
      const bucket = buckets.get(moment.date);
      if (bucket !== undefined) {
        bucket.asleepSeconds += seconds;
        asleepSeconds[moment.weekday][moment.hour] += seconds;
      }
    }
  });

  const days: SleepDayStats[] = dayKeys.map((date) => {
    const bucket = buckets.get(date) ?? createBucket();
    return {
      date,
      sleeps: bucket.durations.length,
      totalSeconds: Math.round(bucket.asleepSeconds),
      longestSleepSeconds: longest(bucket.durations),
      averageDurationSeconds: average(bucket.durations),
      averageAwakeSeconds: average(bucket.awakeSeconds),
      napAverageDurationSeconds: average(bucket.napDurations),
      nightAverageDurationSeconds: average(bucket.nightDurations),
    };
  });

  const allBuckets = [...buckets.values()];
  const durations = allBuckets.flatMap((bucket) => bucket.durations);
  const totalSeconds = days.reduce((sum, day) => sum + day.totalSeconds, 0);
  const totals: SleepStatsTotals = {
    sleeps: durations.length,
    totalSeconds,
    averageDailySeconds: durations.length === 0 ? null : Math.round(totalSeconds / dayKeys.length),
    longestSleepSeconds: longest(durations),
    averageDurationSeconds: average(durations),
    averageAwakeSeconds: average(allBuckets.flatMap((bucket) => bucket.awakeSeconds)),
    napAverageDurationSeconds: average(allBuckets.flatMap((bucket) => bucket.napDurations)),
    nightAverageDurationSeconds: average(allBuckets.flatMap((bucket) => bucket.nightDurations)),
  };

  const hourMap = asleepSeconds.map((hours) => hours.map((seconds) => Math.round(seconds / SECONDS_PER_MINUTE)));
  return { ...request, days, totals, hourMap };
}
