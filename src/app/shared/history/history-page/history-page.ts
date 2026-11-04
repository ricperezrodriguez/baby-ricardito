import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AsyncState } from '@app/shared/async-state/async-state';
import { HistoryChart } from '@app/shared/history/history-chart/history-chart';
import { HistoryPageState } from '@app/shared/history/history-stats';
import { HeatmapUnit, HourHeatmap } from '@app/shared/history/hour-heatmap/hour-heatmap';
import { ChartConfiguration } from 'chart.js';

export interface HistorySummaryItem {
  label: string;
  value: string;
}

export interface HistoryHeatmapOptions {
  /** Any CSS color; the cell tint grows from white towards it. */
  color: string;
  caption: string;
  unit: HeatmapUnit;
}

/** Stats of the period ready to render; the page builds it from its own stats. */
export interface HistoryPageContent<Id extends string> {
  summary: HistorySummaryItem[];
  /** False when the period has no records: the charts are replaced by `emptyMessage`. */
  hasData: boolean;
  /** Records per weekday (0 = Monday) and hour (0-23), for the `hourMap` chart. */
  hourMap: number[][];
  /** Configuration of every chart but `hourMap`. */
  charts: Partial<Record<Id, ChartConfiguration>>;
  /** Text shown in a chart card instead of the chart (e.g. nothing to plot). */
  notices?: Partial<Record<Id, string>>;
}

/**
 * Common layout of a history page: header with period, summary, charts with their visibility chips
 * and the records section (projected content). Must live in the lazy page chunk: it pulls Chart.js,
 * so it is never exported from the `@shared` barrel. Chart ids must include `hourMap`.
 */
@Component({
  selector: 'app-history-page',
  imports: [
    AsyncState,
    HistoryChart,
    HourHeatmap,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatIconModule,
    RouterLink,
    RouterOutlet,
  ],
  styleUrl: './history-page.scss',
  templateUrl: './history-page.html',
})
export class HistoryPage<Id extends string> {
  readonly history = input.required<HistoryPageState<Id>>();
  /** `undefined` until the first stats arrive. */
  readonly content = input.required<HistoryPageContent<Id> | undefined>();
  readonly heading = input.required<string>();
  readonly chartTitles = input.required<Record<Id, string>>();
  readonly emptyMessage = input.required<string>();
  readonly heatmap = input.required<HistoryHeatmapOptions>();
  /** Heading of the records section, whose list is projected. */
  readonly recordsTitle = input.required<string>();
}
