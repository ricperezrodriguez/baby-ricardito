import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { formatBathCount, formatHairWashed } from '@app/features/bath/bath.labels';
import { BathReactionIcon } from '@app/features/bath/bath-reaction-icon';
import { Bath, BathReaction } from '@app/features/bath/bath.models';
import { BathService } from '@app/features/bath/bath.service';
import {
  createPagedList,
  HistoryDay,
  HistoryList,
  HistoryRow,
  parseTimestamp,
  RECORD_DIALOG_ROUTE,
  RecordFlags,
} from '@shared';

interface BathRow {
  id: string;
  bathedMs: number;
  hairWashed: boolean;
  reaction: BathReaction | null;
  hasNotes: boolean;
  link: string[];
}

function toRow(bath: Bath): BathRow | null {
  const bathedMs = parseTimestamp(bath.bathedAt);
  if (bathedMs === null) {
    return null;
  }

  return {
    id: bath.id,
    bathedMs,
    hairWashed: bath.hairWashed,
    reaction: bath.reaction ?? null,
    hasNotes: !!bath.notes?.trim(),
    link: ['/detalle/bano', bath.id],
  };
}

function summaryOf(rows: readonly BathRow[]): string {
  return formatBathCount(rows.length);
}

/** Baths grouped by day, loaded page by page as the user scrolls down. */
@Component({
  selector: 'app-bath-history-list',
  imports: [
    BathReactionIcon,
    DatePipe,
    HistoryDay,
    HistoryList,
    HistoryRow,
    MatIconModule,
    RecordFlags,
  ],
  template: `
    <app-history-list
      [list]="list"
      accent="var(--app-card-bath)"
      loadingLabel="Cargando el historial"
      emptyMessage="Todavía no hay baños registrados."
      errorMessage="No se ha podido cargar el historial."
      loadingMoreLabel="Cargando más baños"
    >
      @for (group of list.groups(); track group.key) {
        <app-history-day [key]="group.key" [heading]="group.heading" [summary]="group.summary">
          @for (row of group.rows; track row.id) {
            <li appHistoryRow [link]="row.link">
              <span historyTime>{{ row.bathedMs | date: 'HH:mm' }}</span>
              <strong historyMain>Baño</strong>
              <span historyDetails>
                @if (row.hairWashed) {
                  <span class="hair">
                    <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">shower</mat-icon>
                    {{ hairWashedText }}
                  </span>
                }
                @if (row.reaction; as reaction) {
                  <app-bath-reaction-icon class="reaction" [reaction]="reaction" />
                }
                <app-record-flags [hasNotes]="row.hasNotes" />
              </span>
            </li>
          }
        </app-history-day>
      }
    </app-history-list>
  `,
  // Only what is specific to a bath row (same flag look as the diaper "Rojeces"); the list, day and
  // row layout live in `app-history-list`.
  styles: `
    .hair {
      align-items: center;
      display: inline-flex;
      font-weight: 500;
      gap: 0.25rem;

      mat-icon {
        color: var(--app-card-bath);
        font-size: 1.1rem;
        height: 1.1rem;
        width: 1.1rem;
      }
    }

    /* Same size as the hair icon; the face takes its colour and 1em size from the component. */
    .reaction {
      font-size: 1.1rem;
    }
  `,
})
export class BathHistoryList {
  private readonly service = inject(BathService);

  protected readonly hairWashedText = formatHairWashed(true);

  protected readonly list = createPagedList<Bath, BathRow>({
    load: (page) => this.service.getPage(CURRENT_BABY_ID, page),
    toRow,
    timeOf: ({ bathedMs }) => bathedMs,
    summaryOf,
    dialogRoute: RECORD_DIALOG_ROUTE,
  });
}
