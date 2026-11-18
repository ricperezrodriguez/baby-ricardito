import { Component, input, output, Signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { RecordDialogTexts } from '@app/shared/record-dialog/record-dialog';

/** Part of a `RecordDialogController` the delete button depends on. */
export interface RecordDeleteState {
  readonly historyMode: Signal<boolean>;
  readonly busy: Signal<boolean>;
  readonly saving: Signal<boolean>;
  readonly texts: Pick<RecordDialogTexts, 'deleteLabel'>;
}

/**
 * Trash button of a record dialog in history mode (view and edit), on the left of the footer.
 * Project it into the layout with the `dialogActionsStart` attribute:
 *
 *   <app-record-delete-button dialogActionsStart [record]="record" (delete)="deleteX()" />
 *
 * It renders nothing outside history mode and is disabled while the dialog is busy or saving. The dialog
 * runs the deletion (`record.remove(...)`), which asks for confirmation.
 */
@Component({
  selector: 'app-record-delete-button',
  imports: [MatButtonModule, MatIconModule],
  styles: `
    :host {
      margin-inline-end: auto;
    }

    .delete-button {
      color: var(--app-coral);
    }
  `,
  template: `
    @if (record().historyMode()) {
      <button
        matIconButton
        type="button"
        class="delete-button"
        [attr.aria-label]="record().texts.deleteLabel"
        [disabled]="record().busy() || record().saving()"
        (click)="delete.emit()"
      >
        <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">delete</mat-icon>
      </button>
    }
  `,
})
export class RecordDeleteButton {
  /** The dialog's `RecordDialogController`. */
  readonly record = input.required<RecordDeleteState>();
  readonly delete = output<void>();
}
