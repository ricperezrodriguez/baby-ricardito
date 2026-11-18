import {
  DIAPER_NOTES_MAX_LENGTH,
  DIAPER_POOP_ALERT_THRESHOLDS,
  DIAPER_TYPE,
  DIAPER_TYPES,
  DiaperChange,
  DiaperPoopAlertSettings,
  DiaperType,
  STOOL_COLORS,
  STOOL_CONSISTENCIES,
  StoolColor,
  StoolConsistency,
  UpdateDiaperChangeDto,
} from '@app/features/diaper/diaper.models';
import { PHOTO_UPLOAD_FIELD } from '@app/features/shared/tracker.models';
import { badRequest, unprocessableEntity } from '@app/core/mocks/mock-backend.errors';
import { isRecord, parseBody, parseIsoDate, parseNotes, parseOneOf } from '@app/core/mocks/mock-backend.parsing';
import { parsePhotoFile } from '@app/core/mocks/mock-backend.photos';

/** Validated content of a change, before the store adds ids and timestamps. */
export interface DiaperChangeInput {
  changedAt: string;
  type: DiaperType;
  stoolColor: StoolColor | null;
  stoolConsistency: StoolConsistency | null;
  hasRash: boolean;
  notes?: string;
  photoUrl?: string | null;
}

function parseType(value: unknown): DiaperType {
  return parseOneOf(value, DIAPER_TYPES, 'INVALID_DIAPER_TYPE', 'type');
}

function parseStoolColor(value: unknown): StoolColor | null {
  return value === null ? null : parseOneOf(value, STOOL_COLORS, 'INVALID_STOOL_COLOR', 'stoolColor');
}

function parseStoolConsistency(value: unknown): StoolConsistency | null {
  return value === null
    ? null
    : parseOneOf(value, STOOL_CONSISTENCIES, 'INVALID_STOOL_CONSISTENCY', 'stoolConsistency');
}

function parseHasRash(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw badRequest('INVALID_HAS_RASH', '"hasRash" must be a boolean.');
  }
  return value;
}

function withNotes(input: DiaperChangeInput, notes: string | undefined): DiaperChangeInput {
  return notes === undefined ? input : { ...input, notes };
}

/** Parses the create body; `babyId` is ignored because the URL is the source of truth. */
export function parseCreateBody(body: unknown): DiaperChangeInput {
  const record = parseBody(body);
  const notes = record['notes'];
  const input: DiaperChangeInput = {
    changedAt: parseIsoDate(record['changedAt'], 'changedAt'),
    type: parseType(record['type']),
    stoolColor: parseStoolColor(record['stoolColor'] ?? null),
    stoolConsistency: parseStoolConsistency(record['stoolConsistency'] ?? null),
    hasRash: record['hasRash'] === undefined ? false : parseHasRash(record['hasRash']),
  };
  return withNotes(input, notes === undefined ? undefined : parseNotes(notes, DIAPER_NOTES_MAX_LENGTH));
}

export function parseUpdateBody(body: unknown): UpdateDiaperChangeDto {
  const record = parseBody(body);
  const update: UpdateDiaperChangeDto = {};
  if (record['changedAt'] !== undefined) {
    update.changedAt = parseIsoDate(record['changedAt'], 'changedAt');
  }
  if (record['type'] !== undefined) {
    update.type = parseType(record['type']);
  }
  if (record['stoolColor'] !== undefined) {
    update.stoolColor = parseStoolColor(record['stoolColor']);
  }
  if (record['stoolConsistency'] !== undefined) {
    update.stoolConsistency = parseStoolConsistency(record['stoolConsistency']);
  }
  if (record['hasRash'] !== undefined) {
    update.hasRash = parseHasRash(record['hasRash']);
  }
  if (record['notes'] !== undefined) {
    update.notes = parseNotes(record['notes'], DIAPER_NOTES_MAX_LENGTH);
  }
  return update;
}

/** Partial update: omitted fields keep their value (nothing is cleared implicitly). */
export function applyUpdate(current: DiaperChange, update: UpdateDiaperChangeDto): DiaperChangeInput {
  const merged: DiaperChangeInput = {
    changedAt: update.changedAt ?? current.changedAt,
    type: update.type ?? current.type,
    stoolColor: update.stoolColor !== undefined ? update.stoolColor : current.stoolColor,
    stoolConsistency: update.stoolConsistency !== undefined ? update.stoolConsistency : current.stoolConsistency,
    hasRash: update.hasRash ?? current.hasRash,
  };
  const withCurrentNotes = withNotes(merged, update.notes !== undefined ? update.notes : current.notes);
  return current.photoUrl === undefined ? withCurrentNotes : { ...withCurrentNotes, photoUrl: current.photoUrl };
}

/** Business rules that depend on several fields (422). `now` is epoch milliseconds. */
export function assertValidChange(input: DiaperChangeInput, now: number): void {
  if (Date.parse(input.changedAt) > now) {
    throw unprocessableEntity('CHANGED_AT_IN_FUTURE', '"changedAt" must not be in the future.');
  }
  const hasStoolDetails = input.stoolColor !== null || input.stoolConsistency !== null;
  if (input.type === DIAPER_TYPE.WET && hasStoolDetails) {
    throw unprocessableEntity(
      'STOOL_DETAILS_NOT_ALLOWED',
      '"stoolColor" and "stoolConsistency" are not allowed for a wet diaper.',
    );
  }
}

/** Parses the repeated `type` query parameter of the list endpoint. */
export function parseTypeFilter(values: string[]): DiaperType[] {
  return [...new Set(values.map((value) => parseOneOf(value, DIAPER_TYPES, 'INVALID_DIAPER_TYPE', 'type')))];
}

export function parsePhotoBody(body: unknown): File {
  return parsePhotoFile(body, PHOTO_UPLOAD_FIELD);
}

/** Validates the body of the poop alert update. */
export function parsePoopAlertBody(body: unknown): DiaperPoopAlertSettings {
  const enabled = isRecord(body) ? body['enabled'] : null;
  const thresholdHours = isRecord(body) ? body['thresholdHours'] : null;
  const threshold = DIAPER_POOP_ALERT_THRESHOLDS.find((allowed) => allowed === thresholdHours);
  if (typeof enabled !== 'boolean' || threshold === undefined) {
    throw badRequest(
      'INVALID_PREFERENCES',
      `"enabled" must be a boolean and "thresholdHours" one of: ${DIAPER_POOP_ALERT_THRESHOLDS.join(', ')}.`,
    );
  }
  return { enabled, thresholdHours: threshold };
}
