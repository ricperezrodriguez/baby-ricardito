import { Component, computed, inject } from '@angular/core';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { formatBathIntervalDays } from '@app/features/bath/bath.labels';
import {
  BATH_HISTORY_CHART_IDS,
  BathHistoryChartId,
  BathStats,
} from '@app/features/bath/bath.models';
import { BathService } from '@app/features/bath/bath.service';
import { hairSplitConfig, intervalsConfig } from '@app/pages/bath-history/bath-history-charts';
import { BathHistoryList } from '@app/pages/bath-history/bath-history-list/bath-history-list';
import { DayCalendarDay, DayCalendarTexts } from '@app/shared/history/day-calendar/day-calendar';
import { HistoryPage, HistoryPageContent } from '@app/shared/history/history-page/history-page';
import { createHistoryStats } from '@app/shared/history/history-stats';
import { formatDayLabel, localDateKey, parseTimestamp, RECORD_DIALOG_ROUTE } from '@shared';

const CHART_TITLES: Record<BathHistoryChartId, string> = {
  calendar: 'Calendario de baños',
  intervals: 'Días entre baños',
  hairSplit: 'Con / sin lavado de pelo',
};

const COLOR = 'var(--app-card-bath)';

const CALENDAR_TEXTS: DayCalendarTexts = {
  given: 'baño',
  legend: [{ status: 'given', label: 'Día con baño' }],
};

const PERIOD_OPTIONS = [30, 90, 180] as const;

const NO_VALUE = '—';

function formatInterval(days: number | null): string {
  return days === null ? NO_VALUE : formatBathIntervalDays(days);
}

function formatLastDay(iso: string | null): string {
  const instant = iso === null ? null : parseTimestamp(iso);
  return instant === null ? NO_VALUE : formatDayLabel(localDateKey(instant));
}

function toContent(stats: BathStats): HistoryPageContent<BathHistoryChartId> {
  const { totals, days, intervals } = stats;
  const calendarDays: DayCalendarDay[] = days.map(({ date, baths }) => ({
    date,
    status: baths > 0 ? 'given' : 'empty',
  }));
  return {
    hasData: totals.baths > 0,
    summary: [
      { label: 'Baños', value: String(totals.baths) },
      { label: 'Días con baño', value: `${totals.daysWithBath} de ${totals.daysInRange}` },
      { label: 'Lavados de pelo', value: String(totals.hairWashes) },
      { label: 'Intervalo medio', value: formatInterval(totals.averageIntervalDays) },
      { label: 'Intervalo más largo', value: formatInterval(totals.longestIntervalDays) },
      { label: 'Último baño', value: formatLastDay(totals.lastBathAt) },
      { label: 'Último lavado de pelo', value: formatLastDay(totals.lastHairWashAt) },
    ],
    charts: {
      intervals: intervalsConfig(intervals),
      hairSplit: hairSplitConfig(totals),
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
  imports: [BathHistoryList, HistoryPage],
  template: `
    <app-history-page
      heading="Historial de baños"
      recordsTitle="Baños"
      emptyMessage="No hay baños registrados en este periodo."
      [history]="history"
      [content]="content()"
      [chartTitles]="chartTitles"
    >
      <app-bath-history-list />
    </app-history-page>
  `,
})
export class BathHistory {
  private readonly service = inject(BathService);

  protected readonly chartTitles = CHART_TITLES;

  protected readonly history = createHistoryStats<BathStats, BathHistoryChartId>({
    chartIds: BATH_HISTORY_CHART_IDS,
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
