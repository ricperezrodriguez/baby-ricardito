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

/**
 * Sets the total time spent on one breast of a finished feed. The start and the pauses stay fixed,
 * so the end moves. More time lengthens the breast's last segment (or adds one at the end if it had
 * none); less time shortens its segments from the last one, removing those left empty.
 */
export function withBreastDuration(
  segments: readonly TimedSegment[],
  breast: Breast,
  duration: number,
): TimedSegment[] {
  if (segments.length === 0 || segments.some(({ end }) => end === null)) {
    return [...segments];
  }

  const items = segments.map((segment, index) => ({
    breast: segment.breast,
    length: (segment.end ?? segment.start) - segment.start,
    gap: index === 0 ? 0 : Math.max(0, segment.start - (segments[index - 1].end ?? segment.start)),
  }));

  const current = items.reduce((sum, item) => sum + (item.breast === breast ? item.length : 0), 0);
  let delta = Math.max(0, duration) - current;
  if (delta > 0) {
    const last = items.map((item) => item.breast).lastIndexOf(breast);
    if (last >= 0) {
      items[last].length += delta;
    } else {
      items.push({ breast, length: delta, gap: 0 });
    }
  } else {
    for (let index = items.length - 1; index >= 0 && delta < 0; index--) {
      if (items[index].breast === breast) {
        const cut = Math.min(items[index].length, -delta);
        items[index].length -= cut;
        delta += cut;
      }
    }
  }

  let cursor = segments[0].start;
  return items
    .filter(({ length }) => length > 0)
    .map(({ breast: itemBreast, length, gap }, index) => {
      const start = index === 0 ? cursor : cursor + gap;
      cursor = start + length;
      return { breast: itemBreast, start, end: cursor };
    });
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
