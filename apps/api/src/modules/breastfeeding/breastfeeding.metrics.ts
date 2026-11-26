import type { Breast } from '@baby-ricardito/contracts';

export interface SegmentTimes {
  breast: Breast;
  startTime: Date;
  /** Null while the segment is open. */
  endTime: Date | null;
}

export interface SessionTimes {
  startTime: Date;
  /** Null while the session is in progress. */
  endTime: Date | null;
  segments: SegmentTimes[];
}

export interface SessionMetrics {
  status: 'in_progress' | 'finished';
  /** Segments with the open ones closed using the session `endTime` (stay open while the session is). */
  segments: SegmentTimes[];
  totalDurationSeconds: number;
  leftBreastDurationSeconds: number;
  rightBreastDurationSeconds: number;
  firstBreast: Breast | null;
}

const MS_PER_SECOND = 1_000;

function durationSeconds(start: Date, end: Date | null, now: number): number {
  const endMs = end === null ? now : end.getTime();
  return Math.max(0, Math.floor((endMs - start.getTime()) / MS_PER_SECOND));
}

function firstBreastOf(segments: SegmentTimes[]): Breast | null {
  const earliest = segments.reduce<SegmentTimes | null>(
    (first, current) => (first === null || current.startTime < first.startTime ? current : first),
    null,
  );
  return earliest === null ? null : earliest.breast;
}

/**
 * Status, closed segments and totals of a session. Open segments and sessions are measured up to `now`
 * (epoch milliseconds). Without segments the total falls back to the session span.
 */
export function calculateSessionMetrics(session: SessionTimes, now: number): SessionMetrics {
  const segments = session.segments.map((segment) => ({
    ...segment,
    endTime: segment.endTime ?? session.endTime,
  }));
  const secondsOf = (breast: Breast): number =>
    segments
      .filter((segment) => segment.breast === breast)
      .reduce((total, segment) => total + durationSeconds(segment.startTime, segment.endTime, now), 0);

  const left = secondsOf('left');
  const right = secondsOf('right');
  return {
    status: session.endTime === null ? 'in_progress' : 'finished',
    segments,
    totalDurationSeconds:
      segments.length > 0 ? left + right : durationSeconds(session.startTime, session.endTime, now),
    leftBreastDurationSeconds: left,
    rightBreastDurationSeconds: right,
    firstBreast: firstBreastOf(segments),
  };
}
