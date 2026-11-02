import { Component, computed, DestroyRef, effect, ElementRef, inject, input, viewChild } from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  DoughnutController,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);
Chart.defaults.font.family = 'Roboto, sans-serif';
Chart.defaults.color = '#4d6267';

/**
 * Chart.js chart. The canvas is not accessible, so the same data is offered as a
 * visually hidden table for screen readers.
 */
@Component({
  selector: 'app-history-chart',
  styles: `
    :host {
      display: block;
    }

    .frame {
      height: var(--chart-height, 15rem);
      position: relative;
    }
  `,
  template: `
    <div class="frame">
      <canvas #canvas aria-hidden="true"></canvas>
    </div>
    <table class="visually-hidden">
      <caption>
        {{ caption() }}
      </caption>
      <thead>
        <tr>
          <th scope="col">Categoría</th>
          @for (column of table().columns; track $index) {
            <th scope="col">{{ column }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of table().rows; track $index) {
          <tr>
            <th scope="row">{{ row.label }}</th>
            @for (value of row.values; track $index) {
              <td>{{ value ?? 'Sin datos' }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class HistoryChart {
  readonly config = input.required<ChartConfiguration>();
  readonly caption = input.required<string>();

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;

  protected readonly table = computed(() => {
    const { labels, datasets } = this.config().data;
    return {
      columns: datasets.map((dataset) => dataset.label ?? ''),
      rows: (labels ?? []).map((label, index) => ({
        label: String(label),
        values: datasets.map((dataset) => (dataset.data[index] ?? null) as number | null),
      })),
    };
  });

  constructor() {
    effect(() => {
      const canvas = this.canvas()?.nativeElement;
      const config = this.config();
      if (canvas === undefined) {
        return;
      }

      if (this.chart === null) {
        this.chart = new Chart(canvas, config);
      } else {
        this.chart.data = config.data;
        this.chart.options = config.options ?? {};
        this.chart.update();
      }
    });

    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }
}
