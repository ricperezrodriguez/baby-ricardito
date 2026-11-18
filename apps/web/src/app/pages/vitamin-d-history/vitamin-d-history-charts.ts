import { ChartConfiguration } from 'chart.js';
import { VitaminDDayStats } from '@app/features/vitamin-d/vitamin-d.models';
import { BASE_OPTIONS, labelsOf, lineConfig } from '@app/shared/history/chart-config.utils';

/** Vitamin D card colour (mirrors `--app-card-vitamin-d`). */
export const VITAMIN_D_COLOR = '#805700';

/** Doses per day; at least 1 on the axis so a single dose does not fill the whole chart. */
export function dosesPerDayConfig(days: readonly VitaminDDayStats[]): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels: labelsOf(days),
      datasets: [
        { label: 'Tomas', data: days.map(({ doses }) => doses), backgroundColor: VITAMIN_D_COLOR },
      ],
    },
    options: {
      ...BASE_OPTIONS,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, suggestedMax: 1, ticks: { precision: 0 } } },
    },
  };
}

/** Drops per day; days without recorded drops are gaps (`null`). */
export function dropsPerDayConfig(days: readonly VitaminDDayStats[]): ChartConfiguration {
  const config = lineConfig(
    days,
    'Gotas',
    days.map(({ drops }) => drops),
    VITAMIN_D_COLOR,
  );
  return {
    ...config,
    options: {
      ...config.options,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  };
}
