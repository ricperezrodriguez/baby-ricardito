import { notFound, unprocessableEntity } from './errors';
import { isUuid } from './ids';

/** An empty `notes` string clears them (`null`); `undefined` leaves them untouched. */
export function toStoredNotes(notes: string | null | undefined): string | null | undefined {
  return notes === '' ? null : notes;
}

/** 422 when an instant sent by the client is after `now` (epoch milliseconds). */
export function assertNotInFuture(iso: string, now: number, field: string, code: string): void {
  if (Date.parse(iso) > now) {
    throw unprocessableEntity(code, `"${field}" must not be in the future.`);
  }
}

/** Finds a record of a baby or answers 404; an id that is not a UUID cannot exist. */
export async function requireRecord<T>(
  find: (id: string) => Promise<T | null>,
  recordId: string,
  code: string,
  label: string,
): Promise<T> {
  const record = isUuid(recordId) ? await find(recordId) : null;
  if (record === null) {
    throw notFound(code, `${label} "${recordId}" does not exist.`);
  }
  return record;
}
