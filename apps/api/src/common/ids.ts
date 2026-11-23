const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Record ids are UUIDs; anything else cannot exist, so it must answer 404 instead of reaching the database. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
