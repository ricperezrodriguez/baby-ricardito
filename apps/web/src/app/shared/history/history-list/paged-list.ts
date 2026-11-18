import { computed, DestroyRef, inject, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, Observable, Subscription } from 'rxjs';
import { LoadStatus } from '@app/shared/async-state/load-status';
import { DialogRouteEvents } from '@app/shared/dialog-route/dialog-route';
import { createClock } from '@app/shared/utils/clock';
import { formatDayHeading, localDateKey } from '@app/shared/utils/time.utils';

const PAGE_SIZE = 20;
const CLOCK_TICK_MS = 60_000;

/** Records of one local day, ready to render with `app-history-day`. */
export interface DayGroup<Row> {
  readonly key: string;
  readonly heading: string;
  /** `null` while the day may continue in a page that is not loaded yet. */
  summary: string | null;
  readonly rows: Row[];
}

/** What `app-history-list` needs from a paged list. */
export interface PagedListState {
  readonly status: Signal<LoadStatus>;
  readonly loadingMore: Signal<boolean>;
  /** Stops the automatic loading after a failed page until the user retries. */
  readonly moreFailed: Signal<boolean>;
  readonly hasMore: Signal<boolean>;
  /** Loads the first page again, keeping the rows already shown (and so the scroll position). */
  reload(): void;
  loadMore(): void;
}

export interface PagedList<Row> extends PagedListState {
  readonly groups: Signal<DayGroup<Row>[]>;
}

export interface PagedListOptions<Item, Row> {
  /** Requests a page of records, newest first. */
  load: (page: { limit: number; offset: number }) => Observable<{ items: readonly Item[]; total: number }>;
  /** Converts a record into a row; `null` skips it (e.g. an invalid timestamp). */
  toRow: (item: Item) => Row | null;
  /** Instant (epoch ms) used to group the row by local day. */
  timeOf: (row: Row) => number;
  /** Text shown in the heading of a day, e.g. `3 tomas · 25 min`. */
  summaryOf: (rows: readonly Row[]) => string;
  /** Path of the child route that opens a record; its modal closing reloads the list. */
  dialogRoute: string;
}

/**
 * Records of a history page grouped by day and loaded page by page (infinite scroll): first
 * page, load more with retry, reload after the record modal closes and day summaries. Must be
 * called in an injection context.
 */
export function createPagedList<Item, Row>(options: PagedListOptions<Item, Row>): PagedList<Row> {
  const clock = createClock(CLOCK_TICK_MS);
  const items = signal<readonly Item[]>([]);
  const total = signal(0);
  const status = signal<LoadStatus>('loading');
  const loadingMore = signal(false);
  const moreFailed = signal(false);
  const hasMore = computed(() => items().length < total());
  let pending: Subscription | null = null;

  const groups = computed<DayGroup<Row>[]>(() => {
    const now = clock.now();
    const days: DayGroup<Row>[] = [];
    for (const item of items()) {
      const row = options.toRow(item);
      if (row === null) {
        continue;
      }

      const key = localDateKey(options.timeOf(row));
      const last = days.at(-1);
      if (last?.key === key) {
        last.rows.push(row);
      } else {
        days.push({ key, heading: formatDayHeading(key, now), summary: null, rows: [row] });
      }
    }

    // The last day may continue in the next page, so its summary is only shown once everything is loaded.
    const complete = hasMore() ? days.slice(0, -1) : days;
    for (const day of complete) {
      day.summary = options.summaryOf(day.rows);
    }
    return days;
  });

  const reload = (): void => {
    pending?.unsubscribe();
    loadingMore.set(false);
    moreFailed.set(false);
    // Keeps the records already shown (and so the scroll position) after an edit.
    const limit = Math.max(PAGE_SIZE, items().length);
    if (items().length === 0) {
      status.set('loading');
    }

    pending = options.load({ limit, offset: 0 }).subscribe({
      next: (page) => {
        items.set(page.items);
        total.set(page.total);
        status.set(page.items.length === 0 ? 'empty' : 'loaded');
      },
      error: () => {
        // The HTTP error interceptor already reports it; keep showing what was loaded.
        if (items().length === 0) {
          status.set('error');
        }
      },
    });
  };

  const loadMore = (): void => {
    if (loadingMore() || !hasMore() || status() !== 'loaded') {
      return;
    }

    loadingMore.set(true);
    moreFailed.set(false);
    pending = options.load({ limit: PAGE_SIZE, offset: items().length }).subscribe({
      next: (page) => {
        items.update((current) => [...current, ...page.items]);
        total.set(page.total);
        loadingMore.set(false);
      },
      error: () => {
        loadingMore.set(false);
        moreFailed.set(true);
      },
    });
  };

  inject(DialogRouteEvents)
    .closed$.pipe(
      filter((path) => path === options.dialogRoute),
      takeUntilDestroyed(),
    )
    .subscribe(reload);
  inject(DestroyRef).onDestroy(() => pending?.unsubscribe());

  reload();

  return { status, loadingMore, moreFailed, hasMore, groups, reload, loadMore };
}
