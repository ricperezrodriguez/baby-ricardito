import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

/** Visual weight of an alert: `warning` asks the user to act, `info` just informs. */
export type AlertTone = 'warning' | 'info';

/**
 * Dismissible alert shown on Home. It only renders; each alert decides when it appears and
 * remembers its dismissal with `createAlertDismissal`.
 */
@Component({
  selector: 'app-alert-banner',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  styles: `
    :host {
      display: block;
    }

    .alert {
      --alert-color: var(--app-ochre);
      background: color-mix(in srgb, var(--alert-color) 10%, var(--app-surface));
      border-color: var(--alert-color);
      border-radius: 1.1rem;
      margin-block-end: 1rem;
    }

    .alert.info {
      --alert-color: var(--app-green);
    }

    .alert-body {
      align-items: center;
      display: flex;
      gap: 0.75rem;
      padding: 0.5rem 0.5rem 0.5rem 1rem;
    }

    .alert-icon {
      color: var(--alert-color);
      flex: 0 0 auto;
    }

    .alert-text {
      color: var(--app-ink);
      flex: 1;
      font-size: 0.95rem;
      line-height: 1.4;
      margin: 0;
      min-width: 0;
    }
  `,
  template: `
    <mat-card class="alert" [class.info]="tone() === 'info'" appearance="outlined" role="status">
      <div class="alert-body">
        <mat-icon class="alert-icon" fontSet="material-symbols-outlined" aria-hidden="true">
          {{ icon() }}
        </mat-icon>
        <p class="alert-text">{{ message() }}</p>
        <button matIconButton type="button" [attr.aria-label]="dismissLabel()" (click)="dismissed.emit()">
          <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">close</mat-icon>
        </button>
      </div>
    </mat-card>
  `,
})
export class AlertBanner {
  readonly message = input.required<string>();
  /** Accessible name of the close button, e.g. `Cerrar aviso de caca`. */
  readonly dismissLabel = input.required<string>();
  readonly icon = input('warning');
  readonly tone = input<AlertTone>('warning');
  readonly dismissed = output<void>();
}
