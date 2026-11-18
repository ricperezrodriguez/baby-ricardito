import { ChartConfiguration } from 'chart.js';
import { SleepDayStats } from '@app/features/sleep/sleep.models';
import { BASE_OPTIONS, labelsOf, LINE_COLOR, lineConfig, round } from '@app/shared/history/chart-config.utils';

/** Naps and night sleeps (mirror `--app-ochre` and `--app-purple`); they also differ in line style, shape and legend name. */
const NAP_COLOR = '#99620d';
const NIGHT_COLOR = '#51468d';

const SECONDS_PER_HOUR = 3_600;

function toHours(seconds: number | null): number | null {
  return round(seconds === null ? null : seconds / SECONDS_PER_HOUR, 1);
}

export function sleepsPerDayConfig(days: readonly SleepDayStats[]): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels: labelsOf(days),
      datasets: [{ label: 'Sueños', data: days.map(({ sleeps }) => sleeps), backgroundColor: LINE_COLOR }],
    },
    options: {
      ...BASE_OPTIONS,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  };
}

/** Time asleep per local day (a sleep crossing midnight is already split by the backend). */
export function hoursPerDayConfig(days: readonly SleepDayStats[]): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels: labelsOf(days),
      datasets: [{ label: 'Horas dormidas', data: days.map(({ totalSeconds }) => toHours(totalSeconds)), backgroundColor: LINE_COLOR }],
    },
    options: {
      ...BASE_OPTIONS,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  };
}

/** Two lines (naps solid with circles, night dashed with squares); days without that kind of sleep are gaps. */
export function averageDurationConfig(days: readonly SleepDayStats[]): ChartConfiguration {
  return {
    type: 'line',
    data: {
      labels: labelsOf(days),
      datasets: [
        {
          label: 'Siestas (h)',
          data: days.map(({ napAverageDurationSeconds }) => toHours(napAverageDurationSeconds)),
          borderColor: NAP_COLOR,
          backgroundColor: NAP_COLOR,
          pointStyle: 'circle',
          spanGaps: true,
          tension: 0.25,
        },
        {
          label: 'Noche (h)',
          data: days.map(({ nightAverageDurationSeconds }) => toHours(nightAverageDurationSeconds)),
          borderColor: NIGHT_COLOR,
          backgroundColor: NIGHT_COLOR,
          borderDash: [6, 4],
          pointStyle: 'rect',
          spanGaps: true,
          tension: 0.25,
        },
      ],
    },
    options: {
      ...BASE_OPTIONS,
      plugins: { legend: { display: true, labels: { usePointStyle: true } } },
      scales: { y: { beginAtZero: true } },
    },
  };
}

export function averageAwakeConfig(days: readonly SleepDayStats[]): ChartConfiguration {
  return lineConfig(
    days,
    'Tiempo despierto medio (h)',
    days.map(({ averageAwakeSeconds }) => toHours(averageAwakeSeconds)),
  );
}
