import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { formatDoseCount, formatDrops } from '@app/features/vitamin-d/vitamin-d.labels';
import { VitaminDDose } from '@app/features/vitamin-d/vitamin-d.models';
import { VitaminDService } from '@app/features/vitamin-d/vitamin-d.service';
import {
  createPagedList,
  HistoryDay,
  HistoryList,
  HistoryRow,
  parseTimestamp,
  RECORD_DIALOG_ROUTE,
  RecordFlags,
} from '@shared';

interface DoseRow {
  id: string;
  givenMs: number;
  /** `null` when the drops were not recorded. */
  drops: number | null;
  dropsText: string | null;
  hasNotes: boolean;
  link: string[];
}

function toRow(dose: VitaminDDose): DoseRow | null {
  const givenMs = parseTimestamp(dose.givenAt);
  if (givenMs === null) {
    return null;
  }

  const drops = dose.drops ?? null;
  return {
    id: dose.id,
    givenMs,
    drops,
    dropsText: drops === null ? null : formatDrops(drops),
    hasNotes: !!dose.notes?.trim(),
    link: ['/detalle/vitamina-d', dose.id],
  };
}

/** "N tomas" plus " · N gotas" when some of them have drops (singular "1 toma"). */
function summaryOf(rows: readonly DoseRow[]): string {
  const withDrops = rows.filter(({ drops }) => drops !== null);
  const doses = formatDoseCount(rows.length);
  if (withDrops.length === 0) {
    return doses;
  }
  const totalDrops = withDrops.reduce((total, { drops }) => total + (drops ?? 0), 0);
  return `${doses} · ${formatDrops(totalDrops)}`;
}

/** Vitamin D doses grouped by day, loaded page by page as the user scrolls down. */
@Component({
  selector: 'app-vitamin-d-history-list',
  imports: [DatePipe, HistoryDay, HistoryList, HistoryRow, RecordFlags],
  template: `
    <app-history-list
      [list]="list"
      accent="var(--app-card-vitamin-d)"
      loadingLabel="Cargando el historial"
      emptyMessage="Todavía no hay tomas de vitamina D registradas."
      errorMessage="No se ha podido cargar el historial."
      loadingMoreLabel="Cargando más tomas"
    >
      @for (group of list.groups(); track group.key) {
        <app-history-day [key]="group.key" [heading]="group.heading" [summary]="group.summary">
          @for (row of group.rows; track row.id) {
            <li appHistoryRow [link]="row.link">
              <span historyTime>{{ row.givenMs | date: 'HH:mm' }}</span>
              <strong historyMain>Vitamina D</strong>
              <span historyDetails>
                @if (row.dropsText) {
                  <span>{{ row.dropsText }}</span>
                }
                <app-record-flags [hasNotes]="row.hasNotes" />
              </span>
            </li>
          }
        </app-history-day>
      }
    </app-history-list>
  `,
})
export class VitaminDHistoryList {
  private readonly service = inject(VitaminDService);

  protected readonly list = createPagedList<VitaminDDose, DoseRow>({
    load: (page) => this.service.getPage(CURRENT_BABY_ID, page),
    toRow,
    timeOf: ({ givenMs }) => givenMs,
    summaryOf,
    dialogRoute: RECORD_DIALOG_ROUTE,
  });
}
