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
import { SLEEP_HISTORY_CHART_IDS, SleepHistoryChartId, SleepStats } from '@app/features/sleep/sleep.models';
import { SleepService } from '@app/features/sleep/sleep.service';
import {
  averageAwakeConfig,
  averageDurationConfig,
  hoursPerDayConfig,
  sleepsPerDayConfig,
} from '@app/pages/sleep-history/sleep-history-charts';
import { SleepHistoryList } from '@app/pages/sleep-history/sleep-history-list/sleep-history-list';
import { createHiddenCharts } from '@app/shared/history/hidden-charts';
import { HistoryChart } from '@app/shared/history/history-chart/history-chart';
import { HeatmapUnit, HourHeatmap } from '@app/shared/history/hour-heatmap/hour-heatmap';
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
/** Path of the child route that opens a sleep; its modal closing reloads the page. */
const SLEEP_DIALOG_ROUTE = ':sessionId';

const CHART_TITLES: Record<SleepHistoryChartId, string> = {
  sleepsPerDay: 'Sueños por día',
  hoursPerDay: 'Horas de sueño por día',
  averageDuration: 'Duración media por sueño',
  averageAwake: 'Tiempo despierto medio',
  hourMap: 'Mapa de horas del día',
};

const HEATMAP_UNIT: HeatmapUnit = { singular: 'minuto', plural: 'minutos' };

interface SummaryItem {
  label: string;
  value: string;
}

/** Duration in seconds as short text; `—` when there is no data. */
function secondsText(seconds: number | null): string {
  return seconds === null ? '—' : formatDurationText(seconds * 1_000);
}

@Component({
  imports: [
    AsyncState,
    HistoryChart,
    HourHeatmap,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatIconModule,
    RouterLink,
    RouterOutlet,
    SleepHistoryList,
  ],
  styleUrl: './sleep-history.scss',
  templateUrl: './sleep-history.html',
})
export class SleepHistory {
  private readonly service = inject(SleepService);
  private readonly clock = createClock(60_000);
  private readonly reloadCount = signal(0);

  protected readonly periodOptions = PERIOD_OPTIONS;
  protected readonly chartIds = SLEEP_HISTORY_CHART_IDS;
  protected readonly chartTitles = CHART_TITLES;
  protected readonly heatmapUnit = HEATMAP_UNIT;
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
  protected readonly shownStats = linkedSignal<SleepStats | undefined, SleepStats | undefined>({
    source: () => this.stats.value(),
    computation: (value, previous) => value ?? previous?.value,
  });

  protected readonly statsStatus = computed(() => resourceStatus(this.shownStats(), this.stats.error()));

  private readonly preferences = createHiddenCharts(
    SLEEP_HISTORY_CHART_IDS,
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
    return [
      { label: 'Sueños', value: String(totals.sleeps) },
      { label: 'Total dormido', value: formatDurationText(totals.totalSeconds * 1_000) },
      { label: 'Media diaria', value: secondsText(totals.averageDailySeconds) },
      { label: 'Más largo', value: totals.sleeps === 0 ? '—' : formatDurationText(totals.longestSleepSeconds * 1_000) },
      { label: 'Duración media', value: secondsText(totals.averageDurationSeconds) },
      { label: 'Despierto medio', value: secondsText(totals.averageAwakeSeconds) },
    ];
  });

  private readonly configs = computed<Partial<Record<SleepHistoryChartId, ChartConfiguration>>>(() => {
    const stats = this.shownStats();
    if (stats === undefined) {
      return {};
    }
    return {
      sleepsPerDay: sleepsPerDayConfig(stats.days),
      hoursPerDay: hoursPerDayConfig(stats.days),
      averageDuration: averageDurationConfig(stats.days),
      averageAwake: averageAwakeConfig(stats.days),
    };
  });

  constructor() {
    inject(DialogRouteEvents)
      .closed$.pipe(
        filter((path) => path === SLEEP_DIALOG_ROUTE),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.reloadCount.update((count) => count + 1));
  }

  protected configOf(id: SleepHistoryChartId): ChartConfiguration | undefined {
    return this.configs()[id];
  }

  protected selectPeriod(days: number): void {
    this.period.set(days);
  }

  protected setChartVisible(id: SleepHistoryChartId, visible: boolean): void {
    this.preferences.setVisible(id, visible);
  }
}
