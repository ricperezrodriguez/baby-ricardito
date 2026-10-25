import {
  BREAST_SIDE,
  Breast,
  UpdateBreastfeedingSessionDto,
} from '@app/features/breastfeeding/breastfeeding.models';
import { closeOpenSegments, SegmentInput, SessionInput } from '@app/core/mocks/mock-backend.calculations';
import { badRequest, unprocessableEntity } from '@app/core/mocks/mock-backend.errors';

const ISO_DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasValidCalendarDay(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Validates an ISO 8601 string and normalizes it to UTC. */
export function parseIsoDate(value: unknown, field: string): string {
  const match = typeof value === 'string' ? ISO_DATE_PATTERN.exec(value) : null;
  if (typeof value !== 'string' || match === null) {
    throw badRequest('INVALID_DATE_FORMAT', `"${field}" must be an ISO 8601 date string.`);
  }
  const [, year, month, day] = match;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp) || !hasValidCalendarDay(Number(year), Number(month), Number(day))) {
    throw badRequest('INVALID_DATE_FORMAT', `"${field}" is not a valid date.`);
  }
  return new Date(timestamp).toISOString();
}

function parseNullableIsoDate(value: unknown, field: string): string | null {
  return value === null ? null : parseIsoDate(value, field);
}

function parseBreast(value: unknown, field: string): Breast {
  if (value !== BREAST_SIDE.LEFT && value !== BREAST_SIDE.RIGHT) {
    throw badRequest('INVALID_BREAST', `"${field}" must be 'left' or 'right'.`);
  }
  return value;
}

function parseSegment(value: unknown, index: number): SegmentInput {
  const field = `segments[${index}]`;
  if (!isRecord(value)) {
    throw badRequest('INVALID_SEGMENT', `"${field}" must be an object.`);
  }
  return {
    breast: parseBreast(value['breast'], `${field}.breast`),
    startTime: parseIsoDate(value['startTime'], `${field}.startTime`),
    endTime: parseNullableIsoDate(value['endTime'] ?? null, `${field}.endTime`),
  };
}

function parseSegments(value: unknown): SegmentInput[] {
  if (!Array.isArray(value)) {
    throw badRequest('INVALID_SEGMENTS', '"segments" must be an array.');
  }
  return value.map((segment: unknown, index) => parseSegment(segment, index));
}

function parseNotes(value: unknown): string {
  if (typeof value !== 'string') {
    throw badRequest('INVALID_NOTES', '"notes" must be a string.');
  }
  return value;
}

function parseBody(body: unknown): Record<string, unknown> {
  if (!isRecord(body)) {
    throw badRequest('INVALID_BODY', 'The request body must be a JSON object.');
  }
  return body;
}

/** Parses the create body; `babyId` is ignored because the URL is the source of truth. */
export function parseCreateBody(body: unknown): SessionInput {
  const record = parseBody(body);
  const notes = record['notes'];
  const input: SessionInput = {
    startTime: parseIsoDate(record['startTime'], 'startTime'),
    endTime: parseNullableIsoDate(record['endTime'] ?? null, 'endTime'),
    segments: record['segments'] === undefined ? [] : parseSegments(record['segments']),
  };
  return notes === undefined ? input : { ...input, notes: parseNotes(notes) };
}

export function parseUpdateBody(body: unknown): UpdateBreastfeedingSessionDto {
  const record = parseBody(body);
  const update: UpdateBreastfeedingSessionDto = {};
  if (record['startTime'] !== undefined) {
    update.startTime = parseIsoDate(record['startTime'], 'startTime');
  }
  if (record['endTime'] !== undefined) {
    update.endTime = parseNullableIsoDate(record['endTime'], 'endTime');
  }
  if (record['segments'] !== undefined) {
    update.segments = parseSegments(record['segments']);
  }
  if (record['notes'] !== undefined) {
    update.notes = parseNotes(record['notes']);
  }
  return update;
}

function isBefore(a: string, b: string): boolean {
  return new Date(a).getTime() < new Date(b).getTime();
}

export function assertChronology(input: SessionInput): void {
  if (input.endTime !== null && isBefore(input.endTime, input.startTime)) {
    throw unprocessableEntity('END_BEFORE_START', '"endTime" must not be earlier than "startTime".');
  }
  closeOpenSegments(input.segments, input.endTime).forEach((segment, index) => {
    if (segment.endTime !== null && isBefore(segment.endTime, segment.startTime)) {
      throw unprocessableEntity(
        'SEGMENT_END_BEFORE_START',
        `"segments[${index}].endTime" must not be earlier than its "startTime".`,
      );
    }
  });
}
