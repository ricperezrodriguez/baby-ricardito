import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/** Standard load-error message with its "Reintentar" button. Use it for every failed load. */
@Component({
  selector: 'app-error-state',
  imports: [MatButtonModule],
  styles: `
    :host {
      color: var(--app-muted);
      display: block;
      text-align: center;
    }

    p {
      margin: 0 0 0.5rem;
    }
  `,
  template: `
    @if (message(); as text) {
      <p role="status">{{ text }}</p>
    }
    <button matButton="outlined" type="button" (click)="retry.emit()">{{ retryLabel() }}</button>
  `,
})
export class ErrorState {
  /** What failed. Omit it when the context already makes it obvious (e.g. a failed "load more"). */
  readonly message = input<string | null>(null);
  readonly retryLabel = input('Reintentar');
  readonly retry = output<void>();
}
