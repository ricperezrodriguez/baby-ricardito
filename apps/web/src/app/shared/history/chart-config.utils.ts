import { ChartConfiguration } from 'chart.js';
import { formatDayLabel } from '@shared';

/** Default series color of the history charts (mirrors `--app-green`). */
export const LINE_COLOR = '#155f56';

export const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
} as const;

/** A day of any tracker's stats. */
export interface DayLike {
  /** Local day, `yyyy-MM-dd` */
  date: string;
}

export function labelsOf(days: readonly DayLike[]): string[] {
  return days.map(({ date }) => formatDayLabel(date));
}

export function round(value: number | null, decimals: number): number | null {
  if (value === null) {
    return null;
  }
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Line chart with one point per day; `null` values leave a gap that is bridged. */
export function lineConfig(
  days: readonly DayLike[],
  label: string,
  values: (number | null)[],
  color: string = LINE_COLOR,
): ChartConfiguration {
  return {
    type: 'line',
    data: {
      labels: labelsOf(days),
      datasets: [
        {
          label,
          data: values,
          borderColor: color,
          backgroundColor: color,
          spanGaps: true,
          tension: 0.25,
        },
      ],
    },
    options: {
      ...BASE_OPTIONS,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  };
}
