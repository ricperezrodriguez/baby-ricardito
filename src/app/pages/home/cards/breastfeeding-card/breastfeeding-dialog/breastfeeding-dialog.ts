import { Component, computed, inject, signal } from '@angular/core';
import { disabled, form, FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom, Observable, of, switchMap, tap } from 'rxjs';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import {
  Breast,
  BREAST_SIDE,
  BreastfeedingSession,
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
  createClock,
  EditableTime,
  formatDuration,
  LoadingSpinner,
  parseTimestamp,
  PhotoApi,
  RecordDialogController,
  RecordPhoto,
  RecordPhotoField,
  toIsoString,
  totalGaps,
  TrackingDialogLayout,
} from '@shared';

const SIDES: readonly { breast: Breast; label: string }[] = [
  { breast: BREAST_SIDE.LEFT, label: 'Teta izquierda' },
  { breast: BREAST_SIDE.RIGHT, label: 'Teta derecha' },
];

@Component({
  imports: [
    EditableTime,
    FormField,
    LoadingSpinner,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    RecordPhotoField,
    TrackingDialogLayout,
  ],
  styleUrl: './breastfeeding-dialog.scss',
  templateUrl: './breastfeeding-dialog.html',
})
export class BreastfeedingDialog {
  private readonly breastfeedingService = inject(BreastfeedingService);
  private readonly photoApi: PhotoApi<BreastfeedingSession> = {
    upload: (id, file) => this.breastfeedingService.uploadPhoto(CURRENT_BABY_ID, id, file),
    remove: (id) => this.breastfeedingService.deletePhoto(CURRENT_BABY_ID, id),
  };

  private readonly clock = createClock();
  private readonly segments = signal<TimedSegment[]>([]);
  private readonly notesModel = signal({ notes: '' });
  protected readonly photo = new RecordPhoto();
  private readonly activeBreast = computed(() => activeBreastOf(this.segments()));
  private readonly durationsMs = computed(() =>
    durationsByBreast(this.segments(), this.clock.now()),
  );
  /** Start and end stored in the session, used when a feed has no segments to take them from. */
  private readonly sessionStart = signal<number | null>(null);
  private readonly sessionEnd = signal<number | null>(null);
  private readonly currentState = computed(() =>
    JSON.stringify({
      segments: toSegmentDtos(this.segments()),
      notes: this.notesModel().notes.trim(),
      photo: this.photo.state(),
    }),
  );

  /** Backend session that stores this feed; it is created when the first side starts. */
  private sessionId: string | null = null;
  /** Backend writes run one after another so rapid taps never race each other. */
  private queue: Promise<unknown> = Promise.resolve();

  /**
   * View/edit/delete flows shared by the record dialogs. A feed opened from the history
   * (`/detalle/pecho/:sessionId`) is a finished one; otherwise the dialog logs a new or running feed.
   */
  protected readonly record = new RecordDialogController<BreastfeedingSession>({
    noun: 'toma',
    gender: 'feminine',
    creationTitle: 'Añadir lactancia',
    idParam: 'sessionId',
    snapshot: () => this.currentState(),
    startLoading: true,
  });
  protected readonly form = form(this.notesModel, (path) => {
    disabled(path.notes, () => this.record.readOnly());
  });
  protected readonly hasSegments = computed(() => this.segments().length > 0);
  protected readonly saveDisabled = computed(() => this.record.saveDisabled(!this.hasSegments()));

  constructor() {
    if (this.record.requestedId === null) {
      this.restoreActiveSession();
    } else {
      this.loadSession(this.record.requestedId);
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

  /** Start, pause and end derive from the segments, so a feed without them keeps those values fixed. */
  protected readonly timesDisabled = computed(
    () => this.record.editsDisabled() || !this.hasSegments(),
  );

  protected changeStart(start: number): void {
    this.applyEdit(withStart(this.segments(), start));
  }

  protected changePause(pause: number): void {
    this.applyEdit(withTotalPause(this.segments(), pause));
  }

  protected changeEnd(end: number): void {
    this.applyEdit(withEnd(this.segments(), end));
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
    this.record.onSave({
      create: () => void this.save(),
      modify: () => void this.saveChanges(),
    });
  }

  private async save(): Promise<void> {
    if (this.record.isBlocked() || !this.hasSegments()) {
      return;
    }

    const timestamp = this.clock.refresh();
    const segments = this.segments().map((segment) =>
      segment.end === null ? { ...segment, end: timestamp } : segment,
    );

    await this.record.finish(
      'saving',
      () => this.persist(segments, toIsoString(timestamp)),
      'Toma guardada',
    );
  }

  /** Stores the edits of a feed opened from the history, once the user confirms them. */
  private async saveChanges(): Promise<void> {
    await this.record.saveChanges(() => {
      const segments = this.segments();
      const end = segments.at(-1)?.end ?? this.sessionEnd();
      return this.persist(segments, end === null ? null : toIsoString(end));
    });
  }

  /** Deletes the feed opened from the history, once the user confirms it. */
  protected async deleteSession(): Promise<void> {
    await this.record.remove(() => this.deleteStoredSession());
  }

  /** Closes the dialog keeping the feed running in the backend. */
  protected async dismiss(): Promise<void> {
    if (this.record.isBlocked()) {
      return;
    }
    if (this.record.historyMode()) {
      await this.record.leaveDiscarding(this.record.dirty());
      return;
    }
    if (!this.hasSegments()) {
      this.record.close();
      return;
    }

    // Waits for pending writes and stores the notes, so the card reads up-to-date data.
    await this.record.finish(
      'leaving',
      () => this.persist(this.segments()),
      'Toma en curso. Puedes continuarla desde la tarjeta.',
    );
  }

  /** Cancels the feed: the session stored in the backend is deleted. */
  protected async discard(): Promise<void> {
    if (this.record.isBlocked()) {
      return;
    }
    if (this.record.historyMode()) {
      await this.record.leaveDiscarding(this.record.dirty());
      return;
    }

    await this.record.finish(
      'leaving',
      async () => {
        await this.deleteStoredSession();
        return undefined;
      },
      null,
    );
  }

  /** Deletes the session stored in the backend, if it was already created. */
  private deleteStoredSession(): Promise<unknown> {
    return this.enqueue(() =>
      this.sessionId === null
        ? of(undefined)
        : this.breastfeedingService.delete(CURRENT_BABY_ID, this.sessionId),
    );
  }

  private applyEdit(segments: TimedSegment[]): void {
    this.segments.set(segments);
    if (this.record.historyMode()) {
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
        this.record.loading.set(false);
      },
      error: () => {
        this.record.loading.set(false);
      },
    });
  }

  private loadSession(sessionId: string): void {
    this.record.load(this.breastfeedingService.getById(CURRENT_BABY_ID, sessionId), (session) => {
      this.applySession(session);
      if (session.status === 'finished') {
        this.record.captureBaseline();
      } else {
        // A feed still running is continued like any other: it is not read-only history.
        this.record.exitHistoryMode();
      }
    });
  }

  private applySession(session: BreastfeedingSession): void {
    this.sessionId = session.id;
    this.segments.set(toTimedSegments(session.segments));
    this.notesModel.set({ notes: session.notes ?? '' });
    this.photo.setStored(session.photoUrl);
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
            switchMap((session) => this.photo.sync(session, this.photoApi)),
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
        .pipe(switchMap((session) => this.photo.sync(session, this.photoApi)));
    });
  }
}
