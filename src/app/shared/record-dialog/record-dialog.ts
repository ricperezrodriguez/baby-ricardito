import { computed, inject, signal, WritableSignal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NotificationService } from '@app/core/notification.service';
import {
  ConfirmationDialog,
  ConfirmationDialogData,
} from '@app/shared/confirmation-dialog/confirmation-dialog';
import type { DialogRouteContext } from '@app/shared/dialog-route/dialog-route';
import { RECORD_ID_PARAM } from '@app/shared/dialog-route/dialog-route';
import { firstValueFrom, Observable } from 'rxjs';

/** Grammatical gender of the record noun, needed to build the Spanish texts (`la toma`, `el pañal`). */
export type RecordGender = 'feminine' | 'masculine';

/** Texts of the view/edit/delete flows of a record dialog, built from the noun of the tracker. */
export interface RecordDialogTexts {
  detailTitle: string;
  editTitle: string;
  /** Accessible label of the trash button. */
  deleteLabel: string;
  /** Accessible label of the spinner shown while the record opened from the history loads. */
  loadingLabel: string;
  /** Snackbar after `Modificar`. */
  modified: string;
  /** Snackbar after deleting. */
  deleted: string;
  confirmModify: ConfirmationDialogData;
  confirmDelete: ConfirmationDialogData;
  /** Closing a record opened from the history with unsaved changes. */
  confirmDiscardChanges: ConfirmationDialogData;
  /** Closing a creation dialog after the user entered data. */
  confirmDiscardNew: ConfirmationDialogData;
}

/** Builds the texts of a record dialog, e.g. `createRecordTexts('toma', 'feminine')` or `('pañal', 'masculine')`. */
export function createRecordTexts(noun: string, gender: RecordGender): RecordDialogTexts {
  const feminine = gender === 'feminine';
  const genitive = `${feminine ? 'de la' : 'del'} ${noun}`;
  const capitalized = `${noun.charAt(0).toUpperCase()}${noun.slice(1)}`;

  return {
    detailTitle: `Detalle ${genitive}`,
    editTitle: `Editar ${noun}`,
    deleteLabel: `Eliminar ${noun}`,
    loadingLabel: `Cargando ${feminine ? 'la' : 'el'} ${noun}`,
    modified: `${capitalized} ${feminine ? 'modificada' : 'modificado'}`,
    deleted: `${capitalized} ${feminine ? 'eliminada' : 'eliminado'}`,
    confirmModify: {
      title: `¿Modificar ${noun}?`,
      message: `Se actualizarán los datos ${genitive}.`,
      dismissLabel: 'Volver',
      confirmLabel: 'Modificar',
    },
    confirmDelete: {
      title: `¿Eliminar ${noun}?`,
      message: 'Se borrará de forma definitiva.',
      dismissLabel: 'Volver',
      confirmLabel: `Eliminar ${noun}`,
    },
    confirmDiscardChanges: {
      title: '¿Descartar cambios?',
      message: `Se perderán las modificaciones ${genitive}.`,
      dismissLabel: 'Seguir editando',
      confirmLabel: 'Descartar',
    },
    confirmDiscardNew: {
      title: '¿Descartar cambios?',
      message: `Se perderán los datos ${genitive}.`,
      dismissLabel: 'Seguir editando',
      confirmLabel: 'Descartar',
    },
  };
}

export interface RecordDialogOptions {
  /** Singular noun without article, e.g. `toma` or `pañal`. */
  noun: string;
  gender: RecordGender;
  /** Title of the dialog when it creates a record. */
  creationTitle: string;
  /** Serialized editable state; compared with the one captured after loading to detect unsaved changes. */
  snapshot: () => string;
  /** Starts with `loading` on even when the dialog is not opened from the history. */
  startLoading?: boolean;
}

/**
 * State and flows common to the record dialogs (creation + history mode: view, edit, delete),
 * built on top of `TrackingDialogLayout`. Create it as a field of the dialog (injection context).
 *
 * It never persists anything by itself: the dialog passes the writes to run. Snackbars are shown only on
 * success, right before closing; HTTP errors are reported by the interceptor, so failures only re-enable the dialog.
 */
export class RecordDialogController<TResult> {
  private readonly dialogRef = inject<MatDialogRef<unknown, TResult>>(MatDialogRef);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly baseline = signal<string | null>(null);
  private confirming = false;

  /** Id of the record opened from the history; `null` when creating a new one. */
  readonly requestedId: string | null;
  readonly texts: RecordDialogTexts;

  /** A record opened from the history: shown read-only until the user chooses to edit it. */
  readonly historyMode: WritableSignal<boolean>;
  readonly editing = signal(false);
  readonly readOnly = computed(() => this.historyMode() && !this.editing());
  readonly loading: WritableSignal<boolean>;
  readonly saving = signal(false);
  readonly leaving = signal(false);
  /** Blocks close, cancel, save and delete while the record loads or the dialog is closing. */
  readonly busy = computed(() => this.loading() || this.leaving());
  /** Changes made since the record was loaded; always `false` before `captureBaseline()`. */
  readonly dirty = computed(
    () => this.baseline() !== null && this.options.snapshot() !== this.baseline(),
  );
  readonly dialogTitle = computed(() => {
    if (!this.historyMode()) {
      return this.options.creationTitle;
    }
    return this.editing() ? this.texts.editTitle : this.texts.detailTitle;
  });
  readonly saveLabel = computed(() => {
    if (!this.historyMode()) {
      return 'Guardar';
    }
    return this.editing() ? 'Modificar' : 'Editar';
  });
  /** Inputs and actions are disabled while the dialog is busy, saving or showing a record read-only. */
  readonly editsDisabled = computed(() => this.busy() || this.saving() || this.readOnly());

  constructor(private readonly options: RecordDialogOptions) {
    this.texts = createRecordTexts(options.noun, options.gender);
    this.requestedId =
      inject<DialogRouteContext | null>(MAT_DIALOG_DATA, { optional: true })?.params[
        RECORD_ID_PARAM
      ] ?? null;
    this.historyMode = signal(this.requestedId !== null);
    this.loading = signal(options.startLoading ?? this.requestedId !== null);
  }

  /** Whether a write is already running, so close, cancel, save and delete must be ignored. */
  isBlocked(): boolean {
    return this.saving() || this.leaving();
  }

  /** Disabled state of the main button: needs a change when editing, `creationDisabled` when creating. */
  saveDisabled(creationDisabled: boolean): boolean {
    return this.historyMode() ? this.editing() && !this.dirty() : creationDisabled;
  }

  /** Stores the current editable state as the one to compare against (call it right after loading). */
  captureBaseline(): void {
    this.baseline.set(this.options.snapshot());
  }

  /** The record opened by URL is not finished, so it is continued like in creation mode. */
  exitHistoryMode(): void {
    this.historyMode.set(false);
  }

  /**
   * Loads the record opened from the history. `apply` fills the dialog and decides the mode
   * (`captureBaseline()` or `exitHistoryMode()`). If loading fails the dialog closes itself.
   */
  load<T>(source: Observable<T>, apply: (record: T) => void): void {
    source.subscribe({
      next: (record) => {
        apply(record);
        this.loading.set(false);
      },
      // The HTTP error interceptor already reports the failure (e.g. the record no longer exists).
      error: () => this.dialogRef.close(),
    });
  }

  /** Main button: creates a new record, starts editing a record from the history, or confirms its changes. */
  onSave(actions: { create: () => void; modify: () => void }): void {
    if (!this.historyMode()) {
      actions.create();
    } else if (this.readOnly()) {
      this.editing.set(true);
    } else {
      actions.modify();
    }
  }

  /**
   * Runs a write that ends the dialog: on success shows `message` (if any) and closes with the result;
   * on failure the dialog is enabled again.
   */
  async finish(
    flag: 'saving' | 'leaving',
    write: () => Promise<TResult | undefined>,
    message: string | null,
  ): Promise<void> {
    const state = flag === 'saving' ? this.saving : this.leaving;
    state.set(true);
    try {
      const result = await write();
      if (message !== null) {
        this.notifications.success(message);
      }
      this.dialogRef.close(result);
    } catch {
      state.set(false);
    }
  }

  /** Stores the edits of a record opened from the history, once the user confirms them. */
  async saveChanges(write: () => Promise<TResult>): Promise<void> {
    if (this.isBlocked() || !(await this.confirm(this.texts.confirmModify))) {
      return;
    }
    await this.finish('saving', write, this.texts.modified);
  }

  /** Deletes the record opened from the history, once the user confirms it. */
  async remove(write: () => Promise<unknown>): Promise<void> {
    if (this.isBlocked() || !(await this.confirm(this.texts.confirmDelete))) {
      return;
    }
    await this.finish(
      'leaving',
      async () => {
        await write();
        return undefined;
      },
      this.texts.deleted,
    );
  }

  /** Closes the dialog, asking first (`¿Descartar cambios?`) only when there is something to lose. */
  async leaveDiscarding(hasChanges: boolean): Promise<void> {
    const confirmation = this.historyMode()
      ? this.texts.confirmDiscardChanges
      : this.texts.confirmDiscardNew;
    if (!hasChanges || (await this.confirm(confirmation))) {
      this.close();
    }
  }

  close(result?: TResult): void {
    this.dialogRef.close(result);
  }

  /** Opens a confirmation; a second one cannot be opened on top of one that is already open. */
  async confirm(data: ConfirmationDialogData): Promise<boolean> {
    if (this.confirming) {
      return false;
    }

    this.confirming = true;
    try {
      const confirmed = await firstValueFrom(
        this.dialog
          .open<ConfirmationDialog, ConfirmationDialogData, boolean>(ConfirmationDialog, {
            data,
            width: '26rem',
          })
          .afterClosed(),
      );
      return confirmed === true;
    } finally {
      this.confirming = false;
    }
  }
}
