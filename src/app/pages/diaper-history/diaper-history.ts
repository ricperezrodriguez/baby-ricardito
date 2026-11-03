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
  DIAPER_HISTORY_CHART_IDS,
  DiaperHistoryChartId,
  DiaperStats,
} from '@app/features/diaper/diaper.models';
import { DiaperService } from '@app/features/diaper/diaper.service';
import {
  averageIntervalConfig,
  changesPerDayConfig,
  stoolColorsConfig,
  typeSplitConfig,
} from '@app/pages/diaper-history/diaper-history-charts';
import { DiaperHistoryList } from '@app/pages/diaper-history/diaper-history-list/diaper-history-list';
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
/** Path of the child route that opens a change; its modal closing reloads the page. */
const CHANGE_DIALOG_ROUTE = ':changeId';

const CHART_TITLES: Record<DiaperHistoryChartId, string> = {
  changesPerDay: 'Cambios por día',
  typeSplit: 'Reparto por tipo',
  averageInterval: 'Intervalo medio entre cambios',
  stoolColors: 'Color de las heces',
  hourMap: 'Mapa de horas del día',
};

const HEATMAP_UNIT: HeatmapUnit = { singular: 'cambio', plural: 'cambios' };

interface SummaryItem {
  label: string;
  value: string;
}

@Component({
  imports: [
    AsyncState,
    DiaperHistoryList,
    HistoryChart,
    HourHeatmap,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatIconModule,
    RouterLink,
    RouterOutlet,
  ],
  styleUrl: './diaper-history.scss',
  templateUrl: './diaper-history.html',
})
export class DiaperHistory {
  private readonly service = inject(DiaperService);
  private readonly clock = createClock(60_000);
  private readonly reloadCount = signal(0);

  protected readonly periodOptions = PERIOD_OPTIONS;
  protected readonly chartIds = DIAPER_HISTORY_CHART_IDS;
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
  protected readonly shownStats = linkedSignal<DiaperStats | undefined, DiaperStats | undefined>({
    source: () => this.stats.value(),
    computation: (value, previous) => value ?? previous?.value,
  });

  protected readonly statsStatus = computed(() => resourceStatus(this.shownStats(), this.stats.error()));

  private readonly preferences = createHiddenCharts(
    DIAPER_HISTORY_CHART_IDS,
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
    const perDay =
      totals.averageChangesPerDay === null
        ? '—'
        : totals.averageChangesPerDay.toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const interval =
      totals.averageIntervalSeconds === null ? '—' : formatDurationText(totals.averageIntervalSeconds * 1_000);
    return [
      { label: 'Cambios', value: String(totals.changes) },
      { label: 'Media por día', value: perDay },
      { label: 'Intervalo medio', value: interval },
      { label: 'Con pis', value: String(totals.wet + totals.both) },
      { label: 'Con caca', value: String(totals.dirty + totals.both) },
      { label: 'Mixtos', value: String(totals.both) },
      { label: 'Con rojeces', value: String(totals.rashChanges) },
    ];
  });

  /** Dirty and mixed changes, the ones that can have a stool colour. */
  protected readonly stoolChanges = computed(() => {
    const totals = this.shownStats()?.totals;
    return totals === undefined ? 0 : totals.dirty + totals.both;
  });

  private readonly configs = computed<Partial<Record<DiaperHistoryChartId, ChartConfiguration>>>(() => {
    const stats = this.shownStats();
    if (stats === undefined) {
      return {};
    }
    return {
      changesPerDay: changesPerDayConfig(stats.days),
      typeSplit: typeSplitConfig(stats.totals),
      averageInterval: averageIntervalConfig(stats.days),
      stoolColors: stoolColorsConfig(stats.totals),
    };
  });

  constructor() {
    inject(DialogRouteEvents)
      .closed$.pipe(
        filter((path) => path === CHANGE_DIALOG_ROUTE),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.reloadCount.update((count) => count + 1));
  }

  protected configOf(id: DiaperHistoryChartId): ChartConfiguration | undefined {
    return this.configs()[id];
  }

  protected selectPeriod(days: number): void {
    this.period.set(days);
  }

  protected setChartVisible(id: DiaperHistoryChartId, visible: boolean): void {
    this.preferences.setVisible(id, visible);
  }
}
