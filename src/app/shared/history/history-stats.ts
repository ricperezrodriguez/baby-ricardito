import { computed, inject, linkedSignal, signal, Signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StatsRequest } from '@app/features/shared/tracker.models';
import { LoadStatus, resourceStatus } from '@app/shared/async-state/load-status';
import { DialogRouteEvents } from '@app/shared/dialog-route/dialog-route';
import { createHiddenCharts } from '@app/shared/history/hidden-charts';
import { createClock } from '@app/shared/utils/clock';
import { localDateRange, localTimeZone } from '@app/shared/utils/time.utils';
import { filter, Observable } from 'rxjs';

export const HISTORY_PERIOD_OPTIONS = [7, 30, 90] as const;
const CLOCK_TICK_MS = 60_000;

/** What `app-history-page` needs from the stats of a history page. */
export interface HistoryPageState<Id extends string> {
  readonly chartIds: readonly Id[];
  readonly periodOptions: readonly number[];
  /** Days of the selected period. */
  readonly period: Signal<number>;
  readonly status: Signal<LoadStatus>;
  /** Charts the user hid; saved in the backend. */
  readonly hidden: Signal<Id[]>;
  /** Charts to show, in the order of `chartIds`. */
  readonly visible: Signal<Id[]>;
  /** False while the stored preference loads, so the chips do not flash the wrong state. */
  readonly preferencesReady: Signal<boolean>;
  selectPeriod(days: number): void;
  setChartVisible(id: Id, visible: boolean): void;
  reload(): void;
}

export interface HistoryStats<Stats, Id extends string> extends HistoryPageState<Id> {
  /** Last stats received, kept while newer ones load so the charts do not flicker. */
  readonly shownStats: Signal<Stats | undefined>;
}

export interface HistoryStatsOptions<Stats, Id extends string> {
  chartIds: readonly Id[];
  /** Requests the stats of the selected range. */
  getStats: (request: StatsRequest) => Observable<Stats>;
  getPreferences: () => Observable<{ hiddenCharts: Id[] }>;
  savePreferences: (hiddenCharts: Id[]) => Observable<unknown>;
  /** Path of the child route that opens a record; its modal closing reloads the stats. */
  dialogRoute: string;
}

/**
 * Data side of a history page: period, stats of the period (last value kept while reloading),
 * hidden-charts preference and reload after the record modal closes. Must be called in an
 * injection context.
 */
export function createHistoryStats<Stats, Id extends string>(
  options: HistoryStatsOptions<Stats, Id>,
): HistoryStats<Stats, Id> {
  const clock = createClock(CLOCK_TICK_MS);
  const reloadCount = signal(0);
  const period = signal<number>(HISTORY_PERIOD_OPTIONS[0]);

  // Stable while the clock ticks, so the resource is not requested again.
  const range = computed(() => localDateRange(clock.now(), period()), {
    equal: (a, b) => a.from === b.from && a.to === b.to,
  });

  const stats = rxResource({
    params: () => ({ ...range(), reload: reloadCount() }),
    stream: ({ params }) =>
      options.getStats({ from: params.from, to: params.to, timeZone: localTimeZone() }),
  });

  const shownStats = linkedSignal<Stats | undefined, Stats | undefined>({
    source: () => stats.value(),
    computation: (value, previous) => value ?? previous?.value,
  });

  const preferences = createHiddenCharts(
    options.chartIds,
    options.getPreferences,
    options.savePreferences,
  );

  inject(DialogRouteEvents)
    .closed$.pipe(
      filter((path) => path === options.dialogRoute),
      takeUntilDestroyed(),
    )
    .subscribe(() => reloadCount.update((count) => count + 1));

  return {
    chartIds: options.chartIds,
    periodOptions: HISTORY_PERIOD_OPTIONS,
    period,
    shownStats,
    status: computed(() => resourceStatus(shownStats(), stats.error())),
    hidden: preferences.hidden,
    visible: preferences.visible,
    preferencesReady: preferences.ready,
    selectPeriod: (days) => period.set(days),
    setChartVisible: (id, visible) => preferences.setVisible(id, visible),
    reload: () => stats.reload(),
  };
}
