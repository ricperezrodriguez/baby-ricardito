import { DestroyRef, inject, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

export interface Clock {
  /** Current time in epoch milliseconds, refreshed on every tick. */
  readonly now: Signal<number>;
  /** Updates `now` immediately and returns the new value. */
  refresh(): number;
}

/** Creates a signal-based clock that ticks every `tickMs`. Must be called in an injection context. */
export function createClock(tickMs = 1_000): Clock {
  const now = signal(Date.now());
  const refresh = (): number => {
    const value = Date.now();
    now.set(value);
    return value;
  };

  interval(tickMs)
    .pipe(takeUntilDestroyed(inject(DestroyRef)))
    .subscribe(refresh);

  return { now: now.asReadonly(), refresh };
}
