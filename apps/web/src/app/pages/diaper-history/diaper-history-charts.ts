import { ChartConfiguration, TooltipItem } from 'chart.js';
import { DIAPER_TYPE_LABELS, STOOL_COLOR_LABELS } from '@app/features/diaper/diaper.labels';
import {
  DiaperDayStats,
  DiaperStatsTotals,
  STOOL_COLORS,
  StoolColor,
} from '@app/features/diaper/diaper.models';
import { BASE_OPTIONS, labelsOf, lineConfig, round } from '@app/shared/history/chart-config.utils';

/** Pee, poop and both (mirror `--app-blue`, `--app-ochre`, `--app-purple`); each is also named in legends and tooltips. */
const WET_COLOR = '#285c8c';
const DIRTY_COLOR = '#99620d';
const BOTH_COLOR = '#51468d';

const UNSPECIFIED_COLOR = '#c7d0cc';
const UNSPECIFIED_LABEL = 'Sin indicar';
/** Dark outline of every stool bar, so light tints (white, yellow) stay visible on a white card. */
const STOOL_BORDER_COLOR = '#4d6267';

/** Real colour of the stool, used as the tint of its bar. */
const STOOL_TINTS: Record<StoolColor, string> = {
  yellow: '#e8c533',
  green: '#6b8f3a',
  brown: '#7a4b27',
  black: '#222a2c',
  red: '#c0392b',
  white: '#ffffff',
};

/** Stacked bars with the exclusive buckets (`wet + dirty + both === changes`). */
export function changesPerDayConfig(days: readonly DiaperDayStats[]): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels: labelsOf(days),
      datasets: [
        { label: DIAPER_TYPE_LABELS.wet, data: days.map(({ wet }) => wet), backgroundColor: WET_COLOR },
        { label: DIAPER_TYPE_LABELS.dirty, data: days.map(({ dirty }) => dirty), backgroundColor: DIRTY_COLOR },
        { label: DIAPER_TYPE_LABELS.both, data: days.map(({ both }) => both), backgroundColor: BOTH_COLOR },
      ],
    },
    options: {
      ...BASE_OPTIONS,
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
    },
  };
}

export function typeSplitConfig(totals: DiaperStatsTotals): ChartConfiguration {
  return {
    type: 'doughnut',
    data: {
      labels: [DIAPER_TYPE_LABELS.wet, DIAPER_TYPE_LABELS.dirty, DIAPER_TYPE_LABELS.both],
      datasets: [
        {
          label: 'Cambios',
          data: [totals.wet, totals.dirty, totals.both],
          backgroundColor: [WET_COLOR, DIRTY_COLOR, BOTH_COLOR],
        },
      ],
    },
    options: {
      ...BASE_OPTIONS,
      plugins: {
        tooltip: {
          callbacks: {
            label: (item: TooltipItem<'doughnut'>) => {
              const count = item.parsed;
              const percent = totals.changes === 0 ? 0 : Math.round((count / totals.changes) * 100);
              return `${item.label}: ${count} (${percent} %)`;
            },
          },
        },
      },
    } as ChartConfiguration['options'],
  };
}

export function averageIntervalConfig(days: readonly DiaperDayStats[]): ChartConfiguration {
  return lineConfig(
    days,
    'Intervalo medio (h)',
    days.map(({ averageIntervalSeconds }) => round(averageIntervalSeconds === null ? null : averageIntervalSeconds / 3_600, 1)),
  );
}

/** Horizontal bars, one per stool colour plus "Sin indicar"; the colour name is the axis label. */
export function stoolColorsConfig(totals: DiaperStatsTotals): ChartConfiguration {
  const entries = [
    ...STOOL_COLORS.map((color) => ({
      label: STOOL_COLOR_LABELS[color],
      count: totals.stoolColors[color],
      tint: STOOL_TINTS[color],
    })),
    { label: UNSPECIFIED_LABEL, count: totals.stoolColors.unspecified, tint: UNSPECIFIED_COLOR },
  ];
  return {
    type: 'bar',
    data: {
      labels: entries.map(({ label }) => label),
      datasets: [
        {
          label: 'Heces',
          data: entries.map(({ count }) => count),
          backgroundColor: entries.map(({ tint }) => tint),
          borderColor: STOOL_BORDER_COLOR,
          borderWidth: 2,
        },
      ],
    },
    options: {
      ...BASE_OPTIONS,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  };
}
