import { computed, linkedSignal, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

export interface HiddenCharts<Id extends string> {
  /** Charts the user hid; saved in the backend. */
  readonly hidden: Signal<Id[]>;
  /** Charts to show, in the order of `ids`. */
  readonly visible: Signal<Id[]>;
  /** False while the stored preference loads, so the chips do not flash the wrong state. */
  readonly ready: Signal<boolean>;
  /** Updates the UI at once and rolls back if saving fails. */
  setVisible(id: Id, visible: boolean): void;
}

/**
 * Hidden-charts preference of a history page: loaded from the backend, updated optimistically and
 * rolled back on error. Must be called in an injection context.
 */
export function createHiddenCharts<Id extends string>(
  ids: readonly Id[],
  load: () => Observable<{ hiddenCharts: Id[] }>,
  save: (hiddenCharts: Id[]) => Observable<unknown>,
): HiddenCharts<Id> {
  const preferences = rxResource({ stream: () => load() });
  const hidden = linkedSignal<Id[]>(() => preferences.value()?.hiddenCharts ?? []);

  return {
    hidden,
    visible: computed(() => ids.filter((id) => !hidden().includes(id))),
    ready: computed(() => !preferences.isLoading()),
    setVisible: (id, visible) => {
      const previous = hidden();
      const next = visible ? previous.filter((hiddenId) => hiddenId !== id) : [...new Set([...previous, id])];
      if (next.length === previous.length) {
        return;
      }

      hidden.set(next);
      save(next).subscribe({
        // The HTTP error interceptor reports the failure; the choice goes back to what is stored.
        error: () => hidden.set(previous),
      });
    },
  };
}
