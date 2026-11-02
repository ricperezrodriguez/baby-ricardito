import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { ChartConfiguration } from 'chart.js';
import { filter } from 'rxjs';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import {
  BreastfeedingStats,
  HISTORY_CHART_IDS,
  HistoryChartId,
} from '@app/features/breastfeeding/breastfeeding.models';
import { BreastfeedingService } from '@app/features/breastfeeding/breastfeeding.service';
import { FeedHeatmap } from '@app/pages/detalle-pecho/feed-heatmap/feed-heatmap';
import { FeedHistoryList } from '@app/pages/detalle-pecho/feed-history-list/feed-history-list';
import {
  averageDurationConfig,
  averageIntervalConfig,
  breastSplitConfig,
  feedsPerDayConfig,
  minutesPerDayConfig,
} from '@app/pages/detalle-pecho/history-charts';
import { HistoryChart } from '@app/pages/detalle-pecho/history-chart/history-chart';
import {
  createClock,
  DialogRouteEvents,
  formatDurationText,
  LoadingSpinner,
  localDateRange,
  localTimeZone,
} from '@shared';

const PERIOD_OPTIONS = [7, 30, 90] as const;
const FEED_DIALOG_ROUTE = ':sessionId';

const CHART_TITLES: Record<HistoryChartId, string> = {
  feedsPerDay: 'Tomas por día',
  minutesPerDay: 'Minutos totales por día',
  breastSplit: 'Reparto izquierdo / derecho',
  averageDuration: 'Duración media por toma',
  averageInterval: 'Intervalo medio entre tomas',
  hourMap: 'Mapa de horas del día',
};

interface SummaryItem {
  label: string;
  value: string;
}

@Component({
  imports: [
    FeedHeatmap,
    FeedHistoryList,
    HistoryChart,
    LoadingSpinner,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatIconModule,
    RouterLink,
    RouterOutlet,
  ],
  styleUrl: './detalle-pecho.scss',
  templateUrl: './detalle-pecho.html',
})
export class DetallePecho {
  private readonly service = inject(BreastfeedingService);
  private readonly clock = createClock(60_000);
  private readonly reloadCount = signal(0);

  protected readonly periodOptions = PERIOD_OPTIONS;
  protected readonly chartIds = HISTORY_CHART_IDS;
  protected readonly chartTitles = CHART_TITLES;
  protected readonly period = signal<number>(PERIOD_OPTIONS[0]);

  private readonly range = computed(() => localDateRange(this.clock.now(), this.period()), {
    equal: (a, b) => a.from === b.from && a.to === b.to,
  });

  protected readonly stats = rxResource({
    params: () => ({ ...this.range(), reload: this.reloadCount() }),
    stream: ({ params }) =>
      this.service.getStats(CURRENT_BABY_ID, {
        from: params.from,
        to: params.to,
        timeZone: localTimeZone(),
      }),
  });

  /** Last stats received, kept while newer ones load so the charts do not flicker. */
  protected readonly shownStats = linkedSignal<BreastfeedingStats | undefined, BreastfeedingStats | undefined>({
    source: () => this.stats.value(),
    computation: (value, previous) => value ?? previous?.value,
  });

  private readonly preferences = rxResource({
    stream: () => this.service.getHistoryPreferences(CURRENT_BABY_ID),
  });

  /** Charts the user hid; saved in the backend. */
  protected readonly hiddenCharts = linkedSignal<HistoryChartId[]>(
    () => this.preferences.value()?.hiddenCharts ?? [],
  );
  protected readonly preferencesReady = computed(() => !this.preferences.isLoading());
  protected readonly visibleCharts = computed(() =>
    HISTORY_CHART_IDS.filter((id) => !this.hiddenCharts().includes(id)),
  );

  protected readonly summary = computed<SummaryItem[]>(() => {
    const totals = this.shownStats()?.totals;
    if (totals === undefined) {
      return [];
    }
    const text = (seconds: number | null): string =>
      seconds === null ? '—' : formatDurationText(seconds * 1_000);
    return [
      { label: 'Tomas', value: String(totals.feeds) },
      { label: 'Tiempo total', value: text(totals.totalSeconds) },
      { label: 'Duración media', value: text(totals.averageDurationSeconds) },
      { label: 'Intervalo medio', value: text(totals.averageIntervalSeconds) },
    ];
  });

  private readonly configs = computed<Partial<Record<HistoryChartId, ChartConfiguration>>>(() => {
    const stats = this.shownStats();
    if (stats === undefined) {
      return {};
    }
    return {
      feedsPerDay: feedsPerDayConfig(stats.days),
      minutesPerDay: minutesPerDayConfig(stats.days),
      breastSplit: breastSplitConfig(stats.totals),
      averageDuration: averageDurationConfig(stats.days),
      averageInterval: averageIntervalConfig(stats.days),
    };
  });

  constructor() {
    inject(DialogRouteEvents)
      .closed$.pipe(
        filter((path) => path === FEED_DIALOG_ROUTE),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.reloadCount.update((count) => count + 1));
  }

  protected configOf(id: HistoryChartId): ChartConfiguration | undefined {
    return this.configs()[id];
  }

  protected selectPeriod(days: number): void {
    this.period.set(days);
  }

  protected setChartVisible(id: HistoryChartId, visible: boolean): void {
    const previous = this.hiddenCharts();
    const hidden = visible ? previous.filter((hiddenId) => hiddenId !== id) : [...new Set([...previous, id])];
    if (hidden.length === previous.length) {
      return;
    }

    this.hiddenCharts.set(hidden);
    this.service.saveHistoryPreferences(CURRENT_BABY_ID, { hiddenCharts: hidden }).subscribe({
      // The HTTP error interceptor reports the failure; the choice goes back to what is stored.
      error: () => this.hiddenCharts.set(previous),
    });
  }
}
