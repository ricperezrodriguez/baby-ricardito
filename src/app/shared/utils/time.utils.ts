/** Formats a duration in milliseconds as `mm:ss`, or `h:mm:ss` from one hour on. */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Parses `m:ss` or `h:mm:ss` (the inverse of `formatDuration`) into milliseconds, or `null` when it is invalid. */
export function parseDuration(text: string): number | null {
  const match = /^(?:(\d+):([0-5]\d)|(\d+):([0-5]\d):([0-5]\d))$/.exec(text.trim());
  if (match === null) {
    return null;
  }

  const [hours, minutes, seconds] =
    match[1] === undefined
      ? [Number(match[3]), Number(match[4]), Number(match[5])]
      : [0, Number(match[1]), Number(match[2])];
  return ((hours * 60 + minutes) * 60 + seconds) * 1_000;
}

/** Formats epoch milliseconds as the local `yyyy-MM-ddTHH:mm:ss` value used by `datetime-local` inputs. */
export function toDateTimeLocal(epochMilliseconds: number): string {
  const date = new Date(epochMilliseconds);
  const pad = (value: number): string => String(value).padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** Parses a local `datetime-local` value into epoch milliseconds, or `null` when it is empty or invalid. */
export function parseDateTimeLocal(text: string): number | null {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(text) ? parseTimestamp(text) : null;
}

/** A time span in epoch milliseconds; `end: null` means it is still running. */
export interface TimeSpan {
  start: number;
  end: number | null;
}

/** Milliseconds covered by a span; open spans are measured up to `now`. Never negative. */
export function spanDuration({ start, end }: TimeSpan, now: number): number {
  return Math.max(0, (end ?? now) - start);
}

/** Total idle milliseconds between consecutive spans (ordered by start). Open spans have no end, so they add no gap. */
export function totalGaps(spans: readonly TimeSpan[]): number {
  let total = 0;
  for (let index = 1; index < spans.length; index++) {
    const previousEnd = spans[index - 1].end;
    if (previousEnd !== null) {
      total += Math.max(0, spans[index].start - previousEnd);
    }
  }
  return total;
}

/** Milliseconds left for a countdown that began at `start`. Never negative. */
export function remainingTime(start: number, durationMs: number, now: number): number {
  return Math.max(0, start + durationMs - now);
}

/** Whether a countdown that began at `start` has run its course. */
export function isTimerFinished(start: number, durationMs: number, now: number): boolean {
  return now >= start + durationMs;
}

/** Parses an ISO timestamp into epoch milliseconds, or `null` when it is invalid. */
export function parseTimestamp(timestamp: string): number | null {
  const value = Date.parse(timestamp);
  return Number.isFinite(value) ? value : null;
}

export function toIsoString(epochMilliseconds: number): string {
  return new Date(epochMilliseconds).toISOString();
}

/** Formats milliseconds as short Spanish text such as `45 s`, `8 min` or `1 h 05 min`. Never negative. */
export function formatDurationText(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1_000));
  if (totalSeconds < 60) {
    return `${totalSeconds} s`;
  }

  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${String(minutes).padStart(2, '0')} min` : `${minutes} min`;
}

/** Local time of day of an instant as `HH:mm`. */
export function formatClockTime(epochMilliseconds: number): string {
  return toDateTimeLocal(epochMilliseconds).slice(11, 16);
}

/** Local calendar day of an instant as `yyyy-MM-dd`. */
export function localDateKey(epochMilliseconds: number): string {
  return toDateTimeLocal(epochMilliseconds).slice(0, 10);
}

/** Whole local calendar days from the day of `from` to the day of `to`. Never negative. */
export function localDaysBetween(from: number, to: number): number {
  const [fromYear, fromMonth, fromDay] = localDateKey(from).split('-').map(Number);
  const [toYear, toMonth, toDay] = localDateKey(to).split('-').map(Number);
  const days =
    (Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) /
    86_400_000;
  return Math.max(0, Math.round(days));
}

/** Local hour of the day (0-23) of an instant. */
export function localHour(epochMilliseconds: number): number {
  return new Date(epochMilliseconds).getHours();
}

/** Inclusive local-day range of `days` days that ends on the day of `now`. */
export function localDateRange(now: number, days: number): { from: string; to: string } {
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  return { from: localDateKey(start.getTime()), to: localDateKey(now) };
}

/** IANA time zone of the device, such as `Europe/Madrid`. */
export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const DAY_HEADING_FORMAT = new Intl.DateTimeFormat('es', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** Day heading in Spanish: `Hoy`, `Ayer` or a date such as `Lunes, 2 de noviembre`. */
export function formatDayHeading(dayKey: string, now: number): string {
  const today = localDateKey(now);
  if (dayKey === today) {
    return 'Hoy';
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey === localDateKey(yesterday.getTime())) {
    return 'Ayer';
  }

  const [year, month, day] = dayKey.split('-').map(Number);
  const text = DAY_HEADING_FORMAT.format(new Date(year, month - 1, day));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const DAY_LABEL_FORMAT = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });

/** Short day label for chart axes, such as `2 nov`. */
export function formatDayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  return DAY_LABEL_FORMAT.format(new Date(year, month - 1, day)).replace('.', '');
}

/** Weekday of a local day (`yyyy-MM-dd`), Monday = 0 ... Sunday = 6. */
export function weekdayOfDay(dayKey: string): number {
  const [year, month, day] = dayKey.split('-').map(Number);
  return (new Date(year, month - 1, day).getDay() + 6) % 7;
}

const HOUR_MS = 3_600_000;
const DAYS_FROM_HOURS = 48;

/** Formats a duration in whole hours (`36 h`), or in whole days from 48 hours on (`2 días`). Never negative. */
export function formatElapsedHoursOrDays(milliseconds: number): string {
  const hours = Math.max(0, Math.floor(milliseconds / HOUR_MS));
  if (hours < DAYS_FROM_HOURS) {
    return `${hours} h`;
  }

  const days = Math.floor(hours / 24);
  return `${days} días`;
}

export function formatElapsedSince(timestamp: string, now: number): string {
  const elapsedMilliseconds = now - Date.parse(timestamp);
  if (!Number.isFinite(elapsedMilliseconds)) {
    return 'Hora no disponible';
  }

  const elapsedMinutes = Math.max(0, Math.floor(elapsedMilliseconds / 60_000));
  const days = Math.floor(elapsedMinutes / 1_440);
  const hours = Math.floor((elapsedMinutes % 1_440) / 60);
  const minutes = elapsedMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `Hace ${days} d ${hours} h` : `Hace ${days} d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `Hace ${hours} h ${minutes} min` : `Hace ${hours} h`;
  }
  return elapsedMinutes > 0 ? `Hace ${elapsedMinutes} min` : 'Hace menos de 1 min';
}
