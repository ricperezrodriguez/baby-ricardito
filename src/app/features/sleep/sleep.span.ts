// sleep.span.ts: time rules of a sleep (span and nap/night classification)

// Imported from the module file (not `@shared`) so the mock backend does not load the whole shared barrel.
import { TimeSpan, localHour, parseTimestamp } from '@app/shared/utils/time.utils';
import { SleepSession } from '@app/features/sleep/sleep.models';

/** First local hour (inclusive) of the night: a sleep that starts from 19:00 is a night sleep */
export const NIGHT_SLEEP_START_HOUR = 19;

/** First local hour (inclusive) of the day: a sleep that starts from 07:00 (until 18:59) is a nap */
export const DAY_SLEEP_START_HOUR = 7;

/** Whether a sleep that starts at this local hour (0-23) is a night sleep (19:00-06:59) */
export function isNightSleepHour(hour: number): boolean {
  return hour >= NIGHT_SLEEP_START_HOUR || hour < DAY_SLEEP_START_HOUR;
}

/** Whether a sleep that starts at this instant (device time zone) is a night sleep; otherwise it is a nap. */
export function isNightSleepStart(startMilliseconds: number): boolean {
  return isNightSleepHour(localHour(startMilliseconds));
}

/** Time span of a sleep in epoch milliseconds (`end: null` while ongoing); null when the start is invalid. */
export function sleepSpan(session: Pick<SleepSession, 'startTime' | 'endTime'>): TimeSpan | null {
  const start = parseTimestamp(session.startTime);
  if (start === null) {
    return null;
  }
  return { start, end: session.endTime === null ? null : parseTimestamp(session.endTime) };
}
