import { ChartConfiguration } from 'chart.js';
import { BottleDayStats } from '@app/features/bottle/bottle.models';
import { BASE_OPTIONS, labelsOf, LINE_COLOR, lineConfig, round } from '@app/shared/history/chart-config.utils';

/** Bars with a single color: the milk type is not split in the charts. */
function barConfig(days: readonly BottleDayStats[], label: string, values: number[]): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels: labelsOf(days),
      datasets: [{ label, data: values, backgroundColor: LINE_COLOR }],
    },
    options: {
      ...BASE_OPTIONS,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  };
}

export function feedsPerDayConfig(days: readonly BottleDayStats[]): ChartConfiguration {
  return barConfig(
    days,
    'Biberones',
    days.map(({ feeds }) => feeds),
  );
}

export function mlPerDayConfig(days: readonly BottleDayStats[]): ChartConfiguration {
  return barConfig(
    days,
    'Mililitros (ml)',
    days.map(({ totalMl }) => totalMl),
  );
}

export function averageAmountConfig(days: readonly BottleDayStats[]): ChartConfiguration {
  return lineConfig(
    days,
    'Cantidad media (ml)',
    days.map(({ averageAmountMl }) => averageAmountMl),
  );
}

export function averageIntervalConfig(days: readonly BottleDayStats[]): ChartConfiguration {
  return lineConfig(
    days,
    'Intervalo medio (h)',
    days.map(({ averageIntervalSeconds }) => round(averageIntervalSeconds === null ? null : averageIntervalSeconds / 3_600, 1)),
  );
}
