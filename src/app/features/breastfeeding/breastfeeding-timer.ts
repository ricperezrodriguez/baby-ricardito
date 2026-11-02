import { parseTimestamp, spanDuration, TimeSpan, toIsoString, totalGaps } from '@shared';
import { Breast, BreastSegment } from './breastfeeding.models';

export interface TimedSegment extends TimeSpan {
  breast: Breast;
}

/** Converts the segments stored in the backend into timed segments ordered by start; invalid ones are dropped. */
export function toTimedSegments(segments: readonly BreastSegment[]): TimedSegment[] {
  return segments
    .flatMap(({ breast, startTime, endTime }) => {
      const start = parseTimestamp(startTime);
      return start === null
        ? []
        : [{ breast, start, end: endTime === null ? null : parseTimestamp(endTime) }];
    })
    .sort((a, b) => a.start - b.start);
}

/** Converts timed segments into the shape the backend stores; running segments keep `endTime: null`. */
export function toSegmentDtos(
  segments: readonly TimedSegment[],
): Pick<BreastSegment, 'breast' | 'startTime' | 'endTime'>[] {
  return segments.map(({ breast, start, end }) => ({
    breast,
    startTime: toIsoString(start),
    endTime: end === null ? null : toIsoString(end),
  }));
}

/** The breast whose segment is still running, or `null` when none is. */
export function activeBreastOf(segments: readonly TimedSegment[]): Breast | null {
  return segments.find(({ end }) => end === null)?.breast ?? null;
}

/** Closes any running segment at `timestamp`; starts a new one on `breast` unless it was the active one. */
export function toggleSegment(
  segments: readonly TimedSegment[],
  breast: Breast,
  timestamp: number,
): TimedSegment[] {
  const wasActive = activeBreastOf(segments) === breast;
  const closed = segments.map((segment) =>
    segment.end === null ? { ...segment, end: timestamp } : segment,
  );
  return wasActive ? closed : [...closed, { breast, start: timestamp, end: null }];
}

/** Milliseconds spent on each breast; running segments are measured up to `now`. */
export function durationsByBreast(
  segments: readonly TimedSegment[],
  now: number,
): Record<Breast, number> {
  const totals: Record<Breast, number> = { left: 0, right: 0 };
  for (const segment of segments) {
    totals[segment.breast] += spanDuration(segment, now);
  }
  return totals;
}

/** Total milliseconds fed on both breasts; running segments are measured up to `now`. */
export function totalDuration(segments: readonly TimedSegment[], now: number): number {
  const { left, right } = durationsByBreast(segments, now);
  return left + right;
}

/** Moves the start of the feed (the first segment). */
export function withStart(segments: readonly TimedSegment[], start: number): TimedSegment[] {
  return segments.map((segment, index) => (index === 0 ? { ...segment, start } : segment));
}

/** Moves the end of the feed (the last segment); a running segment is left untouched. */
export function withEnd(segments: readonly TimedSegment[], end: number): TimedSegment[] {
  return segments.map((segment, index) =>
    index === segments.length - 1 && segment.end !== null ? { ...segment, end } : segment,
  );
}

/**
 * Sets the total idle time between segments without changing how long each one lasted.
 * More pause delays the last segment; less pause closes the gaps starting from the last one.
 */
export function withTotalPause(segments: readonly TimedSegment[], pause: number): TimedSegment[] {
  const delta = Math.max(0, pause) - totalGaps(segments);
  if (delta === 0 || segments.length < 2) {
    return [...segments];
  }

  const shifts = segments.map(() => 0);
  if (delta > 0) {
    shifts[shifts.length - 1] = delta;
  } else {
    let remaining = -delta;
    for (let index = segments.length - 1; index >= 1 && remaining > 0; index--) {
      const previousEnd = segments[index - 1].end;
      const gap = previousEnd === null ? 0 : Math.max(0, segments[index].start - previousEnd);
      const closed = Math.min(gap, remaining);
      remaining -= closed;
      for (let later = index; later < segments.length; later++) {
        shifts[later] -= closed;
      }
    }
  }

  return segments.map((segment, index) => ({
    ...segment,
    start: segment.start + shifts[index],
    end: segment.end === null ? null : segment.end + shifts[index],
  }));
}
