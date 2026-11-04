import { Component, computed, inject } from '@angular/core';
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
import {
  HistoryHeatmapOptions,
  HistoryPage,
  HistoryPageContent,
} from '@app/shared/history/history-page/history-page';
import { createHistoryStats } from '@app/shared/history/history-stats';
import { formatDurationText } from '@shared';

/** Path of the child route that opens a change; its modal closing reloads the page. */
const CHANGE_DIALOG_ROUTE = ':changeId';

const CHART_TITLES: Record<DiaperHistoryChartId, string> = {
  changesPerDay: 'Cambios por día',
  typeSplit: 'Reparto por tipo',
  averageInterval: 'Intervalo medio entre cambios',
  stoolColors: 'Color de las heces',
  hourMap: 'Mapa de horas del día',
};

const HEATMAP: HistoryHeatmapOptions = {
  color: 'var(--app-card-diaper)',
  caption: 'Cambios de pañal por día de la semana y hora del día',
  unit: { singular: 'cambio', plural: 'cambios' },
};

function toContent(stats: DiaperStats): HistoryPageContent<DiaperHistoryChartId> {
  const { totals } = stats;
  const perDay =
    totals.averageChangesPerDay === null
      ? '—'
      : totals.averageChangesPerDay.toLocaleString('es', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
  const interval =
    totals.averageIntervalSeconds === null
      ? '—'
      : formatDurationText(totals.averageIntervalSeconds * 1_000);
  // Only dirty and mixed changes can have a stool colour.
  const hasStool = totals.dirty + totals.both > 0;
  return {
    hasData: totals.changes > 0,
    hourMap: stats.hourMap,
    summary: [
      { label: 'Cambios', value: String(totals.changes) },
      { label: 'Media por día', value: perDay },
      { label: 'Intervalo medio', value: interval },
      { label: 'Con pis', value: String(totals.wet + totals.both) },
      { label: 'Con caca', value: String(totals.dirty + totals.both) },
      { label: 'Mixtos', value: String(totals.both) },
      { label: 'Con rojeces', value: String(totals.rashChanges) },
    ],
    charts: {
      changesPerDay: changesPerDayConfig(stats.days),
      typeSplit: typeSplitConfig(totals),
      averageInterval: averageIntervalConfig(stats.days),
      stoolColors: stoolColorsConfig(totals),
    },
    notices: hasStool ? undefined : { stoolColors: 'Sin heces registradas' },
  };
}

@Component({
  imports: [DiaperHistoryList, HistoryPage],
  template: `
    <app-history-page
      heading="Historial de pañales"
      recordsTitle="Cambios"
      emptyMessage="No hay pañales registrados en este periodo."
      [history]="history"
      [content]="content()"
      [chartTitles]="chartTitles"
      [heatmap]="heatmap"
    >
      <app-diaper-history-list />
    </app-history-page>
  `,
})
export class DiaperHistory {
  private readonly service = inject(DiaperService);

  protected readonly chartTitles = CHART_TITLES;
  protected readonly heatmap = HEATMAP;

  protected readonly history = createHistoryStats<DiaperStats, DiaperHistoryChartId>({
    chartIds: DIAPER_HISTORY_CHART_IDS,
    getStats: (request) => this.service.getStats(CURRENT_BABY_ID, request),
    getPreferences: () => this.service.getHistoryPreferences(CURRENT_BABY_ID),
    savePreferences: (hiddenCharts) =>
      this.service.saveHistoryPreferences(CURRENT_BABY_ID, { hiddenCharts }),
    dialogRoute: CHANGE_DIALOG_ROUTE,
  });

  protected readonly content = computed(() => {
    const stats = this.history.shownStats();
    return stats === undefined ? undefined : toContent(stats);
  });
}
