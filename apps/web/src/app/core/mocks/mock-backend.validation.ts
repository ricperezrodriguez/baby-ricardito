import {
  BREAST_SIDE,
  BREASTFEEDING_PHOTO_FIELD,
  Breast,
  UpdateBreastfeedingSessionDto,
} from '@app/features/breastfeeding/breastfeeding.models';
import { closeOpenSegments, SegmentInput, SessionInput } from '@app/core/mocks/mock-backend.calculations';
import { badRequest, unprocessableEntity } from '@app/core/mocks/mock-backend.errors';
import {
  isRecord,
  parseBody,
  parseIsoDate,
  parseNotes,
  parseNullableIsoDate,
} from '@app/core/mocks/mock-backend.parsing';
import { parsePhotoFile } from '@app/core/mocks/mock-backend.photos';

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

/** Parses the multipart body of the photo upload and returns the file. */
export function parsePhotoBody(body: unknown): File {
  return parsePhotoFile(body, BREASTFEEDING_PHOTO_FIELD);
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
