import { Component, computed, inject } from '@angular/core';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { formatMl } from '@app/features/bottle/bottle.labels';
import {
  BOTTLE_HISTORY_CHART_IDS,
  BottleHistoryChartId,
  BottleStats,
} from '@app/features/bottle/bottle.models';
import { BottleService } from '@app/features/bottle/bottle.service';
import {
  averageAmountConfig,
  averageIntervalConfig,
  feedsPerDayConfig,
  mlPerDayConfig,
} from '@app/pages/bottle-history/bottle-history-charts';
import { BottleHistoryList } from '@app/pages/bottle-history/bottle-history-list/bottle-history-list';
import {
  HistoryHeatmapOptions,
  HistoryPage,
  HistoryPageContent,
} from '@app/shared/history/history-page/history-page';
import { createHistoryStats } from '@app/shared/history/history-stats';
import { formatDurationText, RECORD_DIALOG_ROUTE } from '@shared';

const CHART_TITLES: Record<BottleHistoryChartId, string> = {
  feedsPerDay: 'Biberones por día',
  mlPerDay: 'Mililitros por día',
  averageAmount: 'Cantidad media por biberón',
  averageInterval: 'Intervalo medio entre biberones',
  hourMap: 'Mapa de horas del día',
};

const HEATMAP: HistoryHeatmapOptions = {
  color: 'var(--app-card-bottle)',
  caption: 'Biberones por día de la semana y hora del día',
  unit: { singular: 'biberón', plural: 'biberones' },
};

const NO_VALUE = '—';

function mlOrDash(amountMl: number | null): string {
  return amountMl === null ? NO_VALUE : formatMl(amountMl);
}

function toContent(stats: BottleStats): HistoryPageContent<BottleHistoryChartId> {
  const { totals, days } = stats;
  const hasData = totals.feeds > 0;
  return {
    hasData,
    hourMap: stats.hourMap,
    summary: [
      { label: 'Biberones', value: String(totals.feeds) },
      { label: 'Total', value: hasData ? formatMl(totals.totalMl) : NO_VALUE },
      { label: 'Media diaria', value: mlOrDash(totals.averageDailyMl) },
      { label: 'Cantidad media', value: mlOrDash(totals.averageAmountMl) },
      {
        label: 'Intervalo medio',
        value:
          totals.averageIntervalSeconds === null
            ? NO_VALUE
            : formatDurationText(totals.averageIntervalSeconds * 1_000),
      },
      { label: 'Leche materna', value: hasData ? formatMl(totals.breastMilkMl) : NO_VALUE },
      { label: 'Fórmula', value: hasData ? formatMl(totals.formulaMl) : NO_VALUE },
      { label: 'Mixta', value: hasData ? formatMl(totals.mixedMl) : NO_VALUE },
    ],
    charts: {
      feedsPerDay: feedsPerDayConfig(days),
      mlPerDay: mlPerDayConfig(days),
      averageAmount: averageAmountConfig(days),
      averageInterval: averageIntervalConfig(days),
    },
  };
}

@Component({
  imports: [BottleHistoryList, HistoryPage],
  template: `
    <app-history-page
      heading="Historial de biberones"
      recordsTitle="Biberones"
      emptyMessage="No hay biberones registrados en este periodo."
      [history]="history"
      [content]="content()"
      [chartTitles]="chartTitles"
      [heatmap]="heatmap"
    >
      <app-bottle-history-list />
    </app-history-page>
  `,
})
export class BottleHistory {
  private readonly service = inject(BottleService);

  protected readonly chartTitles = CHART_TITLES;
  protected readonly heatmap = HEATMAP;

  protected readonly history = createHistoryStats<BottleStats, BottleHistoryChartId>({
    chartIds: BOTTLE_HISTORY_CHART_IDS,
    getStats: (request) => this.service.getStats(CURRENT_BABY_ID, request),
    getPreferences: () => this.service.getHistoryPreferences(CURRENT_BABY_ID),
    savePreferences: (hiddenCharts) =>
      this.service.saveHistoryPreferences(CURRENT_BABY_ID, { hiddenCharts }),
    dialogRoute: RECORD_DIALOG_ROUTE,
  });

  protected readonly content = computed(() => {
    const stats = this.history.shownStats();
    return stats === undefined ? undefined : toContent(stats);
  });
}
