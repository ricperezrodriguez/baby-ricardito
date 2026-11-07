import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { formatDayLabel, weekdayOfDay } from '@app/shared/utils/time.utils';

/**
 * Status of a local day:
 * `given` (done), `missed` (not done), `pending` (today, still open) and
 * `notStarted` (before the tracking began; shown empty).
 */
export type DayCalendarStatus = 'given' | 'missed' | 'pending' | 'notStarted';

export interface DayCalendarDay {
  /** Local day, `yyyy-MM-dd` */
  date: string;
  status: DayCalendarStatus;
}

/** What a calendar card needs; the page builds it from its stats. */
export interface DayCalendarData {
  /** Consecutive local days, ascending. */
  days: readonly DayCalendarDay[];
  /** Any CSS color of the tracker. */
  color: string;
  /** Accessible table caption. */
  caption: string;
}

interface CalendarCell {
  key: string;
  /** Day of the month; `null` for the padding cells outside the range. */
  dayNumber: number | null;
  status: DayCalendarStatus | null;
  /** Full day label plus status, for the tooltip and screen readers. */
  title: string;
  /** Only days that carry information have a status text. */
  statusText: string | null;
  icon: string | null;
}

const WEEKDAYS = [
  { initial: 'L', name: 'Lunes' },
  { initial: 'M', name: 'Martes' },
  { initial: 'X', name: 'Miércoles' },
  { initial: 'J', name: 'Jueves' },
  { initial: 'V', name: 'Viernes' },
  { initial: 'S', name: 'Sábado' },
  { initial: 'D', name: 'Domingo' },
];

const STATUS_TEXTS: Record<DayCalendarStatus, string | null> = {
  given: 'toma dada',
  missed: 'sin toma',
  pending: 'pendiente',
  notStarted: null,
};

/** The state is never colour-only: each one has its own icon or outline plus hidden text. */
const STATUS_ICONS: Record<DayCalendarStatus, string | null> = {
  given: 'check',
  missed: 'close',
  pending: null,
  notStarted: null,
};

function toCell({ date, status }: DayCalendarDay): CalendarCell {
  const statusText = STATUS_TEXTS[status];
  const label = formatDayLabel(date);
  return {
    key: date,
    dayNumber: Number(date.slice(8)),
    status,
    title: statusText === null ? label : `${label}: ${statusText}`,
    statusText,
    icon: STATUS_ICONS[status],
  };
}

function paddingCell(key: string): CalendarCell {
  return { key, dayNumber: null, status: null, title: '', statusText: null, icon: null };
}

/**
 * Calendar of a range of days: weeks as rows, Monday to Sunday as columns.
 * Plain HTML table without Chart.js.
 */
@Component({
  selector: 'app-day-calendar',
  imports: [MatIconModule],
  host: { '[style.--calendar-color]': 'color()' },
  styles: `
    :host {
      display: block;
    }

    table {
      border-collapse: separate;
      border-spacing: 3px;
      margin-inline: auto;
      max-width: 26rem;
      table-layout: fixed;
      width: 100%;
    }

    th {
      color: var(--app-muted);
      font-size: 0.75rem;
      font-weight: 500;
    }

    td {
      padding: 0;
    }

    .cell {
      align-items: center;
      border: 2px solid transparent;
      border-radius: 0.5rem;
      box-sizing: border-box;
      color: var(--app-muted);
      display: flex;
      flex-direction: column;
      font-size: 0.75rem;
      height: 2.75rem;
      justify-content: center;
      line-height: 1.1;
    }

    mat-icon {
      font-size: 1rem;
      height: 1rem;
      line-height: 1rem;
      width: 1rem;
    }

    .given {
      background: var(--calendar-color);
      border-color: var(--calendar-color);
      color: var(--app-surface);
    }

    .missed {
      border-color: var(--calendar-color);
      color: var(--app-ink);
    }

    .pending {
      border-color: var(--calendar-color);
      border-style: dotted;
      color: var(--app-ink);
    }

    .legend {
      color: var(--app-muted);
      display: flex;
      flex-wrap: wrap;
      font-size: 0.75rem;
      gap: 0.25rem 1rem;
      justify-content: center;
      list-style: none;
      margin: 0.5rem 0 0;
      padding: 0;
    }

    .legend li {
      align-items: center;
      display: inline-flex;
      gap: 0.35rem;
    }

    .legend .cell {
      height: 1.25rem;
      width: 1.25rem;
    }
  `,
  template: `
    <table>
      <caption class="visually-hidden">
        {{ caption() }}
      </caption>
      <thead>
        <tr>
          @for (weekday of weekdays; track weekday.name) {
            <th scope="col">
              <span aria-hidden="true">{{ weekday.initial }}</span>
              <span class="visually-hidden">{{ weekday.name }}</span>
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @for (week of weeks(); track $index) {
          <tr>
            @for (cell of week; track cell.key) {
              <td [title]="cell.title">
                @if (cell.dayNumber !== null) {
                  <div class="cell" [class]="cell.status">
                    <span aria-hidden="true">{{ cell.dayNumber }}</span>
                    @if (cell.icon; as icon) {
                      <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">{{ icon }}</mat-icon>
                    }
                    @if (cell.statusText !== null) {
                      <span class="visually-hidden">{{ cell.title }}</span>
                    }
                  </div>
                }
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
    <ul class="legend">
      <li>
        <span class="cell given"><mat-icon fontSet="material-symbols-outlined" aria-hidden="true">check</mat-icon></span>
        Toma dada
      </li>
      <li>
        <span class="cell missed"><mat-icon fontSet="material-symbols-outlined" aria-hidden="true">close</mat-icon></span>
        Sin toma
      </li>
      <li>
        <span class="cell pending"></span>
        Pendiente (hoy)
      </li>
    </ul>
  `,
})
export class DayCalendar {
  readonly days = input.required<readonly DayCalendarDay[]>();
  /** Any CSS color of the tracker. */
  readonly color = input.required<string>();
  readonly caption = input.required<string>();

  protected readonly weekdays = WEEKDAYS;

  /** Weeks of 7 cells; the first and last week are padded with empty cells. */
  protected readonly weeks = computed(() => {
    const days = this.days();
    if (days.length === 0) {
      return [];
    }

    const cells: CalendarCell[] = [
      ...Array.from({ length: weekdayOfDay(days[0].date) }, (_, index) => paddingCell(`before-${index}`)),
      ...days.map(toCell),
    ];
    const trailing = (WEEKDAYS.length - (cells.length % WEEKDAYS.length)) % WEEKDAYS.length;
    for (let index = 0; index < trailing; index++) {
      cells.push(paddingCell(`after-${index}`));
    }

    return Array.from({ length: cells.length / WEEKDAYS.length }, (_, week) =>
      cells.slice(week * WEEKDAYS.length, (week + 1) * WEEKDAYS.length),
    );
  });
}
