import {
  Breast,
  BreastSegment,
  BreastfeedingSession,
  SessionStatus,
  UpdateBreastfeedingSessionDto,
} from '../../features/breastfeeding/breastfeeding.models';

export type SegmentInput = Pick<BreastSegment, 'breast' | 'startTime' | 'endTime'>;

export interface SessionInput {
  startTime: string;
  endTime: string | null;
  segments: SegmentInput[];
  notes?: string;
}

export interface SessionMetrics {
  status: SessionStatus;
  /** Segments with open ones closed using the session endTime (when the session is finished). */
  segments: BreastSegment[];
  /** Duration of each segment, aligned by index with `segments`. */
  segmentDurationsSeconds: number[];
  totalDurationSeconds: number;
  leftBreastDurationSeconds: number;
  rightBreastDurationSeconds: number;
  firstBreast: Breast | null;
}

export interface BuildSessionParams {
  id: string;
  babyId: string;
  input: SessionInput;
  createdAt: string;
  updatedAt: string;
  now: Date;
}

const MILLISECONDS_PER_SECOND = 1000;

export function calculateDurationSeconds(startTime: string, endTime: string | null, now: Date): number {
  const end = endTime === null ? now.getTime() : new Date(endTime).getTime();
  const elapsedMs = end - new Date(startTime).getTime();
  return Math.max(0, Math.floor(elapsedMs / MILLISECONDS_PER_SECOND));
}

export function closeOpenSegments(segments: SegmentInput[], sessionEndTime: string | null): BreastSegment[] {
  return segments.map((segment) => ({
    breast: segment.breast,
    startTime: segment.startTime,
    endTime: segment.endTime ?? sessionEndTime,
  }));
}

export function findFirstBreast(segments: BreastSegment[]): Breast | null {
  if (segments.length === 0) {
    return null;
  }
  const earliest = segments.reduce((first, current) =>
    new Date(current.startTime).getTime() < new Date(first.startTime).getTime() ? current : first,
  );
  return earliest.breast;
}

function sumDurationsByBreast(segments: BreastSegment[], durations: number[], breast: Breast): number {
  return segments.reduce(
    (total, segment, index) => (segment.breast === breast ? total + durations[index] : total),
    0,
  );
}

/**
 * Pure calculation of status, closed segments, per-segment durations and totals.
 * Open segments/sessions are measured up to `now`.
 * When there are no segments, the total falls back to the session span.
 */
export function calculateSessionMetrics(input: SessionInput, now: Date): SessionMetrics {
  const segments = closeOpenSegments(input.segments, input.endTime);
  const segmentDurationsSeconds = segments.map((segment) =>
    calculateDurationSeconds(segment.startTime, segment.endTime, now),
  );
  const leftBreastDurationSeconds = sumDurationsByBreast(segments, segmentDurationsSeconds, 'left');
  const rightBreastDurationSeconds = sumDurationsByBreast(segments, segmentDurationsSeconds, 'right');
  const totalDurationSeconds =
    segments.length > 0
      ? leftBreastDurationSeconds + rightBreastDurationSeconds
      : calculateDurationSeconds(input.startTime, input.endTime, now);

  return {
    status: input.endTime === null ? 'in_progress' : 'finished',
    segments,
    segmentDurationsSeconds,
    totalDurationSeconds,
    leftBreastDurationSeconds,
    rightBreastDurationSeconds,
    firstBreast: findFirstBreast(segments),
  };
}

/** Partial update: omitted fields keep their value; an explicit `endTime: null` reopens the session. */
export function applyUpdate(current: SessionInput, update: UpdateBreastfeedingSessionDto): SessionInput {
  const notes = update.notes !== undefined ? update.notes : current.notes;
  const merged: SessionInput = {
    startTime: update.startTime ?? current.startTime,
    endTime: update.endTime !== undefined ? update.endTime : current.endTime,
    segments: update.segments ?? current.segments,
  };
  return notes === undefined ? merged : { ...merged, notes };
}

export function buildSession(params: BuildSessionParams): BreastfeedingSession {
  const { id, babyId, input, createdAt, updatedAt, now } = params;
  const metrics = calculateSessionMetrics(input, now);

  const session: BreastfeedingSession = {
    id,
    babyId,
    startTime: input.startTime,
    endTime: input.endTime,
    status: metrics.status,
    segments: metrics.segments,
    totalDurationSeconds: metrics.totalDurationSeconds,
    leftBreastDurationSeconds: metrics.leftBreastDurationSeconds,
    rightBreastDurationSeconds: metrics.rightBreastDurationSeconds,
    firstBreast: metrics.firstBreast,
    createdAt,
    updatedAt,
  };

  return input.notes === undefined ? session : { ...session, notes: input.notes };
}
