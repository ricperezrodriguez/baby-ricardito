/** A unique index failed (e.g. the partial indexes that allow one open session per baby) under a race. */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
