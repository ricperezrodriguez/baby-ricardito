import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/**
 * Row of a history list, a full-width link to the record. Put the content in three slots:
 * `historyTime` (first column), `historyMain` and `historyDetails` (secondary data, right aligned).
 */
@Component({
  selector: 'li[appHistoryRow]',
  imports: [MatIconModule, RouterLink],
  styles: `
    :host {
      display: block;
    }

    :host(:not(:first-child)) {
      border-top: 1px solid var(--app-border);
    }

    .history-row {
      align-items: center;
      color: inherit;
      display: grid;
      gap: 0.25rem 1rem;
      grid-template-columns: var(--history-time-width, 3.5rem) minmax(6rem, auto) 1fr auto;
      min-height: 3rem;
      padding: 0.5rem 1rem;
      text-decoration: none;
    }

    .history-row:hover {
      background: color-mix(in srgb, var(--history-accent, var(--app-green)) 8%, var(--app-surface));
    }

    .history-row:focus-visible {
      outline: 3px solid var(--app-focus);
      outline-offset: -3px;
    }

    .time {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }

    .in-progress .time {
      color: var(--history-accent, var(--app-green));
    }

    .details {
      align-items: center;
      color: var(--app-muted);
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.75rem;
      justify-content: flex-end;
    }

    .chevron {
      color: var(--app-muted);
    }

    @media (max-width: 600px) {
      .history-row {
        grid-template-columns: auto 1fr auto;
      }

      .details {
        grid-column: 1 / 3;
        grid-row: 2;
        justify-content: flex-start;
      }

      .chevron {
        grid-column: 3;
        grid-row: 1 / 3;
      }
    }
  `,
  template: `
    <a class="history-row" [class.in-progress]="inProgress()" [routerLink]="link()">
      <span class="time"><ng-content select="[historyTime]" /></span>
      <span class="main"><ng-content select="[historyMain]" /></span>
      <span class="details"><ng-content select="[historyDetails]" /></span>
      <mat-icon class="chevron" fontSet="material-symbols-outlined" aria-hidden="true">chevron_right</mat-icon>
    </a>
  `,
})
export class HistoryRow {
  /** Route that opens the record: its modal, or the creation route if it is still running. */
  readonly link = input.required<string[]>();
  /** Highlights the time with the tracker color (a record that is still running). */
  readonly inProgress = input(false);
}
