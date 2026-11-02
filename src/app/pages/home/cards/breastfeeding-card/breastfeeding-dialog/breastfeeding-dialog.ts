import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { disabled, form, FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom, Observable, of, switchMap, tap } from 'rxjs';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { NotificationService } from '@app/core/notification.service';
import {
  Breast,
  BREAST_SIDE,
  BreastfeedingSession,
  PHOTO_MAX_BYTES,
} from '@app/features/breastfeeding/breastfeeding.models';
import { BreastfeedingService } from '@app/features/breastfeeding/breastfeeding.service';
import {
  activeBreastOf,
  durationsByBreast,
  TimedSegment,
  toSegmentDtos,
  toggleSegment,
  toTimedSegments,
  withEnd,
  withStart,
  withTotalPause,
} from '@app/features/breastfeeding/breastfeeding-timer';
import {
  ConfirmationDialog,
  ConfirmationDialogData,
  createClock,
  DialogRouteContext,
  EditableTime,
  formatDuration,
  LoadingSpinner,
  parseTimestamp,
  toIsoString,
  totalGaps,
  TrackingDialogLayout,
} from '@shared';

const SIDES: readonly { breast: Breast; label: string }[] = [
  { breast: BREAST_SIDE.LEFT, label: 'Teta izquierda' },
  { breast: BREAST_SIDE.RIGHT, label: 'Teta derecha' },
];

const CONFIRM_MODIFY: ConfirmationDialogData = {
  title: '¿Modificar toma?',
  message: 'Se actualizarán los datos de la toma.',
  dismissLabel: 'Volver',
  confirmLabel: 'Modificar',
};

const CONFIRM_DELETE: ConfirmationDialogData = {
  title: '¿Eliminar toma?',
  message: 'Se borrará de forma definitiva.',
  dismissLabel: 'Volver',
  confirmLabel: 'Eliminar toma',
};

const CONFIRM_DISCARD_CHANGES: ConfirmationDialogData = {
  title: '¿Descartar cambios?',
  message: 'Se perderán las modificaciones de la toma.',
  dismissLabel: 'Seguir editando',
  confirmLabel: 'Descartar',
};

@Component({
  imports: [
    EditableTime,
    FormField,
    LoadingSpinner,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TrackingDialogLayout,
  ],
  styleUrl: './breastfeeding-dialog.scss',
  templateUrl: './breastfeeding-dialog.html',
})
export class BreastfeedingDialog {
  private readonly dialogRef =
    inject<MatDialogRef<BreastfeedingDialog, BreastfeedingSession>>(MatDialogRef);
  private readonly dialog = inject(MatDialog);
  private readonly breastfeedingService = inject(BreastfeedingService);
  private readonly notifications = inject(NotificationService);
  /** Session opened from the history (`/detalle/pecho/:sessionId`); `null` when logging a new feed. */
  private readonly requestedSessionId =
    inject<DialogRouteContext | null>(MAT_DIALOG_DATA, { optional: true })?.params['sessionId'] ??
    null;

  private readonly clock = createClock();
  private readonly segments = signal<TimedSegment[]>([]);
  private readonly notesModel = signal({ notes: '' });
  /** Photo already stored in the backend. */
  private readonly storedPhotoUrl = signal<string | null>(null);
  /** Photo chosen by the user that is not uploaded yet (it needs the session to exist). */
  private readonly pendingPhoto = signal<{ file: File; previewUrl: string } | null>(null);
  private readonly photoRemoved = signal(false);
  private readonly activeBreast = computed(() => activeBreastOf(this.segments()));
  private readonly durationsMs = computed(() =>
    durationsByBreast(this.segments(), this.clock.now()),
  );
  /** Start and end stored in the session, used when a feed has no segments to take them from. */
  private readonly sessionStart = signal<number | null>(null);
  private readonly sessionEnd = signal<number | null>(null);
  /** State of a feed opened from the history right after loading it, to detect unsaved changes. */
  private readonly baseline = signal<string | null>(null);
  private readonly currentState = computed(() =>
    JSON.stringify({
      segments: toSegmentDtos(this.segments()),
      notes: this.notesModel().notes.trim(),
      photo: this.pendingPhoto() !== null ? 'new' : this.photoRemoved() ? 'removed' : 'same',
    }),
  );

  /** Backend session that stores this feed; it is created when the first side starts. */
  private sessionId: string | null = null;
  /** Backend writes run one after another so rapid taps never race each other. */
  private queue: Promise<unknown> = Promise.resolve();
  private confirming = false;

  /** A finished feed opened from the history: shown read-only until the user chooses to edit it. */
  protected readonly historyMode = signal(this.requestedSessionId !== null);
  protected readonly editing = signal(false);
  protected readonly readOnly = computed(() => this.historyMode() && !this.editing());
  protected readonly form = form(this.notesModel, (path) => {
    disabled(path.notes, () => this.readOnly());
  });
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly leaving = signal(false);
  protected readonly busy = computed(() => this.loading() || this.leaving());
  protected readonly hasSegments = computed(() => this.segments().length > 0);
  protected readonly dirty = computed(
    () => this.baseline() !== null && this.currentState() !== this.baseline(),
  );
  protected readonly dialogTitle = computed(() => {
    if (!this.historyMode()) {
      return 'Añadir lactancia';
    }
    return this.editing() ? 'Editar toma' : 'Detalle de la toma';
  });
  protected readonly saveLabel = computed(() => {
    if (!this.historyMode()) {
      return 'Guardar';
    }
    return this.editing() ? 'Modificar' : 'Editar';
  });
  protected readonly saveDisabled = computed(() => {
    if (this.historyMode()) {
      return this.editing() && !this.dirty();
    }
    return !this.hasSegments();
  });
  protected readonly photoPreviewUrl = computed(
    () => this.pendingPhoto()?.previewUrl ?? (this.photoRemoved() ? null : this.storedPhotoUrl()),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releasePendingPhoto());
    if (this.requestedSessionId === null) {
      this.restoreActiveSession();
    } else {
      this.loadSession(this.requestedSessionId);
    }
  }

  protected readonly sideControls = computed(() =>
    SIDES.map(({ breast, label }) => ({
      breast,
      label,
      active: this.activeBreast() === breast,
      duration: formatDuration(this.durationsMs()[breast]),
    })),
  );

  protected readonly totalText = computed(() =>
    formatDuration(Object.values(this.durationsMs()).reduce((sum, ms) => sum + ms, 0)),
  );

  // The pause is the idle time between consecutive segments (switching breasts or stopping and resuming).
  protected readonly pause = computed(() => totalGaps(this.segments()));
  protected readonly canEditPause = computed(() => this.segments().length > 1);
  /** More pause delays the last segment, which cannot end up later than now. */
  protected readonly maxPause = computed(() => {
    const last = this.segments().at(-1);
    return last === undefined
      ? 0
      : this.pause() + Math.max(0, this.clock.now() - (last.end ?? last.start));
  });

  protected readonly startTime = computed(() => this.segments()[0]?.start ?? this.sessionStart());
  protected readonly maxStart = computed(() => {
    const first = this.segments()[0];
    return first === undefined ? null : (first.end ?? this.clock.now());
  });

  /** `null` while the last segment is still running. */
  protected readonly endTime = computed(() =>
    this.hasSegments() ? (this.segments().at(-1)?.end ?? null) : this.sessionEnd(),
  );
  protected readonly minEnd = computed(() => this.segments().at(-1)?.start ?? null);
  protected readonly maxEnd = computed(() => this.clock.now());

  protected readonly editsDisabled = computed(
    () => this.busy() || this.saving() || this.readOnly(),
  );
  /** Start, pause and end derive from the segments, so a feed without them keeps those values fixed. */
  protected readonly timesDisabled = computed(() => this.editsDisabled() || !this.hasSegments());

  protected changeStart(start: number): void {
    this.applyEdit(withStart(this.segments(), start));
  }

  protected changePause(pause: number): void {
    this.applyEdit(withTotalPause(this.segments(), pause));
  }

  protected changeEnd(end: number): void {
    this.applyEdit(withEnd(this.segments(), end));
  }

  protected selectPhoto(input: HTMLInputElement): void {
    const file = input.files?.item(0) ?? null;
    input.value = '';
    if (file === null) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.notifications.error('El archivo seleccionado no es una imagen');
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      this.notifications.error('La foto no puede superar los 5 MB');
      return;
    }

    this.releasePendingPhoto();
    this.pendingPhoto.set({ file, previewUrl: URL.createObjectURL(file) });
    this.photoRemoved.set(false);
  }

  protected removePhoto(): void {
    this.releasePendingPhoto();
    this.photoRemoved.set(this.storedPhotoUrl() !== null);
  }

  protected toggle(breast: Breast): void {
    const timestamp = this.clock.refresh();
    const segments = toggleSegment(this.segments(), breast, timestamp);
    this.segments.set(segments);
    // Failures are reported by the HTTP error interceptor; the next change re-sends the full state.
    this.persist(segments).catch(() => undefined);
  }

  /** Main button: starts editing a feed from the history, confirms its changes, or saves a new feed. */
  protected onSave(): void {
    if (!this.historyMode()) {
      void this.save();
    } else if (this.readOnly()) {
      this.editing.set(true);
    } else {
      void this.saveChanges();
    }
  }

  private async save(): Promise<void> {
    if (this.saving() || this.leaving() || !this.hasSegments()) {
      return;
    }

    const timestamp = this.clock.refresh();
    const segments = this.segments().map((segment) =>
      segment.end === null ? { ...segment, end: timestamp } : segment,
    );

    this.saving.set(true);
    try {
      const session = await this.persist(segments, toIsoString(timestamp));
      this.notifications.success('Toma guardada');
      this.dialogRef.close(session);
    } catch {
      this.saving.set(false);
    }
  }

  /** Stores the edits of a feed opened from the history, once the user confirms them. */
  private async saveChanges(): Promise<void> {
    if (this.saving() || this.leaving() || !(await this.confirm(CONFIRM_MODIFY))) {
      return;
    }

    const segments = this.segments();
    const end = segments.at(-1)?.end ?? this.sessionEnd();

    this.saving.set(true);
    try {
      const session = await this.persist(segments, end === null ? null : toIsoString(end));
      this.notifications.success('Toma modificada');
      this.dialogRef.close(session);
    } catch {
      this.saving.set(false);
    }
  }

  /** Deletes the feed opened from the history, once the user confirms it. */
  protected async deleteSession(): Promise<void> {
    if (this.saving() || this.leaving() || !(await this.confirm(CONFIRM_DELETE))) {
      return;
    }

    this.leaving.set(true);
    try {
      await this.enqueue(() =>
        this.sessionId === null
          ? of(undefined)
          : this.breastfeedingService.delete(CURRENT_BABY_ID, this.sessionId),
      );
      this.notifications.success('Toma eliminada');
      this.dialogRef.close();
    } catch {
      this.leaving.set(false);
    }
  }

  /** Closes the dialog keeping the feed running in the backend. */
  protected async dismiss(): Promise<void> {
    if (this.saving() || this.leaving()) {
      return;
    }
    if (this.historyMode()) {
      await this.leaveHistoryFeed();
      return;
    }
    if (!this.hasSegments()) {
      this.dialogRef.close();
      return;
    }

    this.leaving.set(true);
    try {
      // Waits for pending writes and stores the notes, so the card reads up-to-date data.
      const session = await this.persist(this.segments());
      this.notifications.success('Toma en curso. Puedes continuarla desde la tarjeta.');
      this.dialogRef.close(session);
    } catch {
      this.leaving.set(false);
    }
  }

  /** Cancels the feed: the session stored in the backend is deleted. */
  protected async discard(): Promise<void> {
    if (this.saving() || this.leaving()) {
      return;
    }
    if (this.historyMode()) {
      await this.leaveHistoryFeed();
      return;
    }

    this.leaving.set(true);
    try {
      await this.enqueue(() =>
        this.sessionId === null
          ? of(undefined)
          : this.breastfeedingService.delete(CURRENT_BABY_ID, this.sessionId),
      );
      this.dialogRef.close();
    } catch {
      this.leaving.set(false);
    }
  }

  /** Closes a feed opened from the history, asking first only when there are unsaved changes. */
  private async leaveHistoryFeed(): Promise<void> {
    if (!this.dirty() || (await this.confirm(CONFIRM_DISCARD_CHANGES))) {
      this.dialogRef.close();
    }
  }

  private async confirm(data: ConfirmationDialogData): Promise<boolean> {
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

  private applyEdit(segments: TimedSegment[]): void {
    this.segments.set(segments);
    if (this.historyMode()) {
      return;
    }
    // Failures are reported by the HTTP error interceptor; the next change re-sends the full state.
    this.persist(segments).catch(() => undefined);
  }

  private restoreActiveSession(): void {
    this.breastfeedingService.getLatest(CURRENT_BABY_ID).subscribe({
      next: (session) => {
        if (session !== null && session.status !== 'finished') {
          this.applySession(session);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private loadSession(sessionId: string): void {
    this.breastfeedingService.getById(CURRENT_BABY_ID, sessionId).subscribe({
      next: (session) => {
        this.applySession(session);
        if (session.status === 'finished') {
          this.baseline.set(this.currentState());
        } else {
          // A feed still running is continued like any other: it is not read-only history.
          this.historyMode.set(false);
        }
        this.loading.set(false);
      },
      // The HTTP error interceptor already reports the failure (e.g. the feed no longer exists).
      error: () => this.dialogRef.close(),
    });
  }

  private applySession(session: BreastfeedingSession): void {
    this.sessionId = session.id;
    this.segments.set(toTimedSegments(session.segments));
    this.notesModel.set({ notes: session.notes ?? '' });
    this.storedPhotoUrl.set(session.photoUrl ?? null);
    this.sessionStart.set(parseTimestamp(session.startTime));
    this.sessionEnd.set(session.endTime === null ? null : parseTimestamp(session.endTime));
  }

  private enqueue<T>(job: () => Observable<T>): Promise<T> {
    const result = this.queue.then(() => firstValueFrom(job()));
    this.queue = result.catch(() => undefined);
    return result;
  }

  /** Stores the full state: creates the session on the first call and updates it afterwards. */
  private persist(
    segments: readonly TimedSegment[],
    endTime: string | null = null,
  ): Promise<BreastfeedingSession> {
    return this.enqueue(() => {
      const dtoSegments = toSegmentDtos(segments);
      const notes = this.notesModel().notes.trim();

      if (this.sessionId === null) {
        return this.breastfeedingService
          .create({
            babyId: CURRENT_BABY_ID,
            startTime: dtoSegments[0].startTime,
            endTime,
            segments: dtoSegments,
            notes: notes || undefined,
          })
          .pipe(
            tap((session) => (this.sessionId = session.id)),
            switchMap((session) => this.syncPhoto(session)),
          );
      }

      return this.breastfeedingService
        .update(CURRENT_BABY_ID, this.sessionId, {
          // The session start follows the first segment, which the user can move.
          ...(dtoSegments.length > 0 ? { startTime: dtoSegments[0].startTime } : {}),
          endTime,
          segments: dtoSegments,
          notes,
        })
        .pipe(switchMap((session) => this.syncPhoto(session)));
    });
  }

  /** Uploads or deletes the photo when it differs from the one stored in the backend. */
  private syncPhoto(session: BreastfeedingSession): Observable<BreastfeedingSession> {
    const pending = this.pendingPhoto();
    if (pending !== null) {
      return this.breastfeedingService.uploadPhoto(CURRENT_BABY_ID, session.id, pending.file).pipe(
        tap((updated) => {
          this.storedPhotoUrl.set(updated.photoUrl ?? null);
          // A newer choice made while uploading stays pending.
          if (this.pendingPhoto() === pending) {
            this.releasePendingPhoto();
          }
        }),
      );
    }

    if (this.photoRemoved()) {
      return this.breastfeedingService.deletePhoto(CURRENT_BABY_ID, session.id).pipe(
        tap(() => {
          this.storedPhotoUrl.set(null);
          this.photoRemoved.set(false);
        }),
      );
    }

    return of(session);
  }

  private releasePendingPhoto(): void {
    const pending = this.pendingPhoto();
    if (pending !== null) {
      URL.revokeObjectURL(pending.previewUrl);
      this.pendingPhoto.set(null);
    }
  }
}
