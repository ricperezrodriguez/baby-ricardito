import { NAIL_AREA_LABELS } from '@app/features/nail-trimming/nail-trimming.labels';
import {
  NailTrimInterval,
  NailTrimmingStatsTotals,
} from '@app/features/nail-trimming/nail-trimming.models';
import { BASE_OPTIONS } from '@app/shared/history/chart-config.utils';
import { formatDayLabel } from '@shared';
import { ChartConfiguration, TooltipItem } from 'chart.js';

/** Same palette as the diaper split (mirror `--app-blue`, `--app-ochre`, `--app-purple`); each is also named in legends and tooltips. */
const HANDS_COLOR = '#285c8c';
const FEET_COLOR = '#99620d';
const BOTH_COLOR = '#51468d';

const AREA_SPLIT_LABELS = [
  `Solo ${NAIL_AREA_LABELS.hands.toLowerCase()}`,
  `Solo ${NAIL_AREA_LABELS.feet.toLowerCase()}`,
  `${NAIL_AREA_LABELS.hands} y ${NAIL_AREA_LABELS.feet.toLowerCase()}`,
];

interface IntervalSlot {
  date: string;
  hands: number | null;
  feet: number | null;
}

/** One slot per date; a second interval of the same zone on the same date gets its own slot. */
function intervalSlots(intervals: readonly NailTrimInterval[]): IntervalSlot[] {
  const slots: IntervalSlot[] = [];
  const ordered = [...intervals].sort((a, b) => a.date.localeCompare(b.date));
  for (const { date, area, days } of ordered) {
    const slot = slots.find((candidate) => candidate.date === date && candidate[area] === null);
    if (slot === undefined) {
      slots.push({ date, hands: null, feet: null, [area]: days });
    } else {
      slot[area] = days;
    }
  }
  return slots;
}

/** Grouped bars: days since the previous trim of each zone; `null` where the zone has no interval. */
export function intervalsConfig(intervals: readonly NailTrimInterval[]): ChartConfiguration {
  const slots = intervalSlots(intervals);
  return {
    type: 'bar',
    data: {
      labels: slots.map(({ date }) => formatDayLabel(date)),
      datasets: [
        {
          label: NAIL_AREA_LABELS.hands,
          data: slots.map(({ hands }) => hands),
          backgroundColor: HANDS_COLOR,
        },
        {
          label: NAIL_AREA_LABELS.feet,
          data: slots.map(({ feet }) => feet),
          backgroundColor: FEET_COLOR,
        },
      ],
    },
    options: {
      ...BASE_OPTIONS,
      plugins: {
        tooltip: {
          callbacks: {
            label: (item: TooltipItem<'bar'>) =>
              `${item.dataset.label}: ${item.parsed.y} ${item.parsed.y === 1 ? 'día' : 'días'}`,
          },
        },
      },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    } as ChartConfiguration['options'],
  };
}

/** Exclusive buckets (`handsOnly + feetOnly + both === trims`). */
export function areaSplitConfig(totals: NailTrimmingStatsTotals): ChartConfiguration {
  return {
    type: 'doughnut',
    data: {
      labels: AREA_SPLIT_LABELS,
      datasets: [
        {
          label: 'Cortes',
          data: [totals.handsOnly, totals.feetOnly, totals.both],
          backgroundColor: [HANDS_COLOR, FEET_COLOR, BOTH_COLOR],
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
              const percent = totals.trims === 0 ? 0 : Math.round((count / totals.trims) * 100);
              return `${item.label}: ${count} (${percent} %)`;
            },
          },
        },
      },
    } as ChartConfiguration['options'],
  };
}
