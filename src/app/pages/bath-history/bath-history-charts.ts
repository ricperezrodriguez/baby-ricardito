import { formatBathIntervalDays } from '@app/features/bath/bath.labels';
import { BathInterval, BathStatsTotals } from '@app/features/bath/bath.models';
import { BASE_OPTIONS } from '@app/shared/history/chart-config.utils';
import { formatDayLabel } from '@shared';
import { ChartConfiguration, TooltipItem } from 'chart.js';

/** Mirror `--app-card-bath` (`--app-blue`) and `--app-ochre`; each is also named in legends and tooltips. */
const BATH_COLOR = '#285c8c';
const NO_HAIR_COLOR = '#99620d';

const HAIR_SPLIT_LABELS = ['Con lavado de pelo', 'Sin lavado de pelo'];

/** One bar per interval: whole days since the previous bath, on the day of the most recent one. */
export function intervalsConfig(intervals: readonly BathInterval[]): ChartConfiguration {
  const ordered = [...intervals].sort((a, b) => a.date.localeCompare(b.date));
  return {
    type: 'bar',
    data: {
      labels: ordered.map(({ date }) => formatDayLabel(date)),
      datasets: [
        {
          label: 'Días entre baños',
          data: ordered.map(({ days }) => days),
          backgroundColor: BATH_COLOR,
        },
      ],
    },
    options: {
      ...BASE_OPTIONS,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item: TooltipItem<'bar'>) => formatBathIntervalDays(item.parsed.y ?? 0),
          },
        },
      },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    } as ChartConfiguration['options'],
  };
}

/** Baths with and without the hair washed (`hairWashes + rest === baths`). */
export function hairSplitConfig(totals: BathStatsTotals): ChartConfiguration {
  const withHair = totals.hairWashes;
  const withoutHair = Math.max(totals.baths - totals.hairWashes, 0);
  return {
    type: 'doughnut',
    data: {
      labels: HAIR_SPLIT_LABELS,
      datasets: [
        {
          label: 'Baños',
          data: [withHair, withoutHair],
          backgroundColor: [BATH_COLOR, NO_HAIR_COLOR],
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
              const percent = totals.baths === 0 ? 0 : Math.round((count / totals.baths) * 100);
              return `${item.label}: ${count} (${percent} %)`;
            },
          },
        },
      },
    } as ChartConfiguration['options'],
  };
}
