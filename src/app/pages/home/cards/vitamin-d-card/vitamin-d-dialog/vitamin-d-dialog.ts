import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { disabled, form, max, maxLength, min, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { formatDrops } from '@app/features/vitamin-d/vitamin-d.labels';
import {
  UpdateVitaminDDoseDto,
  VITAMIN_D_DROPS_MAX,
  VITAMIN_D_DROPS_MIN,
  VITAMIN_D_NOTES_MAX_LENGTH,
  VITAMIN_D_QUICK_DROPS,
  VitaminDDose,
} from '@app/features/vitamin-d/vitamin-d.models';
import { VitaminDService } from '@app/features/vitamin-d/vitamin-d.service';
import { QuickValueField } from '@app/shared/quick-value-field/quick-value-field';
import { RecordNotesField } from '@app/shared/record-dialog/record-notes-field';
import {
  createClock,
  EditableTime,
  LoadingSpinner,
  localDateKey,
  parseTimestamp,
  RecordDialogController,
  toIsoString,
  TrackingDialogLayout,
} from '@shared';
import { firstValueFrom } from 'rxjs';

const DROPS_RANGE_MESSAGE = `Entre ${VITAMIN_D_DROPS_MIN} y ${VITAMIN_D_DROPS_MAX} gotas`;
const DROPS_INTEGER_MESSAGE = 'Solo números enteros';

/** Content of a dose as the backend stores it (without the baby, which only the creation sends). */
type VitaminDPayload = Required<UpdateVitaminDDoseDto>;

@Component({
  imports: [
    DatePipe,
    EditableTime,
    LoadingSpinner,
    MatButtonModule,
    MatIconModule,
    QuickValueField,
    RecordNotesField,
    TrackingDialogLayout,
  ],
  styleUrl: './vitamin-d-dialog.scss',
  templateUrl: './vitamin-d-dialog.html',
})
export class VitaminDDialog {
  private readonly vitaminDService = inject(VitaminDService);
  private readonly clock = createClock();

  protected readonly quickDrops = VITAMIN_D_QUICK_DROPS;
  protected readonly formatDrops = formatDrops;
  protected readonly notesMaxLength = VITAMIN_D_NOTES_MAX_LENGTH;

  /** The dose was given now unless the user says otherwise. */
  protected readonly givenAt = signal(this.clock.now());
  private readonly formModel = signal<{ drops: number | null; notes: string }>({
    drops: null,
    notes: '',
  });
  /** Instant of the latest recorded dose, only known in creation mode (for the "already given today" hint). */
  private readonly latestGivenAt = signal<number | null>(null);

  private readonly snapshot = computed(() =>
    JSON.stringify({
      givenAt: this.givenAt(),
      drops: this.formModel().drops,
      notes: this.formModel().notes.trim(),
    }),
  );

  /**
   * View/edit/delete flows shared by the record dialogs. A dose opened from the history
   * (`/detalle/vitamina-d/:recordId`) is shown read-only until the user chooses to edit it.
   * It starts loading in both modes: the creation waits for the drops of the latest dose.
   */
  protected readonly record = new RecordDialogController<VitaminDDose>({
    noun: 'dosis',
    gender: 'feminine',
    creationTitle: 'Añadir vitamina D',
    snapshot: () => this.snapshot(),
    startLoading: true,
  });
  protected readonly form = form(this.formModel, (path) => {
    disabled(path.drops, () => this.record.editsDisabled());
    disabled(path.notes, () => this.record.editsDisabled());
    min(path.drops, VITAMIN_D_DROPS_MIN, { message: DROPS_RANGE_MESSAGE });
    max(path.drops, VITAMIN_D_DROPS_MAX, { message: DROPS_RANGE_MESSAGE });
    validate(path.drops, ({ value }) => {
      const drops = value();
      return drops !== null && !Number.isInteger(drops)
        ? { kind: 'integer', message: DROPS_INTEGER_MESSAGE }
        : undefined;
    });
    maxLength(path.notes, VITAMIN_D_NOTES_MAX_LENGTH);
  });

  /** Backend dose that stores this record; it exists once it was loaded from the history. */
  private doseId: string | null = null;

  protected readonly saveDisabled = computed(
    () => this.record.saveDisabled(false) || this.form().invalid(),
  );
  protected readonly dropsError = computed(() => {
    const error = this.form.drops().errors()[0];
    return error === undefined ? null : (error.message ?? DROPS_RANGE_MESSAGE);
  });
  /** A dose cannot be in the future; it moves forward with the clock. */
  protected readonly maxGivenAt = computed(() => this.clock.now());

  /**
   * Instant of the dose already given today, when the chosen time is also today (creation only).
   * It is a non-blocking notice: several doses per day are allowed and it does not count as a change.
   */
  protected readonly todayDoseAt = computed(() => {
    const latest = this.latestGivenAt();
    if (this.record.historyMode() || latest === null) {
      return null;
    }
    const today = localDateKey(this.clock.now());
    return localDateKey(latest) === today && localDateKey(this.givenAt()) === today ? latest : null;
  });

  // Texts of the read-only view.
  protected readonly dropsText = computed(() => {
    const drops = this.formModel().drops;
    return drops === null ? '' : formatDrops(drops);
  });

  constructor() {
    if (this.record.requestedId === null) {
      this.prefillDrops();
    } else {
      this.loadDose(this.record.requestedId);
    }
  }

  /** Main button: saves a new dose, starts editing one from the history, or confirms its changes. */
  protected onSave(): void {
    this.record.onSave({
      create: () => void this.save(),
      modify: () => void this.saveChanges(),
    });
  }

  private async save(): Promise<void> {
    if (this.record.isBlocked() || this.record.loading() || this.form().invalid()) {
      return;
    }
    await this.record.finish('saving', () => this.create(), 'Vitamina D guardada');
  }

  /** Stores the edits of a dose opened from the history, once the user confirms them. */
  private async saveChanges(): Promise<void> {
    await this.record.saveChanges(() => this.update());
  }

  /** Deletes the dose opened from the history, once the user confirms it. */
  protected async deleteDose(): Promise<void> {
    await this.record.remove(() =>
      this.doseId === null
        ? Promise.resolve()
        : firstValueFrom(this.vitaminDService.delete(CURRENT_BABY_ID, this.doseId)),
    );
  }

  /** Close (X, outside click, Escape) and Cancelar: they ask only when there is something to lose. */
  protected async close(): Promise<void> {
    if (this.record.isBlocked()) {
      return;
    }
    await this.record.leaveDiscarding(this.record.dirty());
  }

  /**
   * Creation: starts with the drops of the latest dose (empty when there is none or it cannot be read).
   * The form is shown only afterwards, so nothing typed can be overwritten, and the prefilled values
   * are the baseline: closing without touching anything is silent.
   */
  private prefillDrops(): void {
    this.vitaminDService
      .getLatest(CURRENT_BABY_ID)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (latest) => {
          this.latestGivenAt.set(latest === null ? null : parseTimestamp(latest.givenAt));
          this.finishPrefill(latest?.drops ?? null);
        },
        // The HTTP error interceptor already reports the failure; the drops just stay empty.
        error: () => this.finishPrefill(null),
      });
  }

  private finishPrefill(drops: number | null): void {
    if (drops !== null && this.formModel().drops === null) {
      this.formModel.update((model) => ({ ...model, drops }));
    }
    this.record.captureBaseline();
    this.record.loading.set(false);
  }

  private loadDose(doseId: string): void {
    this.record.load(this.vitaminDService.getById(CURRENT_BABY_ID, doseId), (dose) => {
      this.doseId = dose.id;
      this.givenAt.set(parseTimestamp(dose.givenAt) ?? this.givenAt());
      this.formModel.set({ drops: dose.drops ?? null, notes: dose.notes ?? '' });
      this.record.captureBaseline();
    });
  }

  private create(): Promise<VitaminDDose> {
    const { drops, notes, givenAt } = this.payload();
    return firstValueFrom(
      this.vitaminDService.create({
        babyId: CURRENT_BABY_ID,
        givenAt,
        drops: drops ?? undefined,
        notes: notes || undefined,
      }),
    );
  }

  private update(): Promise<VitaminDDose> {
    if (this.doseId === null) {
      throw new Error('There is no dose to update');
    }
    return firstValueFrom(this.vitaminDService.update(CURRENT_BABY_ID, this.doseId, this.payload()));
  }

  private payload(): VitaminDPayload {
    const { drops, notes } = this.formModel();

    return {
      givenAt: toIsoString(this.givenAt()),
      // `null` clears the drops of an updated dose.
      drops,
      // An empty string clears the notes of an updated dose.
      notes: notes.trim(),
    };
  }
}
