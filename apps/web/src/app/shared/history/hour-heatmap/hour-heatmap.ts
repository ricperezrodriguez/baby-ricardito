import { Component, computed, input } from '@angular/core';

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export interface HeatmapUnit {
  singular: string;
  plural: string;
}

/** Records per weekday and hour, with color intensity proportional to their number. No Chart.js dependency. */
@Component({
  selector: 'app-hour-heatmap',
  host: { '[style.--heat-color]': 'color()' },
  styles: `
    :host {
      display: block;
    }

    table {
      border-collapse: separate;
      border-spacing: 2px;
      table-layout: fixed;
      width: 100%;
    }

    th {
      color: var(--app-muted);
      font-size: 0.75rem;
      font-weight: 500;
    }

    thead th {
      overflow: visible;
      text-align: start;
      white-space: nowrap;
    }

    .corner {
      width: 4.5rem;
    }

    tbody th {
      padding-inline-end: 0.5rem;
      text-align: end;
    }

    td {
      background: color-mix(in srgb, var(--heat-color) calc(var(--level) * 1%), #fff);
      border: 1px solid var(--app-border);
      border-radius: 0.25rem;
      height: 1.5rem;
    }

    .legend {
      align-items: center;
      color: var(--app-muted);
      display: flex;
      font-size: 0.75rem;
      gap: 0.35rem;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }

    .swatch {
      background: color-mix(in srgb, var(--heat-color) calc(var(--level) * 1%), #fff);
      border: 1px solid var(--app-border);
      border-radius: 0.25rem;
      display: inline-block;
      height: 0.9rem;
      width: 0.9rem;
    }
  `,
  template: `
    <table>
      <caption class="visually-hidden">
        {{ caption() }}
      </caption>
      <thead>
        <tr>
          <th class="corner" scope="col"><span class="visually-hidden">Día</span></th>
          @for (hour of hours; track hour) {
            <th scope="col">
              @if (hour % 3 === 0) {
                <span aria-hidden="true">{{ hour }}h</span>
                <span class="visually-hidden">{{ hour }} horas</span>
              } @else {
                <span class="visually-hidden">{{ hour }} horas</span>
              }
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track row.weekday) {
          <tr>
            <th scope="row">{{ row.weekday }}</th>
            @for (cell of row.cells; track $index) {
              <td [style.--level]="cell.level" [title]="cell.title">
                <span class="visually-hidden">{{ cell.count }}</span>
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
    <div class="legend" aria-hidden="true">
      Menos
      @for (level of legendLevels; track level) {
        <span class="swatch" [style.--level]="level"></span>
      }
      Más
    </div>
  `,
})
export class HourHeatmap {
  /** Records per weekday (0 = Monday) and hour (0-23). */
  readonly hourMap = input.required<number[][]>();
  /** Any CSS color; the cell tint grows from white towards it. */
  readonly color = input('var(--app-card-breastfeeding)');
  readonly caption = input('Tomas empezadas por día de la semana y hora del día');
  readonly unit = input<HeatmapUnit>({ singular: 'toma', plural: 'tomas' });

  protected readonly hours = HOURS;
  protected readonly legendLevels = [0, 25, 50, 75, 100];

  protected readonly rows = computed(() => {
    const map = this.hourMap();
    const max = Math.max(1, ...map.flat());
    const { singular, plural } = this.unit();
    return WEEKDAYS.map((weekday, weekdayIndex) => ({
      weekday,
      cells: HOURS.map((hour) => {
        const count = map[weekdayIndex]?.[hour] ?? 0;
        return {
          count,
          level: Math.round((count / max) * 100),
          title: `${weekday} ${hour}h: ${count} ${count === 1 ? singular : plural}`,
        };
      }),
    }));
  });
}
