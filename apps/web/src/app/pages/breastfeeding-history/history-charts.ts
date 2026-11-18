import { ChartConfiguration, TooltipItem } from 'chart.js';
import { BreastfeedingDayStats, BreastfeedingStatsTotals } from '@app/features/breastfeeding/breastfeeding.models';
import { BASE_OPTIONS, labelsOf, LINE_COLOR, lineConfig, round } from '@app/shared/history/chart-config.utils';
import { formatDurationText } from '@shared';

const LEFT_COLOR = '#99620d';
const RIGHT_COLOR = '#285c8c';

export function feedsPerDayConfig(days: readonly BreastfeedingDayStats[]): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels: labelsOf(days),
      datasets: [{ label: 'Tomas', data: days.map(({ feeds }) => feeds), backgroundColor: LINE_COLOR }],
    },
    options: {
      ...BASE_OPTIONS,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  };
}

export function minutesPerDayConfig(days: readonly BreastfeedingDayStats[]): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels: labelsOf(days),
      datasets: [
        { label: 'Izquierdo (min)', data: days.map(({ leftSeconds }) => round(leftSeconds / 60, 0)), backgroundColor: LEFT_COLOR },
        { label: 'Derecho (min)', data: days.map(({ rightSeconds }) => round(rightSeconds / 60, 0)), backgroundColor: RIGHT_COLOR },
      ],
    },
    options: {
      ...BASE_OPTIONS,
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
    },
  };
}

export function breastSplitConfig(totals: BreastfeedingStatsTotals): ChartConfiguration {
  const total = totals.leftSeconds + totals.rightSeconds;
  return {
    type: 'doughnut',
    data: {
      labels: ['Izquierdo', 'Derecho'],
      datasets: [
        {
          label: 'Tiempo',
          data: [totals.leftSeconds, totals.rightSeconds],
          backgroundColor: [LEFT_COLOR, RIGHT_COLOR],
        },
      ],
    },
    options: {
      ...BASE_OPTIONS,
      plugins: {
        tooltip: {
          callbacks: {
            label: (item: TooltipItem<'doughnut'>) => {
              const seconds = item.parsed;
              const percent = total === 0 ? 0 : Math.round((seconds / total) * 100);
              return `${item.label}: ${formatDurationText(seconds * 1_000)} (${percent} %)`;
            },
          },
        },
      },
    } as ChartConfiguration['options'],
  };
}

export function averageDurationConfig(days: readonly BreastfeedingDayStats[]): ChartConfiguration {
  return lineConfig(
    days,
    'Duración media (min)',
    days.map(({ averageDurationSeconds }) => round(averageDurationSeconds === null ? null : averageDurationSeconds / 60, 1)),
  );
}

export function averageIntervalConfig(days: readonly BreastfeedingDayStats[]): ChartConfiguration {
  return lineConfig(
    days,
    'Intervalo medio (h)',
    days.map(({ averageIntervalSeconds }) => round(averageIntervalSeconds === null ? null : averageIntervalSeconds / 3_600, 1)),
  );
}
