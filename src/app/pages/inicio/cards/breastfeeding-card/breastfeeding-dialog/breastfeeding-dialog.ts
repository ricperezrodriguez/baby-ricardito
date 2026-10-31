import { formatDate } from '@angular/common';
import { Component, computed, DestroyRef, inject, LOCALE_ID, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
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
} from '@app/features/breastfeeding/breastfeeding-timer';
import {
  createClock,
  formatDuration,
  LoadingSpinner,
  toIsoString,
  totalGaps,
  TrackingDialogLayout,
} from '@shared';

const SIDES: readonly { breast: Breast; label: string }[] = [
  { breast: BREAST_SIDE.LEFT, label: 'Teta izquierda' },
  { breast: BREAST_SIDE.RIGHT, label: 'Teta derecha' },
];

const DATE_FORMAT = 'dd/MM/yyyy HH:mm:ss';
const EMPTY_VALUE = '—';

@Component({
  imports: [
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
  private readonly breastfeedingService = inject(BreastfeedingService);
  private readonly notifications = inject(NotificationService);
  private readonly locale = inject(LOCALE_ID);

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

  /** Backend session that stores this feed; it is created when the first side starts. */
  private sessionId: string | null = null;
  /** Backend writes run one after another so rapid taps never race each other. */
  private queue: Promise<unknown> = Promise.resolve();

  protected readonly form = form(this.notesModel);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly leaving = signal(false);
  protected readonly busy = computed(() => this.loading() || this.leaving());
  protected readonly hasSegments = computed(() => this.segments().length > 0);
  protected readonly photoPreviewUrl = computed(
    () => this.pendingPhoto()?.previewUrl ?? (this.photoRemoved() ? null : this.storedPhotoUrl()),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releasePendingPhoto());
    this.restoreActiveSession();
  }

  protected readonly sideControls = computed(() =>
    SIDES.map(({ breast, label }) => ({
      breast,
      label,
      active: this.activeBreast() === breast,
      duration: formatDuration(this.durationsMs()[breast]),
    })),
  );

  protected readonly summaryRows = computed(() => {
    const segments = this.segments();
    const last = segments.at(-1);
    const total = Object.values(this.durationsMs()).reduce((sum, ms) => sum + ms, 0);

    return [
      { label: 'Duración total', value: formatDuration(total) },
      // The pause is the idle time between consecutive segments (switching breasts or stopping and resuming).
      { label: 'Pausa', value: formatDuration(totalGaps(segments)) },
      { label: 'Inicio', value: this.formatDateTime(segments[0]?.start) },
      {
        label: 'Final',
        value: last?.end === null ? 'En curso' : this.formatDateTime(last?.end),
      },
    ];
  });

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

  protected async save(): Promise<void> {
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

  /** Closes the dialog keeping the feed running in the backend. */
  protected async dismiss(): Promise<void> {
    if (this.saving() || this.leaving()) {
      return;
    }
    if (!this.hasSegments()) {
      this.dialogRef.close();
      return;
    }

    this.leaving.set(true);
    try {
      // Waits for pending writes and stores the notes, so the card reads up-to-date data.
      this.dialogRef.close(await this.persist(this.segments()));
    } catch {
      this.leaving.set(false);
    }
  }

  /** Cancels the feed: the session stored in the backend is deleted. */
  protected async discard(): Promise<void> {
    if (this.saving() || this.leaving()) {
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

  private restoreActiveSession(): void {
    this.breastfeedingService.getLatest(CURRENT_BABY_ID).subscribe({
      next: (session) => {
        if (session !== null && session.status !== 'finished') {
          this.sessionId = session.id;
          this.segments.set(toTimedSegments(session.segments));
          this.notesModel.set({ notes: session.notes ?? '' });
          this.storedPhotoUrl.set(session.photoUrl ?? null);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
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

  private formatDateTime(timestamp: number | null | undefined): string {
    return timestamp == null ? EMPTY_VALUE : formatDate(timestamp, DATE_FORMAT, this.locale);
  }
}
