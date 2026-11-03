import { Component, input, output } from '@angular/core';
import { ErrorState } from '@app/shared/async-state/error-state';
import { LoadStatus } from '@app/shared/async-state/load-status';
import { LoadingSpinner } from '@app/shared/loading-spinner/loading-spinner';

/**
 * Standard loading, empty and error states of any data; the projected content is shown once it is
 * loaded. The error state always offers a retry.
 */
@Component({
  selector: 'app-async-state',
  imports: [ErrorState, LoadingSpinner],
  styles: `
    .empty-message {
      color: var(--app-muted);
      margin: 0;
      text-align: center;
    }
  `,
  template: `
    @switch (status()) {
      @case ('loaded') {
        <ng-content />
      }
      @case ('loading') {
        <app-loading-spinner [label]="loadingLabel()" />
      }
      @case ('empty') {
        @if (emptyMessage(); as text) {
          <p class="empty-message">{{ text }}</p>
        }
      }
      @case ('error') {
        <app-error-state [message]="errorMessage()" (retry)="retry.emit()" />
      }
    }
  `,
})
export class AsyncState {
  readonly status = input.required<LoadStatus>();
  readonly loadingLabel = input.required<string>();
  readonly errorMessage = input.required<string>();
  /** Shown when the status is `empty`; omit it when the data has no empty state. */
  readonly emptyMessage = input<string | null>(null);
  readonly retry = output<void>();
}
