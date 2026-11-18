import { badRequest, unprocessableEntity } from '@app/core/mocks/mock-backend.errors';
import {
  parseBody,
  parseDaysThresholdBody,
  parseIsoDate,
  parseNotes,
  parseOneOf,
} from '@app/core/mocks/mock-backend.parsing';
import {
  BATH_NOTES_MAX_LENGTH,
  BATH_OVERDUE_ALERT_THRESHOLDS,
  BATH_REACTIONS,
  Bath,
  BathOverdueAlertSettings,
  BathReaction,
  UpdateBathDto,
} from '@app/features/bath/bath.models';

/** Validated content of a bath, before the store adds ids and timestamps. */
export interface BathInput {
  bathedAt: string;
  hairWashed: boolean;
  reaction?: BathReaction;
  notes?: string;
}

function parseHairWashed(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw badRequest('INVALID_HAIR_WASHED', '"hairWashed" must be a boolean.');
  }
  return value;
}

function parseReaction(value: unknown): BathReaction {
  return parseOneOf(value, BATH_REACTIONS, 'INVALID_REACTION', 'reaction');
}

/** Parses the create body; `babyId` is ignored because the URL is the source of truth. */
export function parseCreateBody(body: unknown): BathInput {
  const record = parseBody(body);
  const input: BathInput = {
    bathedAt: parseIsoDate(record['bathedAt'], 'bathedAt'),
    hairWashed: parseHairWashed(record['hairWashed']),
  };
  if (record['reaction'] !== undefined) {
    input.reaction = parseReaction(record['reaction']);
  }
  if (record['notes'] !== undefined) {
    const notes = parseNotes(record['notes'], BATH_NOTES_MAX_LENGTH);
    if (notes !== '') {
      input.notes = notes;
    }
  }
  return input;
}

/** Empty `notes` are normalized to null (clear). */
export function parseUpdateBody(body: unknown): UpdateBathDto {
  const record = parseBody(body);
  const update: UpdateBathDto = {};
  if (record['bathedAt'] !== undefined) {
    update.bathedAt = parseIsoDate(record['bathedAt'], 'bathedAt');
  }
  if (record['hairWashed'] !== undefined) {
    update.hairWashed = parseHairWashed(record['hairWashed']);
  }
  if (record['reaction'] !== undefined) {
    update.reaction = record['reaction'] === null ? null : parseReaction(record['reaction']);
  }
  if (record['notes'] !== undefined) {
    const notes =
      record['notes'] === null ? '' : parseNotes(record['notes'], BATH_NOTES_MAX_LENGTH);
    update.notes = notes === '' ? null : notes;
  }
  return update;
}

/** Partial update: omitted fields keep their value; null `reaction` or `notes` clears them. */
export function applyUpdate(current: Bath, update: UpdateBathDto): BathInput {
  const merged: BathInput = {
    bathedAt: update.bathedAt ?? current.bathedAt,
    hairWashed: update.hairWashed ?? current.hairWashed,
  };
  const reaction = update.reaction === null ? undefined : (update.reaction ?? current.reaction);
  if (reaction !== undefined) {
    merged.reaction = reaction;
  }
  const notes = update.notes === undefined ? current.notes : (update.notes ?? undefined);
  if (notes !== undefined) {
    merged.notes = notes;
  }
  return merged;
}

/** Business rules that depend on the clock (422). `now` is epoch milliseconds. */
export function assertValidBath(input: BathInput, now: number): void {
  if (Date.parse(input.bathedAt) > now) {
    throw unprocessableEntity('BATHED_AT_IN_FUTURE', '"bathedAt" must not be in the future.');
  }
}

/** Validates the body of the overdue alert update. */
export function parseOverdueAlertBody(body: unknown): BathOverdueAlertSettings {
  return parseDaysThresholdBody(body, BATH_OVERDUE_ALERT_THRESHOLDS);
}
