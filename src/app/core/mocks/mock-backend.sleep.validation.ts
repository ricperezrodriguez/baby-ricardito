import {
  SLEEP_NOTES_MAX_LENGTH,
  UpdateSleepSessionDto,
} from '@app/features/sleep/sleep.models';
import { badRequest, conflict, unprocessableEntity } from '@app/core/mocks/mock-backend.errors';
import {
  isRecord,
  parseBody,
  parseIsoDate,
  parseNotes,
  parseNullableIsoDate,
} from '@app/core/mocks/mock-backend.parsing';

/** Validated content of a sleep, before the store adds ids and timestamps. */
export interface SleepSessionInput {
  startTime: string;
  /** null = ongoing */
  endTime: string | null;
  notes?: string;
}

/** A sleep as the mock store keeps it (status and duration are derived on every read). */
export interface StoredSleepSession extends SleepSessionInput {
  id: string;
  babyId: string;
  createdAt: string;
  updatedAt: string;
}

function withNotes(input: SleepSessionInput, notes: string | undefined): SleepSessionInput {
  return notes === undefined ? input : { ...input, notes };
}

/** Parses the create body; `babyId` is ignored because the URL is the source of truth. */
export function parseCreateBody(body: unknown): SleepSessionInput {
  const record = parseBody(body);
  const notes = record['notes'];
  const input: SleepSessionInput = {
    startTime: parseIsoDate(record['startTime'], 'startTime'),
    endTime: parseNullableIsoDate(record['endTime'] ?? null, 'endTime'),
  };
  return withNotes(input, notes === undefined ? undefined : parseNotes(notes, SLEEP_NOTES_MAX_LENGTH));
}

export function parseUpdateBody(body: unknown): UpdateSleepSessionDto {
  const record = parseBody(body);
  const update: UpdateSleepSessionDto = {};
  if (record['startTime'] !== undefined) {
    update.startTime = parseIsoDate(record['startTime'], 'startTime');
  }
  if (record['endTime'] !== undefined) {
    update.endTime = parseNullableIsoDate(record['endTime'], 'endTime');
  }
  if (record['notes'] !== undefined) {
    update.notes = parseNotes(record['notes'], SLEEP_NOTES_MAX_LENGTH);
  }
  return update;
}

/** Partial update: omitted fields keep their value; an explicit `endTime: null` reopens the sleep. */
export function applyUpdate(current: StoredSleepSession, update: UpdateSleepSessionDto): SleepSessionInput {
  const merged: SleepSessionInput = {
    startTime: update.startTime ?? current.startTime,
    endTime: update.endTime !== undefined ? update.endTime : current.endTime,
  };
  return withNotes(merged, update.notes !== undefined ? update.notes : current.notes);
}

/** Rules of a single sleep (422). `now` is epoch milliseconds. */
export function assertValidSleep(input: SleepSessionInput, now: number): void {
  const start = Date.parse(input.startTime);
  if (start > now) {
    throw unprocessableEntity('START_IN_FUTURE', '"startTime" must not be in the future.');
  }
  if (input.endTime === null) {
    return;
  }
  const end = Date.parse(input.endTime);
  if (end > now) {
    throw unprocessableEntity('END_IN_FUTURE', '"endTime" must not be in the future.');
  }
  if (end <= start) {
    throw unprocessableEntity('END_BEFORE_START', '"endTime" must be later than "startTime".');
  }
}

function endOf(sleep: SleepSessionInput): number {
  return sleep.endTime === null ? Number.POSITIVE_INFINITY : Date.parse(sleep.endTime);
}

/** Rules that depend on the other sleeps of the baby (409): one ongoing sleep at most and no overlaps. */
export function assertNoConflicts(input: SleepSessionInput, others: readonly SleepSessionInput[]): void {
  if (input.endTime === null && others.some((other) => other.endTime === null)) {
    throw conflict('SLEEP_IN_PROGRESS', 'There is already a sleep in progress.');
  }
  const start = Date.parse(input.startTime);
  const end = endOf(input);
  if (others.some((other) => start < endOf(other) && Date.parse(other.startTime) < end)) {
    throw conflict('SLEEP_OVERLAP', 'The sleep overlaps another sleep of the baby.');
  }
}

/** Validates the body of an alert settings update against its allowed thresholds. */
export function parseAlertBody<T extends number>(
  body: unknown,
  allowedThresholds: readonly T[],
): { enabled: boolean; thresholdHours: T } {
  const enabled = isRecord(body) ? body['enabled'] : null;
  const thresholdHours = isRecord(body) ? body['thresholdHours'] : null;
  const threshold = allowedThresholds.find((allowed) => allowed === thresholdHours);
  if (typeof enabled !== 'boolean' || threshold === undefined) {
    throw badRequest(
      'INVALID_PREFERENCES',
      `"enabled" must be a boolean and "thresholdHours" one of: ${allowedThresholds.join(', ')}.`,
    );
  }
  return { enabled, thresholdHours: threshold };
}
