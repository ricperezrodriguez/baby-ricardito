import { Component, computed, inject, linkedSignal, signal, untracked } from '@angular/core';
import { disabled, form, FormField, maxLength } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import {
  SLEEP_NOTES_MAX_LENGTH,
  SleepSession,
  UpdateSleepSessionDto,
} from '@app/features/sleep/sleep.models';
import { SleepService } from '@app/features/sleep/sleep.service';
import {
  createClock,
  createWriteQueue,
  EditableTime,
  formatDuration,
  LoadingSpinner,
  parseTimestamp,
  RecordDialogController,
  spanDuration,
  toIsoString,
  TrackingDialogLayout,
} from '@shared';
import { firstValueFrom } from 'rxjs';

@Component({
  imports: [
    EditableTime,
    FormField,
    LoadingSpinner,
    MatFormFieldModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatSlideToggleModule,
    TrackingDialogLayout,
  ],
  styleUrl: './sleep-dialog.scss',
  templateUrl: './sleep-dialog.html',
})
export class SleepDialog {
  private readonly sleepService = inject(SleepService);
  private readonly clock = createClock();
  /** Backend writes run one after another so rapid changes never race each other. */
  private readonly enqueue = createWriteQueue();

  protected readonly notesMaxLength = SLEEP_NOTES_MAX_LENGTH;

  /** The baby falls asleep now unless the user says otherwise. */
  protected readonly startTime = signal(this.clock.now());
  /** `awake` is only a creation choice (a finished record vs a sleep that starts now); it is never stored. */
  private readonly formModel = signal({ awake: false, notes: '' });
  /** Wake-up time: set when "Ya se ha despertado" is turned on, `null` while the sleep is ongoing. */
  protected readonly endTime = linkedSignal<boolean, number | null>({
    source: () => this.formModel().awake,
    computation: (awake) => (awake ? untracked(() => this.clock.now()) : null),
  });

  /** Id of the stored session; it exists when a running sleep was found or a record was opened. */
  private readonly sessionId = signal<string | null>(null);
  /** Start stored in the backend; a rejected edit of an ongoing sleep goes back to it. */
  private storedStart = 0;
  private pendingStartWrites = 0;

  private readonly snapshot = computed(() =>
    JSON.stringify({
      start: this.startTime(),
      end: this.endTime(),
      awake: this.formModel().awake,
      notes: this.formModel().notes.trim(),
    }),
  );

  /**
   * View/edit/delete flows shared by the record dialogs. A sleep opened from the history
   * (`/detalle/sueno/:recordId`) is a finished one; otherwise the dialog logs a new or running sleep.
   */
  protected readonly record = new RecordDialogController<SleepSession>({
    noun: 'sueño',
    gender: 'masculine',
    creationTitle: 'Añadir sueño',
    snapshot: () => this.snapshot(),
    startLoading: true,
  });
  protected readonly form = form(this.formModel, (path) => {
    disabled(path.awake, () => this.record.editsDisabled());
    disabled(path.notes, () => this.record.readOnly());
    maxLength(path.notes, SLEEP_NOTES_MAX_LENGTH);
  });

  /** A running sleep is continued here: only its start and notes can change until the baby wakes up. */
  protected readonly ongoing = computed(
    () => !this.record.historyMode() && this.sessionId() !== null,
  );
  /** The wake-up time exists for finished records and for a new sleep that already ended. */
  protected readonly showEnd = computed(
    () => this.record.historyMode() || (!this.ongoing() && this.form.awake().value()),
  );
  protected readonly showAwakeToggle = computed(
    () => !this.record.historyMode() && !this.ongoing(),
  );

  protected readonly title = computed(() =>
    this.ongoing() ? 'Sueño en curso' : this.record.dialogTitle(),
  );
  protected readonly saveLabel = computed(() => {
    if (this.ongoing()) {
      return 'Despertar';
    }
    if (this.record.historyMode()) {
      return this.record.saveLabel();
    }
    return this.form.awake().value() ? 'Guardar' : 'Empezar sueño';
  });
  protected readonly saveDisabled = computed(
    () => this.record.saveDisabled(this.form().invalid()) || this.form().invalid(),
  );

  /** Time asleep; it grows with the clock while the sleep is ongoing. */
  protected readonly elapsedText = computed(() =>
    formatDuration(
      spanDuration(
        { start: this.startTime(), end: this.ongoing() ? null : this.endTime() },
        this.clock.now(),
      ),
    ),
  );
  /** A sleep that has not started has no duration yet; the ongoing one shows the big clock instead. */
  protected readonly showDuration = computed(() => !this.ongoing() && this.showEnd());

  /** The start cannot be later than the wake-up (when there is one) or than now. */
  protected readonly maxStart = computed(() =>
    this.showEnd() ? (this.endTime() ?? this.clock.now()) : this.clock.now(),
  );
  protected readonly minEnd = computed(() => this.startTime());
  protected readonly maxEnd = computed(() => this.clock.now());

  constructor() {
    if (this.record.requestedId === null) {
      this.restoreOngoingSleep();
    } else {
      this.loadSession(this.record.requestedId);
    }
  }

  protected changeStart(start: number): void {
    this.startTime.set(start);
    if (this.ongoing()) {
      this.storeStart(start);
    }
  }

  /** Main button: starts or saves a new sleep, wakes the baby up, starts editing a record or confirms its changes. */
  protected onSave(): void {
    if (this.ongoing()) {
      void this.wakeUp();
      return;
    }
    this.record.onSave({
      create: () => void this.save(),
      modify: () => void this.saveChanges(),
    });
  }

  /** Stores a new sleep: ongoing when the baby is still asleep, finished otherwise. */
  private async save(): Promise<void> {
    if (this.record.isBlocked() || this.form().invalid()) {
      return;
    }

    const end = this.form.awake().value() ? this.endTime() : null;
    const notes = this.notes();
    await this.record.finish(
      'saving',
      () =>
        firstValueFrom(
          this.sleepService.create({
            babyId: CURRENT_BABY_ID,
            startTime: toIsoString(this.startTime()),
            endTime: end === null ? null : toIsoString(end),
            notes: notes || undefined,
          }),
        ),
      end === null ? 'Sueño iniciado' : 'Sueño guardado',
    );
  }

  /** Ends the ongoing sleep now; the start edits already sent go first because the writes are queued. */
  private async wakeUp(): Promise<void> {
    if (this.record.isBlocked() || this.form().invalid()) {
      return;
    }

    const endTime = toIsoString(this.clock.refresh());
    await this.record.finish(
      'saving',
      () => this.update({ endTime, notes: this.notes() }),
      'Sueño terminado',
    );
  }

  /** Stores the edits of a sleep opened from the history in one request, once the user confirms them. */
  private async saveChanges(): Promise<void> {
    const end = this.endTime();
    await this.record.saveChanges(() =>
      this.update({
        startTime: toIsoString(this.startTime()),
        // A finished sleep always has an end: it cannot be reopened.
        ...(end === null ? {} : { endTime: toIsoString(end) }),
        notes: this.notes(),
      }),
    );
  }

  /** Deletes the sleep opened from the history, once the user confirms it. */
  protected async deleteSession(): Promise<void> {
    await this.record.remove(() => this.deleteStoredSession());
  }

  /** Close (X, outside click, Escape): a running sleep keeps running; anything else asks only when there is something to lose. */
  protected async dismiss(): Promise<void> {
    if (this.record.isBlocked()) {
      return;
    }
    if (!this.ongoing()) {
      await this.record.leaveDiscarding(this.record.dirty());
      return;
    }

    // Waits for the pending start edits and stores the notes, so the card reads up-to-date data.
    await this.record.finish(
      'leaving',
      () => this.update({ notes: this.notes() }),
      'Sueño en curso. Puedes terminarlo desde la tarjeta.',
    );
  }

  /** Cancelar: deletes the ongoing sleep (already confirmed by the layout); anywhere else it closes like the X. */
  protected async discard(): Promise<void> {
    if (this.record.isBlocked()) {
      return;
    }
    if (!this.ongoing()) {
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

  private notes(): string {
    return this.formModel().notes.trim();
  }

  /** Sends the start of the ongoing sleep right away; if the server rejects it, the field goes back to the stored one. */
  private storeStart(start: number): void {
    this.pendingStartWrites++;
    this.update({ startTime: toIsoString(start) })
      .then((session) => {
        this.storedStart = parseTimestamp(session.startTime) ?? this.storedStart;
      })
      // The HTTP error interceptor already reports the failure.
      .catch(() => undefined)
      .finally(() => {
        this.pendingStartWrites--;
        if (this.pendingStartWrites === 0) {
          this.startTime.set(this.storedStart);
        }
      });
  }

  private update(changes: UpdateSleepSessionDto): Promise<SleepSession> {
    const sessionId = this.sessionId();
    if (sessionId === null) {
      return Promise.reject(new Error('The sleep has not been stored yet'));
    }
    return this.enqueue(() => this.sleepService.update(CURRENT_BABY_ID, sessionId, changes));
  }

  private deleteStoredSession(): Promise<unknown> {
    const sessionId = this.sessionId();
    return sessionId === null
      ? Promise.resolve()
      : this.enqueue(() => this.sleepService.delete(CURRENT_BABY_ID, sessionId));
  }

  /** Continues the sleep that is still running, if any; otherwise the form starts empty. */
  private restoreOngoingSleep(): void {
    this.sleepService.getLatest(CURRENT_BABY_ID).subscribe({
      next: (session) => {
        if (session !== null && session.status === 'in_progress') {
          this.applySession(session);
        }
        this.finishLoading();
      },
      error: () => this.finishLoading(),
    });
  }

  private loadSession(sessionId: string): void {
    this.record.load(this.sleepService.getById(CURRENT_BABY_ID, sessionId), (session) => {
      this.applySession(session);
      if (session.status === 'finished') {
        this.record.captureBaseline();
      } else {
        // A sleep still running is continued like any other: it is not read-only history.
        this.record.exitHistoryMode();
      }
    });
  }

  private finishLoading(): void {
    // Anything the user changes from here on is data to lose when closing.
    this.record.captureBaseline();
    this.record.loading.set(false);
  }

  private applySession(session: SleepSession): void {
    this.sessionId.set(session.id);
    this.formModel.set({ awake: false, notes: session.notes ?? '' });
    const start = parseTimestamp(session.startTime) ?? this.startTime();
    this.storedStart = start;
    this.startTime.set(start);
    this.endTime.set(session.endTime === null ? null : parseTimestamp(session.endTime));
  }
}
