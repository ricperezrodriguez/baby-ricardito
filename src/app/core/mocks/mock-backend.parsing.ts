import { badRequest } from '@app/core/mocks/mock-backend.errors';

const ISO_DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
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

export function parseNullableIsoDate(value: unknown, field: string): string | null {
  return value === null ? null : parseIsoDate(value, field);
}

/** Validates the notes; `maxLength` is optional (no limit when omitted). */
export function parseNotes(value: unknown, maxLength?: number): string {
  if (typeof value !== 'string') {
    throw badRequest('INVALID_NOTES', '"notes" must be a string.');
  }
  if (maxLength !== undefined && value.length > maxLength) {
    throw badRequest('INVALID_NOTES', `"notes" must not be longer than ${maxLength} characters.`);
  }
  return value;
}

export function parseBody(body: unknown): Record<string, unknown> {
  if (!isRecord(body)) {
    throw badRequest('INVALID_BODY', 'The request body must be a JSON object.');
  }
  return body;
}

/** Validates that `value` is one of `allowed`; `code` is the error code used otherwise. */
export function parseOneOf<T extends string>(value: unknown, allowed: readonly T[], code: string, field: string): T {
  const found = allowed.find((candidate) => candidate === value);
  if (found === undefined) {
    throw badRequest(code, `"${field}" must be one of: ${allowed.join(', ')}.`);
  }
  return found;
}

/** Validates the body of a history-preferences update and removes duplicated charts. */
export function parseHiddenChartsBody<T extends string>(body: unknown, validIds: readonly T[]): { hiddenCharts: T[] } {
  const hidden = isRecord(body) ? body['hiddenCharts'] : null;
  const isChartId = (value: unknown): value is T => validIds.some((id) => id === value);
  if (!Array.isArray(hidden) || !hidden.every(isChartId)) {
    throw badRequest('INVALID_PREFERENCES', `"hiddenCharts" must be an array with any of: ${validIds.join(', ')}.`);
  }
  return { hiddenCharts: [...new Set(hidden)] };
}
