import {
  BOTTLE_AMOUNT_MAX_ML,
  BOTTLE_AMOUNT_MIN_ML,
  BOTTLE_MILK_TYPES,
  BOTTLE_NOTES_MAX_LENGTH,
  BottleFeed,
  BottleMilkType,
  UpdateBottleFeedDto,
} from '@app/features/bottle/bottle.models';
import { badRequest, unprocessableEntity } from '@app/core/mocks/mock-backend.errors';
import { parseBody, parseIsoDate, parseNotes, parseOneOf } from '@app/core/mocks/mock-backend.parsing';

/** Validated content of a feed, before the store adds ids and timestamps. */
export interface BottleFeedInput {
  fedAt: string;
  amountMl: number;
  milkType: BottleMilkType;
  notes?: string;
}

function parseAmount(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < BOTTLE_AMOUNT_MIN_ML ||
    value > BOTTLE_AMOUNT_MAX_ML
  ) {
    throw badRequest(
      'INVALID_AMOUNT',
      `"amountMl" must be an integer between ${BOTTLE_AMOUNT_MIN_ML} and ${BOTTLE_AMOUNT_MAX_ML}.`,
    );
  }
  return value;
}

function parseMilkType(value: unknown): BottleMilkType {
  return parseOneOf(value, BOTTLE_MILK_TYPES, 'INVALID_MILK_TYPE', 'milkType');
}

function withNotes(input: BottleFeedInput, notes: string | undefined): BottleFeedInput {
  return notes === undefined ? input : { ...input, notes };
}

/** Parses the create body; `babyId` is ignored because the URL is the source of truth. */
export function parseCreateBody(body: unknown): BottleFeedInput {
  const record = parseBody(body);
  const notes = record['notes'];
  const input: BottleFeedInput = {
    fedAt: parseIsoDate(record['fedAt'], 'fedAt'),
    amountMl: parseAmount(record['amountMl']),
    milkType: parseMilkType(record['milkType']),
  };
  return withNotes(input, notes === undefined ? undefined : parseNotes(notes, BOTTLE_NOTES_MAX_LENGTH));
}

export function parseUpdateBody(body: unknown): UpdateBottleFeedDto {
  const record = parseBody(body);
  const update: UpdateBottleFeedDto = {};
  if (record['fedAt'] !== undefined) {
    update.fedAt = parseIsoDate(record['fedAt'], 'fedAt');
  }
  if (record['amountMl'] !== undefined) {
    update.amountMl = parseAmount(record['amountMl']);
  }
  if (record['milkType'] !== undefined) {
    update.milkType = parseMilkType(record['milkType']);
  }
  if (record['notes'] !== undefined) {
    update.notes = parseNotes(record['notes'], BOTTLE_NOTES_MAX_LENGTH);
  }
  return update;
}

/** Partial update: omitted fields keep their value. */
export function applyUpdate(current: BottleFeed, update: UpdateBottleFeedDto): BottleFeedInput {
  const merged: BottleFeedInput = {
    fedAt: update.fedAt ?? current.fedAt,
    amountMl: update.amountMl ?? current.amountMl,
    milkType: update.milkType ?? current.milkType,
  };
  return withNotes(merged, update.notes ?? current.notes);
}

/** Business rules that depend on the clock (422). `now` is epoch milliseconds. */
export function assertValidFeed(input: BottleFeedInput, now: number): void {
  if (Date.parse(input.fedAt) > now) {
    throw unprocessableEntity('FED_AT_IN_FUTURE', '"fedAt" must not be in the future.');
  }
}

/** Parses the repeated `milkType` query parameter of the list endpoint. */
export function parseMilkTypeFilter(values: string[]): BottleMilkType[] {
  return [...new Set(values.map((value) => parseMilkType(value)))];
}
