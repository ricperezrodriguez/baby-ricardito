import { Component, input } from '@angular/core';
import { AsyncState } from '@app/shared/async-state/async-state';
import { ErrorState } from '@app/shared/async-state/error-state';
import { PagedListState } from '@app/shared/history/history-list/paged-list';
import { InView } from '@app/shared/in-view/in-view';
import { LoadingSpinner } from '@app/shared/loading-spinner/loading-spinner';

/**
 * Frame of the list of a history page: first-load, empty and error states, and the infinite-scroll
 * footer (spinner, retry or sentinel). Project `app-history-day` blocks inside it.
 */
@Component({
  selector: 'app-history-list',
  imports: [AsyncState, ErrorState, InView, LoadingSpinner],
  host: {
    '[style.--history-accent]': 'accent()',
    '[style.--history-time-width]': 'timeWidth()',
  },
  styles: `
    :host {
      display: block;
    }

    .sentinel {
      height: 1px;
    }
  `,
  template: `
    <app-async-state
      [status]="list().status()"
      [loadingLabel]="loadingLabel()"
      [emptyMessage]="emptyMessage()"
      [errorMessage]="errorMessage()"
      (retry)="list().reload()"
    >
      <ng-content />
      @if (list().loadingMore()) {
        <app-loading-spinner [label]="loadingMoreLabel()" />
      } @else if (list().moreFailed()) {
        <app-error-state (retry)="list().loadMore()" />
      } @else if (list().hasMore()) {
        <div class="sentinel" appInView (inView)="list().loadMore()"></div>
      }
    </app-async-state>
  `,
})
export class HistoryList {
  readonly list = input.required<PagedListState>();
  readonly loadingLabel = input.required<string>();
  readonly emptyMessage = input.required<string>();
  readonly errorMessage = input.required<string>();
  readonly loadingMoreLabel = input.required<string>();
  /** Color of the tracker (a `--app-card-*` token), used to tint the rows. */
  readonly accent = input.required<string>();
  /** Width of the first column of the rows; widen it when the time text is longer (e.g. a range). */
  readonly timeWidth = input('3.5rem');
}
