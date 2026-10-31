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
