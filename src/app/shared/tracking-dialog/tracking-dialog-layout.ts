import { Component, DestroyRef, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  ConfirmationDialog,
  ConfirmationDialogData,
} from '@app/shared/confirmation-dialog/confirmation-dialog';

/**
 * Common structure of the record modals: title with a close button, own content and Cancel/Save actions.
 *
 * The layout does not close the modal: it emits `dismiss` (X, outside click or Escape: close keeping the record)
 * and `discard` (confirmed Cancel: discard the record), and the modal that uses it decides what to do and closes it.
 */
@Component({
  selector: 'app-tracking-dialog-layout',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  styles: `
    .header {
      align-items: flex-start;
      display: flex;
      justify-content: space-between;
      padding-block-start: 0.5rem;
      padding-inline-end: 0.5rem;
    }

    .header h2 {
      flex: 1;
      min-width: 0;
    }
  `,
  template: `
    <div class="header">
      <h2 mat-dialog-title>{{ title() }}</h2>
      <button
        matIconButton
        type="button"
        aria-label="Cerrar"
        [disabled]="busy() || saving()"
        (click)="requestDismiss()"
      >
        <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">close</mat-icon>
      </button>
    </div>
    <mat-dialog-content>
      <ng-content />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <ng-content select="[dialogActionsStart]" />
      <button matButton type="button" [disabled]="busy() || saving()" (click)="confirmDiscard()">
        Cancelar
      </button>
      <button
        matButton="filled"
        type="button"
        [attr.aria-label]="saving() ? 'Guardando' : null"
        [disabled]="saveDisabled() || busy() || saving()"
        (click)="save.emit()"
      >
        @if (saving()) {
          <mat-spinner diameter="20" aria-hidden="true" />
        } @else {
          {{ saveLabel() }}
        }
      </button>
    </mat-dialog-actions>
  `,
})
export class TrackingDialogLayout {
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef);
  private readonly destroyRef = inject(DestroyRef);
  private confirmingDiscard = false;

  readonly title = input.required<string>();
  readonly saveDisabled = input(false);
  readonly saving = input(false);
  /** Text of the primary button. */
  readonly saveLabel = input('Guardar');
  /** If false, Cancel emits `discard` without asking for confirmation (the modal handles it). */
  readonly confirmBeforeDiscard = input(true);
  /** Blocks close, cancel and save while the modal is loading or closing. */
  readonly busy = input(false);
  readonly save = output<void>();
  readonly dismiss = output<void>();
  readonly discard = output<void>();

  constructor() {
    this.dialogRef.disableClose = true;
    this.dialogRef
      .backdropClick()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.requestDismiss());
    this.dialogRef
      .keydownEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (
          event.key === 'Escape' &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey
        ) {
          event.preventDefault();
          this.requestDismiss();
        }
      });
  }

  protected requestDismiss(): void {
    if (this.busy() || this.saving()) {
      return;
    }

    this.dismiss.emit();
  }

  protected confirmDiscard(): void {
    if (this.busy() || this.saving() || this.confirmingDiscard) {
      return;
    }

    if (!this.confirmBeforeDiscard()) {
      this.discard.emit();
      return;
    }

    this.confirmingDiscard = true;
    this.dialog
      .open<ConfirmationDialog, ConfirmationDialogData, boolean>(ConfirmationDialog, {
        data: {
          title: '¿Cancelar registro?',
          message: 'Se perderán los datos.',
          dismissLabel: 'Volver',
          confirmLabel: 'Cancelar registro',
        },
        width: '26rem',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        this.confirmingDiscard = false;
        if (confirmed) {
          this.discard.emit();
        }
      });
  }
}
