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
import { FeedHistoryList } from '@app/pages/breastfeeding-history/feed-history-list/feed-history-list';
import {
  averageDurationConfig,
  averageIntervalConfig,
  breastSplitConfig,
  feedsPerDayConfig,
  minutesPerDayConfig,
} from '@app/pages/breastfeeding-history/history-charts';
import { createHiddenCharts } from '@app/shared/history/hidden-charts';
import { HistoryChart } from '@app/shared/history/history-chart/history-chart';
import { HourHeatmap } from '@app/shared/history/hour-heatmap/hour-heatmap';
import {
  AsyncState,
  createClock,
  DialogRouteEvents,
  formatDurationText,
  localDateRange,
  localTimeZone,
  resourceStatus,
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
    AsyncState,
    FeedHistoryList,
    HistoryChart,
    HourHeatmap,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatIconModule,
    RouterLink,
    RouterOutlet,
  ],
  styleUrl: './breastfeeding-history.scss',
  templateUrl: './breastfeeding-history.html',
})
export class BreastfeedingHistory {
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

  protected readonly statsStatus = computed(() => resourceStatus(this.shownStats(), this.stats.error()));

  private readonly preferences = createHiddenCharts(
    HISTORY_CHART_IDS,
    () => this.service.getHistoryPreferences(CURRENT_BABY_ID),
    (hiddenCharts) => this.service.saveHistoryPreferences(CURRENT_BABY_ID, { hiddenCharts }),
  );

  /** Charts the user hid; saved in the backend. */
  protected readonly hiddenCharts = this.preferences.hidden;
  protected readonly preferencesReady = this.preferences.ready;
  protected readonly visibleCharts = this.preferences.visible;

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
    this.preferences.setVisible(id, visible);
  }
}
