import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, map, Observable, of, switchMap } from 'rxjs';

/** Load state of the most recent record shown on a Home card. */
export type LatestRecord<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'loaded'; data: T }
  | { status: 'error' };

export interface LatestRecordSource<T> {
  readonly state: Signal<LatestRecord<T>>;
  /** Loads again; the previous value stays visible until the new one arrives. */
  reload(): void;
}

/**
 * Loads the latest record on creation and on every `reload()`. `load` emits `null` when there is
 * no record yet. Must be called in an injection context.
 */
export function createLatestRecord<T>(load: () => Observable<T | null>): LatestRecordSource<T> {
  const reload$ = new BehaviorSubject<void>(undefined);
  const state = toSignal(
    reload$.pipe(
      switchMap(() =>
        load().pipe(
          map((data): LatestRecord<T> => (data === null ? { status: 'empty' } : { status: 'loaded', data })),
          catchError(() => of<LatestRecord<T>>({ status: 'error' })),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as LatestRecord<T> },
  );

  return { state, reload: () => reload$.next() };
}
