import { Component, computed, inject } from '@angular/core';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import {
  NAIL_TRIMMING_HISTORY_CHART_IDS,
  NailTrimmingHistoryChartId,
  NailTrimmingStats,
} from '@app/features/nail-trimming/nail-trimming.models';
import { NailTrimmingService } from '@app/features/nail-trimming/nail-trimming.service';
import {
  areaSplitConfig,
  intervalsConfig,
} from '@app/pages/nail-trimming-history/nail-trimming-history-charts';
import { NailTrimmingHistoryList } from '@app/pages/nail-trimming-history/nail-trimming-history-list/nail-trimming-history-list';
import { DayCalendarDay, DayCalendarTexts } from '@app/shared/history/day-calendar/day-calendar';
import { HistoryPage, HistoryPageContent } from '@app/shared/history/history-page/history-page';
import { createHistoryStats } from '@app/shared/history/history-stats';
import { formatDayLabel, localDateKey, parseTimestamp, RECORD_DIALOG_ROUTE } from '@shared';

const CHART_TITLES: Record<NailTrimmingHistoryChartId, string> = {
  calendar: 'Calendario de cortes',
  intervals: 'Días entre cortes',
  areaSplit: 'Reparto manos / pies',
};

const COLOR = 'var(--app-card-nail-trimming)';

const CALENDAR_TEXTS: DayCalendarTexts = {
  given: 'corte',
  legend: [{ status: 'given', label: 'Día con corte' }],
};

const PERIOD_OPTIONS = [30, 90, 180] as const;

const NO_VALUE = '—';

const DAYS_FORMAT = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });

function formatIntervalDays(days: number | null): string {
  if (days === null) {
    return NO_VALUE;
  }
  return `${DAYS_FORMAT.format(days)} ${days === 1 ? 'día' : 'días'}`;
}

function formatLastTrim(iso: string | null): string {
  const instant = iso === null ? null : parseTimestamp(iso);
  return instant === null ? NO_VALUE : formatDayLabel(localDateKey(instant));
}

function toContent(stats: NailTrimmingStats): HistoryPageContent<NailTrimmingHistoryChartId> {
  const { totals, days, intervals } = stats;
  const calendarDays: DayCalendarDay[] = days.map(({ date, trims }) => ({
    date,
    status: trims > 0 ? 'given' : 'empty',
  }));
  return {
    hasData: totals.trims > 0,
    summary: [
      { label: 'Cortes', value: String(totals.trims) },
      {
        label: 'Intervalo medio de manos',
        value: formatIntervalDays(totals.averageHandsIntervalDays),
      },
      {
        label: 'Intervalo medio de pies',
        value: formatIntervalDays(totals.averageFeetIntervalDays),
      },
      { label: 'Intervalo más largo', value: formatIntervalDays(totals.longestIntervalDays) },
      { label: 'Últimas manos', value: formatLastTrim(totals.lastHandsAt) },
      { label: 'Últimos pies', value: formatLastTrim(totals.lastFeetAt) },
    ],
    charts: {
      intervals: intervalsConfig(intervals),
      areaSplit: areaSplitConfig(totals),
    },
    calendars: {
      calendar: {
        days: calendarDays,
        color: COLOR,
        caption: CHART_TITLES.calendar,
        texts: CALENDAR_TEXTS,
      },
    },
    notices:
      intervals.length === 0 ? { intervals: 'Aún no hay intervalos que mostrar' } : undefined,
  };
}

@Component({
  imports: [NailTrimmingHistoryList, HistoryPage],
  template: `
    <app-history-page
      heading="Historial de corte de uñas"
      recordsTitle="Cortes"
      emptyMessage="No hay cortes de uñas registrados en este periodo."
      [history]="history"
      [content]="content()"
      [chartTitles]="chartTitles"
    >
      <app-nail-trimming-history-list />
    </app-history-page>
  `,
})
export class NailTrimmingHistory {
  private readonly service = inject(NailTrimmingService);

  protected readonly chartTitles = CHART_TITLES;

  protected readonly history = createHistoryStats<NailTrimmingStats, NailTrimmingHistoryChartId>({
    chartIds: NAIL_TRIMMING_HISTORY_CHART_IDS,
    getStats: (request) => this.service.getStats(CURRENT_BABY_ID, request),
    getPreferences: () => this.service.getHistoryPreferences(CURRENT_BABY_ID),
    savePreferences: (hiddenCharts) =>
      this.service.saveHistoryPreferences(CURRENT_BABY_ID, { hiddenCharts }),
    dialogRoute: RECORD_DIALOG_ROUTE,
    periodOptions: PERIOD_OPTIONS,
  });

  protected readonly content = computed(() => {
    const stats = this.history.shownStats();
    return stats === undefined ? undefined : toContent(stats);
  });
}
