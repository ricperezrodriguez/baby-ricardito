import { Component, computed, inject } from '@angular/core';
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
import {
  HistoryHeatmapOptions,
  HistoryPage,
  HistoryPageContent,
} from '@app/shared/history/history-page/history-page';
import { createHistoryStats } from '@app/shared/history/history-stats';
import { formatDurationText } from '@shared';

/** Path of the child route that opens a feed; its modal closing reloads the page. */
const FEED_DIALOG_ROUTE = ':sessionId';

const CHART_TITLES: Record<HistoryChartId, string> = {
  feedsPerDay: 'Tomas por día',
  minutesPerDay: 'Minutos totales por día',
  breastSplit: 'Reparto izquierdo / derecho',
  averageDuration: 'Duración media por toma',
  averageInterval: 'Intervalo medio entre tomas',
  hourMap: 'Mapa de horas del día',
};

const HEATMAP: HistoryHeatmapOptions = {
  color: 'var(--app-card-breastfeeding)',
  caption: 'Tomas empezadas por día de la semana y hora del día',
  unit: { singular: 'toma', plural: 'tomas' },
};

/** Duration in seconds as short text; `—` when there is no data. */
function secondsText(seconds: number | null): string {
  return seconds === null ? '—' : formatDurationText(seconds * 1_000);
}

function toContent(stats: BreastfeedingStats): HistoryPageContent<HistoryChartId> {
  const { totals } = stats;
  return {
    hasData: totals.feeds > 0,
    hourMap: stats.hourMap,
    summary: [
      { label: 'Tomas', value: String(totals.feeds) },
      { label: 'Tiempo total', value: secondsText(totals.totalSeconds) },
      { label: 'Duración media', value: secondsText(totals.averageDurationSeconds) },
      { label: 'Intervalo medio', value: secondsText(totals.averageIntervalSeconds) },
    ],
    charts: {
      feedsPerDay: feedsPerDayConfig(stats.days),
      minutesPerDay: minutesPerDayConfig(stats.days),
      breastSplit: breastSplitConfig(totals),
      averageDuration: averageDurationConfig(stats.days),
      averageInterval: averageIntervalConfig(stats.days),
    },
  };
}

@Component({
  imports: [FeedHistoryList, HistoryPage],
  template: `
    <app-history-page
      heading="Historial de lactancia"
      recordsTitle="Tomas"
      emptyMessage="No hay tomas registradas en este periodo."
      [history]="history"
      [content]="content()"
      [chartTitles]="chartTitles"
      [heatmap]="heatmap"
    >
      <app-feed-history-list />
    </app-history-page>
  `,
})
export class BreastfeedingHistory {
  private readonly service = inject(BreastfeedingService);

  protected readonly chartTitles = CHART_TITLES;
  protected readonly heatmap = HEATMAP;

  protected readonly history = createHistoryStats<BreastfeedingStats, HistoryChartId>({
    chartIds: HISTORY_CHART_IDS,
    getStats: (request) => this.service.getStats(CURRENT_BABY_ID, request),
    getPreferences: () => this.service.getHistoryPreferences(CURRENT_BABY_ID),
    savePreferences: (hiddenCharts) =>
      this.service.saveHistoryPreferences(CURRENT_BABY_ID, { hiddenCharts }),
    dialogRoute: FEED_DIALOG_ROUTE,
  });

  protected readonly content = computed(() => {
    const stats = this.history.shownStats();
    return stats === undefined ? undefined : toContent(stats);
  });
}
