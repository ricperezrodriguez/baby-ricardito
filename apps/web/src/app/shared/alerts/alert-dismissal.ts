import { signal } from '@angular/core';
import { readLocalStorageJson, writeLocalStorageJson } from '@app/shared/utils/local-storage';

/** What the user dismissed: the alert stays hidden for that local day and that fingerprint only. */
interface StoredDismissal {
  /** Local day of the dismissal, `yyyy-MM-dd` */
  date: string;
  fingerprint: string;
}

export interface AlertDismissal {
  /**
   * Whether the alert is dismissed. It reads a signal, so it is reactive inside `computed`/templates.
   * Dismissed until the next local day, or until a different `fingerprint` triggers the alert.
   */
  isDismissed(fingerprint: string, today: string): boolean;
  /** Dismisses the alert for `today` and this `fingerprint`, and remembers it on this device. */
  dismiss(fingerprint: string, today: string): void;
}

function isStoredDismissal(value: unknown): value is StoredDismissal {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { date, fingerprint } = value as Record<string, unknown>;
  return typeof date === 'string' && typeof fingerprint === 'string';
}

/**
 * Dismissal of one alert for one baby, kept in `localStorage` (per device, best effort).
 * `fingerprint` identifies the fact that triggered the alert (e.g. the id and time of the last
 * poop), so a new fact shows the alert again even on the same day.
 */
export function createAlertDismissal(alertId: string, babyId: string): AlertDismissal {
  const storageKey = `alert-dismissal:${alertId}:${babyId}`;
  const stored = signal<StoredDismissal | null>(readLocalStorageJson(storageKey, isStoredDismissal));

  return {
    isDismissed: (fingerprint, today) => {
      const dismissal = stored();
      return dismissal !== null && dismissal.date === today && dismissal.fingerprint === fingerprint;
    },
    dismiss: (fingerprint, today) => {
      const dismissal: StoredDismissal = { date: today, fingerprint };
      writeLocalStorageJson(storageKey, dismissal);
      stored.set(dismissal);
    },
  };
}
