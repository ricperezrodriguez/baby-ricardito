import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Clock } from '@app/shared/utils/clock';
import { localDateKey } from '@app/shared/utils/time.utils';
import { Observable } from 'rxjs';

export interface TodayRecordHintOptions {
  /** Clock of the dialog; "today" moves forward with it. */
  clock: Clock;
  /** Instant chosen in the dialog for the new record. */
  chosenAt: () => number;
  /** Whether the hint applies at all (creation mode only). */
  enabled: () => boolean;
}

/** "Already recorded today" notice of a creation dialog. */
export interface TodayRecordHint {
  /** Instant of the latest recorded one; filled by `load()` or by the dialog when it already reads it. */
  readonly latestAt: WritableSignal<number | null>;
  /** Instant to show when both the latest record and the chosen instant are today; `null` otherwise. */
  readonly at: Signal<number | null>;
  /**
   * Reads the latest record in the background (cancelled when the dialog is destroyed).
   * A failure just means no hint: the HTTP error interceptor already reports it.
   */
  load<T>(source: Observable<T | null>, instantOf: (record: T) => number | null): void;
}

/**
 * Non-blocking "already recorded today" notice of the creation dialogs (several records per day are
 * allowed). It is not part of the editable state, so it never counts as a change.
 * Must be called in an injection context; show it with `app-record-today-hint`.
 */
export function createTodayRecordHint(options: TodayRecordHintOptions): TodayRecordHint {
  const destroyRef = inject(DestroyRef);
  const latestAt = signal<number | null>(null);

  const at = computed(() => {
    const latest = latestAt();
    if (!options.enabled() || latest === null) {
      return null;
    }
    const today = localDateKey(options.clock.now());
    return localDateKey(latest) === today && localDateKey(options.chosenAt()) === today
      ? latest
      : null;
  });

  return {
    latestAt,
    at,
    load: (source, instantOf) => {
      source.pipe(takeUntilDestroyed(destroyRef)).subscribe({
        next: (record) => latestAt.set(record === null ? null : instantOf(record)),
        error: () => undefined,
      });
    },
  };
}

/**
 * Live region (`role="status"`) with the "already recorded today" notice:
 * `Hoy ya se registró <subject> a las HH:mm.` Keep it rendered so the announcement is read when it appears.
 */
@Component({
  selector: 'app-record-today-hint',
  imports: [DatePipe],
  host: { role: 'status' },
  styles: `
    :host {
      display: block;
    }

    /* Same look as a \`mat-hint\`, with AA contrast. */
    .hint {
      color: var(--app-muted);
      font-size: 0.875rem;
      margin: 0 0 1rem;
    }
  `,
  template: `
    @if (at(); as recordedAt) {
      <p class="hint">Hoy ya se registró {{ subject() }} a las {{ recordedAt | date: 'HH:mm' }}.</p>
    }
  `,
})
export class RecordTodayHint {
  /** `TodayRecordHint.at()`. */
  readonly at = input.required<number | null>();
  /** Record with its indefinite article, e.g. `una dosis`, `un baño`. */
  readonly subject = input.required<string>();
}
