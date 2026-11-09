import { badRequest, unprocessableEntity } from '@app/core/mocks/mock-backend.errors';
import {
  isRecord,
  parseBody,
  parseIsoDate,
  parseNotes,
} from '@app/core/mocks/mock-backend.parsing';
import {
  NAIL_AREAS,
  NAIL_TRIM_NOTES_MAX_LENGTH,
  NAIL_TRIM_OVERDUE_ALERT_THRESHOLDS,
  NailTrim,
  NailTrimArea,
  NailTrimOverdueAlertSettings,
  UpdateNailTrimDto,
} from '@app/features/nail-trimming/nail-trimming.models';

/** Validated content of a trim, before the store adds ids and timestamps. */
export interface NailTrimInput {
  trimmedAt: string;
  areas: NailTrimArea[];
  notes?: string;
}

/** Non-empty list of known zones without duplicates; returned in `NAIL_AREAS` order. */
function parseAreas(value: unknown): NailTrimArea[] {
  const isArea = (candidate: unknown): candidate is NailTrimArea =>
    NAIL_AREAS.some((area) => area === candidate);
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every(isArea) ||
    new Set(value).size !== value.length
  ) {
    throw badRequest(
      'INVALID_AREAS',
      `"areas" must be a non-empty array without duplicates with any of: ${NAIL_AREAS.join(', ')}.`,
    );
  }
  return NAIL_AREAS.filter((area) => value.includes(area));
}

/** Parses the create body; `babyId` is ignored because the URL is the source of truth. */
export function parseCreateBody(body: unknown): NailTrimInput {
  const record = parseBody(body);
  const input: NailTrimInput = {
    trimmedAt: parseIsoDate(record['trimmedAt'], 'trimmedAt'),
    areas: parseAreas(record['areas']),
  };
  if (record['notes'] !== undefined) {
    const notes = parseNotes(record['notes'], NAIL_TRIM_NOTES_MAX_LENGTH);
    if (notes !== '') {
      input.notes = notes;
    }
  }
  return input;
}

/** Empty `notes` are normalized to null (clear). */
export function parseUpdateBody(body: unknown): UpdateNailTrimDto {
  const record = parseBody(body);
  const update: UpdateNailTrimDto = {};
  if (record['trimmedAt'] !== undefined) {
    update.trimmedAt = parseIsoDate(record['trimmedAt'], 'trimmedAt');
  }
  if (record['areas'] !== undefined) {
    update.areas = parseAreas(record['areas']);
  }
  if (record['notes'] !== undefined) {
    const notes =
      record['notes'] === null ? '' : parseNotes(record['notes'], NAIL_TRIM_NOTES_MAX_LENGTH);
    update.notes = notes === '' ? null : notes;
  }
  return update;
}

/** Partial update: omitted fields keep their value; `areas` is replaced as a whole; null `notes` clears them. */
export function applyUpdate(current: NailTrim, update: UpdateNailTrimDto): NailTrimInput {
  const merged: NailTrimInput = {
    trimmedAt: update.trimmedAt ?? current.trimmedAt,
    areas: update.areas ?? current.areas,
  };
  const notes = update.notes === undefined ? current.notes : (update.notes ?? undefined);
  if (notes !== undefined) {
    merged.notes = notes;
  }
  return merged;
}

/** Business rules that depend on the clock (422). `now` is epoch milliseconds. */
export function assertValidTrim(input: NailTrimInput, now: number): void {
  if (Date.parse(input.trimmedAt) > now) {
    throw unprocessableEntity('TRIMMED_AT_IN_FUTURE', '"trimmedAt" must not be in the future.');
  }
}

/** Validates the body of the overdue alert update. */
export function parseOverdueAlertBody(body: unknown): NailTrimOverdueAlertSettings {
  const enabled = isRecord(body) ? body['enabled'] : null;
  const thresholdDays = isRecord(body) ? body['thresholdDays'] : null;
  const threshold = NAIL_TRIM_OVERDUE_ALERT_THRESHOLDS.find((allowed) => allowed === thresholdDays);
  if (typeof enabled !== 'boolean' || threshold === undefined) {
    throw badRequest(
      'INVALID_PREFERENCES',
      `"enabled" must be a boolean and "thresholdDays" one of: ${NAIL_TRIM_OVERDUE_ALERT_THRESHOLDS.join(', ')}.`,
    );
  }
  return { enabled, thresholdDays: threshold };
}
