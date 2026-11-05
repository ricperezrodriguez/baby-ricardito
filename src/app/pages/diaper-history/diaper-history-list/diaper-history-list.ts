import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import {
  DIAPER_TYPE_LABELS,
  STOOL_COLOR_LABELS,
  STOOL_CONSISTENCY_LABELS,
} from '@app/features/diaper/diaper.labels';
import { DIAPER_TYPE, DiaperChange, DiaperType } from '@app/features/diaper/diaper.models';
import { DiaperService } from '@app/features/diaper/diaper.service';
import {
  createPagedList,
  DiaperTypeIcon,
  HistoryDay,
  HistoryList,
  HistoryRow,
  parseTimestamp,
  RECORD_DIALOG_ROUTE,
  RecordFlags,
} from '@shared';

interface ChangeRow {
  id: string;
  changedMs: number;
  type: DiaperType;
  typeLabel: string;
  stoolColor: string | null;
  consistency: string | null;
  hasRash: boolean;
  hasNotes: boolean;
  hasPhoto: boolean;
  link: string[];
}

function toRow(change: DiaperChange): ChangeRow | null {
  const changedMs = parseTimestamp(change.changedAt);
  if (changedMs === null) {
    return null;
  }

  return {
    id: change.id,
    changedMs,
    type: change.type,
    typeLabel: DIAPER_TYPE_LABELS[change.type],
    stoolColor: change.stoolColor === null ? null : STOOL_COLOR_LABELS[change.stoolColor],
    consistency:
      change.stoolConsistency === null ? null : STOOL_CONSISTENCY_LABELS[change.stoolConsistency],
    hasRash: change.hasRash,
    hasNotes: !!change.notes?.trim(),
    hasPhoto: !!change.photoUrl,
    link: ['/detalle/panal', change.id],
  };
}

/** "N cambios · X con pis · Y con caca"; `both` counts in each of the last two. */
function summaryOf(rows: readonly ChangeRow[]): string {
  const wet = rows.filter(({ type }) => type !== DIAPER_TYPE.DIRTY).length;
  const dirty = rows.filter(({ type }) => type !== DIAPER_TYPE.WET).length;
  const count = rows.length;
  return `${count} ${count === 1 ? 'cambio' : 'cambios'} · ${wet} con pis · ${dirty} con caca`;
}

/** Diaper changes grouped by day, loaded page by page as the user scrolls down. */
@Component({
  selector: 'app-diaper-history-list',
  imports: [
    DatePipe,
    DiaperTypeIcon,
    HistoryDay,
    HistoryList,
    HistoryRow,
    MatIconModule,
    RecordFlags,
  ],
  styleUrl: './diaper-history-list.scss',
  templateUrl: './diaper-history-list.html',
})
export class DiaperHistoryList {
  private readonly service = inject(DiaperService);

  protected readonly list = createPagedList<DiaperChange, ChangeRow>({
    load: (page) => this.service.getPage(CURRENT_BABY_ID, page),
    toRow,
    timeOf: ({ changedMs }) => changedMs,
    summaryOf,
    dialogRoute: RECORD_DIALOG_ROUTE,
  });
}
