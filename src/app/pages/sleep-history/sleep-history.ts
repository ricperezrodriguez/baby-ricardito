import { Component, computed, inject } from '@angular/core';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import {
  SLEEP_HISTORY_CHART_IDS,
  SleepHistoryChartId,
  SleepStats,
} from '@app/features/sleep/sleep.models';
import { SleepService } from '@app/features/sleep/sleep.service';
import {
  averageAwakeConfig,
  averageDurationConfig,
  hoursPerDayConfig,
  sleepsPerDayConfig,
} from '@app/pages/sleep-history/sleep-history-charts';
import { SleepHistoryList } from '@app/pages/sleep-history/sleep-history-list/sleep-history-list';
import {
  HistoryHeatmapOptions,
  HistoryPage,
  HistoryPageContent,
} from '@app/shared/history/history-page/history-page';
import { createHistoryStats } from '@app/shared/history/history-stats';
import { formatDurationText } from '@shared';

/** Path of the child route that opens a sleep; its modal closing reloads the page. */
const SLEEP_DIALOG_ROUTE = ':sessionId';

const CHART_TITLES: Record<SleepHistoryChartId, string> = {
  sleepsPerDay: 'Sueños por día',
  hoursPerDay: 'Horas de sueño por día',
  averageDuration: 'Duración media por sueño',
  averageAwake: 'Tiempo despierto medio',
  hourMap: 'Mapa de horas del día',
};

const HEATMAP: HistoryHeatmapOptions = {
  color: 'var(--app-card-sleep)',
  caption: 'Minutos dormidos por día de la semana y hora del día',
  unit: { singular: 'minuto', plural: 'minutos' },
};

/** Duration in seconds as short text; `—` when there is no data. */
function secondsText(seconds: number | null): string {
  return seconds === null ? '—' : formatDurationText(seconds * 1_000);
}

function toContent(stats: SleepStats): HistoryPageContent<SleepHistoryChartId> {
  const { totals } = stats;
  return {
    hasData: totals.sleeps > 0,
    hourMap: stats.hourMap,
    summary: [
      { label: 'Sueños', value: String(totals.sleeps) },
      { label: 'Total dormido', value: formatDurationText(totals.totalSeconds * 1_000) },
      { label: 'Media diaria', value: secondsText(totals.averageDailySeconds) },
      {
        label: 'Más largo',
        value: totals.sleeps === 0 ? '—' : formatDurationText(totals.longestSleepSeconds * 1_000),
      },
      { label: 'Duración media', value: secondsText(totals.averageDurationSeconds) },
      { label: 'Despierto medio', value: secondsText(totals.averageAwakeSeconds) },
    ],
    charts: {
      sleepsPerDay: sleepsPerDayConfig(stats.days),
      hoursPerDay: hoursPerDayConfig(stats.days),
      averageDuration: averageDurationConfig(stats.days),
      averageAwake: averageAwakeConfig(stats.days),
    },
  };
}

@Component({
  imports: [HistoryPage, SleepHistoryList],
  template: `
    <app-history-page
      heading="Historial de sueño"
      recordsTitle="Sueños"
      emptyMessage="No hay sueños registrados en este periodo."
      [history]="history"
      [content]="content()"
      [chartTitles]="chartTitles"
      [heatmap]="heatmap"
    >
      <app-sleep-history-list />
    </app-history-page>
  `,
})
export class SleepHistory {
  private readonly service = inject(SleepService);

  protected readonly chartTitles = CHART_TITLES;
  protected readonly heatmap = HEATMAP;

  protected readonly history = createHistoryStats<SleepStats, SleepHistoryChartId>({
    chartIds: SLEEP_HISTORY_CHART_IDS,
    getStats: (request) => this.service.getStats(CURRENT_BABY_ID, request),
    getPreferences: () => this.service.getHistoryPreferences(CURRENT_BABY_ID),
    savePreferences: (hiddenCharts) =>
      this.service.saveHistoryPreferences(CURRENT_BABY_ID, { hiddenCharts }),
    dialogRoute: SLEEP_DIALOG_ROUTE,
  });

  protected readonly content = computed(() => {
    const stats = this.history.shownStats();
    return stats === undefined ? undefined : toContent(stats);
  });
}
