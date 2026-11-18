import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { BOTTLE_MILK_TYPE_LABELS, formatMl } from '@app/features/bottle/bottle.labels';
import { BottleFeed } from '@app/features/bottle/bottle.models';
import { BottleService } from '@app/features/bottle/bottle.service';
import {
  createPagedList,
  HistoryDay,
  HistoryList,
  HistoryRow,
  parseTimestamp,
  RECORD_DIALOG_ROUTE,
  RecordFlags,
} from '@shared';

interface FeedRow {
  id: string;
  fedMs: number;
  amountMl: number;
  amount: string;
  milkTypeLabel: string;
  hasNotes: boolean;
  link: string[];
}

function toRow(feed: BottleFeed): FeedRow | null {
  const fedMs = parseTimestamp(feed.fedAt);
  if (fedMs === null) {
    return null;
  }

  return {
    id: feed.id,
    fedMs,
    amountMl: feed.amountMl,
    amount: formatMl(feed.amountMl),
    milkTypeLabel: BOTTLE_MILK_TYPE_LABELS[feed.milkType],
    hasNotes: !!feed.notes?.trim(),
    link: ['/detalle/biberon', feed.id],
  };
}

/** "N biberones · X ml" (singular "1 biberón"). */
function summaryOf(rows: readonly FeedRow[]): string {
  const count = rows.length;
  const totalMl = rows.reduce((total, { amountMl }) => total + amountMl, 0);
  return `${count} ${count === 1 ? 'biberón' : 'biberones'} · ${formatMl(totalMl)}`;
}

/** Bottle feeds grouped by day, loaded page by page as the user scrolls down. */
@Component({
  selector: 'app-bottle-history-list',
  imports: [DatePipe, HistoryDay, HistoryList, HistoryRow, RecordFlags],
  template: `
    <app-history-list
      [list]="list"
      accent="var(--app-card-bottle)"
      loadingLabel="Cargando el historial"
      emptyMessage="Todavía no hay biberones registrados."
      errorMessage="No se ha podido cargar el historial."
      loadingMoreLabel="Cargando más biberones"
    >
      @for (group of list.groups(); track group.key) {
        <app-history-day [key]="group.key" [heading]="group.heading" [summary]="group.summary">
          @for (row of group.rows; track row.id) {
            <li appHistoryRow [link]="row.link">
              <span historyTime>{{ row.fedMs | date: 'HH:mm' }}</span>
              <strong historyMain>{{ row.amount }}</strong>
              <span historyDetails>
                <span>{{ row.milkTypeLabel }}</span>
                <app-record-flags [hasNotes]="row.hasNotes" />
              </span>
            </li>
          }
        </app-history-day>
      }
    </app-history-list>
  `,
})
export class BottleHistoryList {
  private readonly service = inject(BottleService);

  protected readonly list = createPagedList<BottleFeed, FeedRow>({
    load: (page) => this.service.getPage(CURRENT_BABY_ID, page),
    toRow,
    timeOf: ({ fedMs }) => fedMs,
    summaryOf,
    dialogRoute: RECORD_DIALOG_ROUTE,
  });
}
