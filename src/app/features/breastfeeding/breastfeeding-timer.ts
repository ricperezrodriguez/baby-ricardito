import { parseTimestamp, spanDuration, TimeSpan, toIsoString } from '@shared';
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
