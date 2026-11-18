import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import {
  formatNailAreas,
  formatNailTrimCount,
} from '@app/features/nail-trimming/nail-trimming.labels';
import { NailTrim } from '@app/features/nail-trimming/nail-trimming.models';
import { NailTrimmingService } from '@app/features/nail-trimming/nail-trimming.service';
import {
  createPagedList,
  HistoryDay,
  HistoryList,
  HistoryRow,
  parseTimestamp,
  RECORD_DIALOG_ROUTE,
  RecordFlags,
} from '@shared';

interface TrimRow {
  id: string;
  trimmedMs: number;
  areasText: string;
  hasNotes: boolean;
  link: string[];
}

function toRow(trim: NailTrim): TrimRow | null {
  const trimmedMs = parseTimestamp(trim.trimmedAt);
  if (trimmedMs === null) {
    return null;
  }

  return {
    id: trim.id,
    trimmedMs,
    areasText: formatNailAreas(trim.areas),
    hasNotes: !!trim.notes?.trim(),
    link: ['/detalle/cortar-unas', trim.id],
  };
}

function summaryOf(rows: readonly TrimRow[]): string {
  return formatNailTrimCount(rows.length);
}

/** Nail trims grouped by day, loaded page by page as the user scrolls down. */
@Component({
  selector: 'app-nail-trimming-history-list',
  imports: [DatePipe, HistoryDay, HistoryList, HistoryRow, RecordFlags],
  template: `
    <app-history-list
      [list]="list"
      accent="var(--app-card-nail-trimming)"
      loadingLabel="Cargando el historial"
      emptyMessage="Todavía no hay cortes de uñas registrados."
      errorMessage="No se ha podido cargar el historial."
      loadingMoreLabel="Cargando más cortes"
    >
      @for (group of list.groups(); track group.key) {
        <app-history-day [key]="group.key" [heading]="group.heading" [summary]="group.summary">
          @for (row of group.rows; track row.id) {
            <li appHistoryRow [link]="row.link">
              <span historyTime>{{ row.trimmedMs | date: 'HH:mm' }}</span>
              <strong historyMain>{{ row.areasText }}</strong>
              <span historyDetails>
                <app-record-flags [hasNotes]="row.hasNotes" />
              </span>
            </li>
          }
        </app-history-day>
      }
    </app-history-list>
  `,
})
export class NailTrimmingHistoryList {
  private readonly service = inject(NailTrimmingService);

  protected readonly list = createPagedList<NailTrim, TrimRow>({
    load: (page) => this.service.getPage(CURRENT_BABY_ID, page),
    toRow,
    timeOf: ({ trimmedMs }) => trimmedMs,
    summaryOf,
    dialogRoute: RECORD_DIALOG_ROUTE,
  });
}
