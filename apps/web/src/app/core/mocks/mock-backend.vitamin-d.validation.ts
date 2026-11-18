import {
  UpdateVitaminDDoseDto,
  VITAMIN_D_DROPS_MAX,
  VITAMIN_D_DROPS_MIN,
  VITAMIN_D_MISSED_ALERT_THRESHOLDS,
  VITAMIN_D_NOTES_MAX_LENGTH,
  VitaminDDose,
  VitaminDMissedAlertSettings,
} from '@app/features/vitamin-d/vitamin-d.models';
import { badRequest, unprocessableEntity } from '@app/core/mocks/mock-backend.errors';
import { isRecord, parseBody, parseIsoDate, parseNotes } from '@app/core/mocks/mock-backend.parsing';

/** Validated content of a dose, before the store adds ids and timestamps. */
export interface VitaminDDoseInput {
  givenAt: string;
  drops?: number;
  notes?: string;
}

function parseDrops(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < VITAMIN_D_DROPS_MIN ||
    value > VITAMIN_D_DROPS_MAX
  ) {
    throw badRequest(
      'INVALID_DROPS',
      `"drops" must be an integer between ${VITAMIN_D_DROPS_MIN} and ${VITAMIN_D_DROPS_MAX}.`,
    );
  }
  return value;
}

/** Parses the create body; `babyId` is ignored because the URL is the source of truth. */
export function parseCreateBody(body: unknown): VitaminDDoseInput {
  const record = parseBody(body);
  const { drops, notes } = record;
  const input: VitaminDDoseInput = { givenAt: parseIsoDate(record['givenAt'], 'givenAt') };
  if (drops !== undefined && drops !== null) {
    input.drops = parseDrops(drops);
  }
  if (notes !== undefined) {
    input.notes = parseNotes(notes, VITAMIN_D_NOTES_MAX_LENGTH);
  }
  return input;
}

export function parseUpdateBody(body: unknown): UpdateVitaminDDoseDto {
  const record = parseBody(body);
  const update: UpdateVitaminDDoseDto = {};
  if (record['givenAt'] !== undefined) {
    update.givenAt = parseIsoDate(record['givenAt'], 'givenAt');
  }
  if (record['drops'] !== undefined) {
    update.drops = record['drops'] === null ? null : parseDrops(record['drops']);
  }
  if (record['notes'] !== undefined) {
    update.notes = parseNotes(record['notes'], VITAMIN_D_NOTES_MAX_LENGTH);
  }
  return update;
}

/** Partial update: omitted fields keep their value; `drops: null` clears the drops. */
export function applyUpdate(current: VitaminDDose, update: UpdateVitaminDDoseDto): VitaminDDoseInput {
  const merged: VitaminDDoseInput = { givenAt: update.givenAt ?? current.givenAt };
  const drops = update.drops === undefined ? current.drops : (update.drops ?? undefined);
  const notes = update.notes ?? current.notes;
  if (drops !== undefined) {
    merged.drops = drops;
  }
  if (notes !== undefined) {
    merged.notes = notes;
  }
  return merged;
}

/** Business rules that depend on the clock (422). `now` is epoch milliseconds. */
export function assertValidDose(input: VitaminDDoseInput, now: number): void {
  if (Date.parse(input.givenAt) > now) {
    throw unprocessableEntity('GIVEN_AT_IN_FUTURE', '"givenAt" must not be in the future.');
  }
}

/** Validates the body of the missed-dose alert update. */
export function parseMissedAlertBody(body: unknown): VitaminDMissedAlertSettings {
  const enabled = isRecord(body) ? body['enabled'] : null;
  const thresholdHours = isRecord(body) ? body['thresholdHours'] : null;
  const threshold = VITAMIN_D_MISSED_ALERT_THRESHOLDS.find((allowed) => allowed === thresholdHours);
  if (typeof enabled !== 'boolean' || threshold === undefined) {
    throw badRequest(
      'INVALID_PREFERENCES',
      `"enabled" must be a boolean and "thresholdHours" one of: ${VITAMIN_D_MISSED_ALERT_THRESHOLDS.join(', ')}.`,
    );
  }
  return { enabled, thresholdHours: threshold };
}
