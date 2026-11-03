import { environment } from '@environments/environment';
import { badRequest } from '@app/core/mocks/mock-backend.errors';

export interface MockReply {
  status: number;
  body: unknown;
}

export interface RecordRoute {
  babyId: string;
  recordId: string | null;
  photo: boolean;
}

export const STATUS_TEXTS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
};

function pathOf(url: string): string {
  return url.slice(environment.apiUrl.length).split('?')[0];
}

/** Matches `/babies/:babyId/...` patterns whose first capture group is the baby id. */
export function matchBabyRoute(url: string, pattern: RegExp): string | null {
  const match = pattern.exec(pathOf(url));
  return match === null ? null : decodeURIComponent(match[1]);
}

/**
 * Matches the records collection of a baby: `pattern` must capture the baby id,
 * the optional record id and the optional `/photo` suffix, in that order.
 */
export function parseRecordRoute(url: string, pattern: RegExp): RecordRoute | null {
  const match = pattern.exec(pathOf(url));
  if (match === null) {
    return null;
  }
  return {
    babyId: decodeURIComponent(match[1]),
    recordId: match[2] === undefined ? null : decodeURIComponent(match[2]),
    photo: match[3] !== undefined,
  };
}

export function parsePageParameter(value: string | null, name: string, defaultValue: number, minimum: number): number {
  if (value === null) {
    return defaultValue;
  }
  if (!/^\d+$/.test(value)) {
    throw badRequest('INVALID_PAGINATION', `"${name}" must be an integer greater than or equal to ${minimum}.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw badRequest('INVALID_PAGINATION', `"${name}" must be an integer greater than or equal to ${minimum}.`);
  }
  return parsed;
}
