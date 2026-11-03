/** Reads a JSON value from `localStorage`; `null` when it is missing, corrupt, invalid or storage is unavailable. */
export function readLocalStorageJson<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return null;
    }

    const value: unknown = JSON.parse(raw);
    return isValid(value) ? value : null;
  } catch {
    return null;
  }
}

/** Writes a JSON value to `localStorage`; storage failures (private mode, quota) are ignored. */
export function writeLocalStorageJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is best effort.
  }
}
