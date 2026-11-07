import { Component, computed, inject } from '@angular/core';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import {
  VITAMIN_D_HISTORY_CHART_IDS,
  VitaminDHistoryChartId,
  VitaminDStats,
} from '@app/features/vitamin-d/vitamin-d.models';
import { VitaminDService } from '@app/features/vitamin-d/vitamin-d.service';
import {
  dosesPerDayConfig,
  dropsPerDayConfig,
} from '@app/pages/vitamin-d-history/vitamin-d-history-charts';
import { VitaminDHistoryList } from '@app/pages/vitamin-d-history/vitamin-d-history-list/vitamin-d-history-list';
import {
  HistoryHeatmapOptions,
  HistoryPage,
  HistoryPageContent,
} from '@app/shared/history/history-page/history-page';
import { createHistoryStats } from '@app/shared/history/history-stats';
import { RECORD_DIALOG_ROUTE } from '@shared';

const CHART_TITLES: Record<VitaminDHistoryChartId, string> = {
  calendar: 'Calendario de tomas',
  dosesPerDay: 'Tomas por día',
  dropsPerDay: 'Gotas por día',
  hourMap: 'Mapa de horas del día',
};

const COLOR = 'var(--app-card-vitamin-d)';

const HEATMAP: HistoryHeatmapOptions = {
  color: COLOR,
  caption: 'Tomas de vitamina D por día de la semana y hora del día',
  unit: { singular: 'toma', plural: 'tomas' },
};

const NO_VALUE = '—';

function formatDays(days: number): string {
  return days === 1 ? '1 día' : `${days} días`;
}

function toContent(stats: VitaminDStats): HistoryPageContent<VitaminDHistoryChartId> {
  const { totals, days } = stats;
  const hasDoses = totals.doses > 0;
  const hasDrops = days.some(({ drops }) => drops !== null);
  return {
    hasData: hasDoses || totals.daysMissed > 0,
    hourMap: stats.hourMap,
    summary: [
      { label: 'Tomas', value: String(totals.doses) },
      {
        label: 'Días con toma',
        value: totals.daysInRange === 0 ? NO_VALUE : `${totals.daysGiven} de ${totals.daysInRange}`,
      },
      {
        label: 'Cumplimiento',
        value: totals.adherencePercent === null ? NO_VALUE : `${totals.adherencePercent} %`,
      },
      { label: 'Días omitidos', value: String(totals.daysMissed) },
      { label: 'Racha actual', value: formatDays(totals.currentStreakDays) },
      { label: 'Mejor racha', value: hasDoses ? formatDays(totals.longestStreakDays) : NO_VALUE },
      { label: 'Gotas totales', value: totals.drops === null ? NO_VALUE : String(totals.drops) },
    ],
    charts: {
      dosesPerDay: dosesPerDayConfig(days),
      dropsPerDay: dropsPerDayConfig(days),
    },
    calendars: {
      calendar: {
        days: days.map(({ date, status }) => ({ date, status })),
        color: COLOR,
        caption: CHART_TITLES.calendar,
      },
    },
    notices: hasDrops ? undefined : { dropsPerDay: 'Sin gotas registradas' },
  };
}

@Component({
  imports: [VitaminDHistoryList, HistoryPage],
  template: `
    <app-history-page
      heading="Historial de vitamina D"
      recordsTitle="Tomas"
      emptyMessage="No hay tomas de vitamina D registradas en este periodo."
      [history]="history"
      [content]="content()"
      [chartTitles]="chartTitles"
      [heatmap]="heatmap"
    >
      <app-vitamin-d-history-list />
    </app-history-page>
  `,
})
export class VitaminDHistory {
  private readonly service = inject(VitaminDService);

  protected readonly chartTitles = CHART_TITLES;
  protected readonly heatmap = HEATMAP;

  protected readonly history = createHistoryStats<VitaminDStats, VitaminDHistoryChartId>({
    chartIds: VITAMIN_D_HISTORY_CHART_IDS,
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
