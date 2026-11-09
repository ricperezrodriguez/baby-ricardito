import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { disabled, form, maxLength } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import {
  formatNailAreas,
  NAIL_AREA_LABELS,
} from '@app/features/nail-trimming/nail-trimming.labels';
import {
  NAIL_AREAS,
  NAIL_TRIM_NOTES_MAX_LENGTH,
  NailTrim,
  NailTrimArea,
  UpdateNailTrimDto,
} from '@app/features/nail-trimming/nail-trimming.models';
import { NailTrimmingService } from '@app/features/nail-trimming/nail-trimming.service';
import { ChoiceGroup, ChoiceOption } from '@app/shared/choice-group/choice-group';
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

const AREAS_OPTIONS: readonly ChoiceOption<NailTrimArea>[] = [
  { value: 'hands', label: NAIL_AREA_LABELS.hands, icon: 'back_hand' },
  { value: 'feet', label: NAIL_AREA_LABELS.feet, icon: 'footprint' },
];

function sortAreas(areas: readonly NailTrimArea[]): NailTrimArea[] {
  return NAIL_AREAS.filter((area) => areas.includes(area));
}

/** Content of a trim as the backend stores it (without the baby, which only the creation sends). */
type NailTrimPayload = Required<UpdateNailTrimDto>;

@Component({
  imports: [
    ChoiceGroup,
    DatePipe,
    EditableTime,
    LoadingSpinner,
    MatButtonModule,
    MatIconModule,
    RecordNotesField,
    TrackingDialogLayout,
  ],
  styleUrl: './nail-trimming-dialog.scss',
  templateUrl: './nail-trimming-dialog.html',
})
export class NailTrimmingDialog {
  private readonly nailTrimmingService = inject(NailTrimmingService);
  private readonly clock = createClock();

  protected readonly areasOptions = AREAS_OPTIONS;
  protected readonly notesMaxLength = NAIL_TRIM_NOTES_MAX_LENGTH;

  /** The trim happened now unless the user says otherwise; hands are preselected. */
  protected readonly trimmedAt = signal(this.clock.now());
  protected readonly areas = signal<readonly NailTrimArea[]>(['hands']);
  private readonly formModel = signal({ notes: '' });
  /** Instant of the latest recorded trim, only known in creation mode (for the "already trimmed today" hint). */
  private readonly latestTrimmedAt = signal<number | null>(null);

  private readonly snapshot = computed(() =>
    JSON.stringify({
      trimmedAt: this.trimmedAt(),
      areas: sortAreas(this.areas()),
      notes: this.formModel().notes.trim(),
    }),
  );

  /**
   * View/edit/delete flows shared by the record dialogs. A trim opened from the history
   * (`/detalle/cortar-unas/:recordId`) is shown read-only until the user chooses to edit it.
   */
  protected readonly record = new RecordDialogController<NailTrim>({
    noun: 'corte',
    gender: 'masculine',
    creationTitle: 'Añadir corte de uñas',
    snapshot: () => this.snapshot(),
  });
  protected readonly form = form(this.formModel, (path) => {
    disabled(path.notes, () => this.record.editsDisabled());
    maxLength(path.notes, NAIL_TRIM_NOTES_MAX_LENGTH);
  });

  /** Backend trim that stores this record; it exists once it was loaded from the history. */
  private trimId: string | null = null;

  protected readonly saveDisabled = computed(
    () => this.record.saveDisabled(this.areas().length === 0) || this.form().invalid(),
  );
  /** A trim cannot be in the future; it moves forward with the clock. */
  protected readonly maxTrimmedAt = computed(() => this.clock.now());

  /**
   * Instant of the trim already recorded today, when the chosen time is also today (creation only).
   * It is a non-blocking notice and does not count as a change.
   */
  protected readonly todayTrimAt = computed(() => {
    const latest = this.latestTrimmedAt();
    if (this.record.historyMode() || latest === null) {
      return null;
    }
    const today = localDateKey(this.clock.now());
    return localDateKey(latest) === today && localDateKey(this.trimmedAt()) === today
      ? latest
      : null;
  });

  // Text of the read-only view.
  protected readonly areasText = computed(() => formatNailAreas(sortAreas(this.areas())));

  constructor() {
    if (this.record.requestedId === null) {
      // The preselected zones are part of the baseline: closing an untouched dialog is silent.
      this.record.captureBaseline();
      this.loadLatest();
    } else {
      this.loadTrim(this.record.requestedId);
    }
  }

  /** Main button: saves a new trim, starts editing one from the history, or confirms its changes. */
  protected onSave(): void {
    this.record.onSave({
      create: () => void this.save(),
      modify: () => void this.saveChanges(),
    });
  }

  private async save(): Promise<void> {
    if (this.record.isBlocked() || this.areas().length === 0 || this.form().invalid()) {
      return;
    }
    await this.record.finish('saving', () => this.create(), 'Corte de uñas guardado');
  }

  /** Stores the edits of a trim opened from the history, once the user confirms them. */
  private async saveChanges(): Promise<void> {
    await this.record.saveChanges(() => this.update());
  }

  /** Deletes the trim opened from the history, once the user confirms it. */
  protected async deleteTrim(): Promise<void> {
    await this.record.remove(() =>
      this.trimId === null
        ? Promise.resolve()
        : firstValueFrom(this.nailTrimmingService.delete(CURRENT_BABY_ID, this.trimId)),
    );
  }

  /** Close (X, outside click, Escape) and Cancelar: they ask only when there is something to lose. */
  protected async close(): Promise<void> {
    if (this.record.isBlocked()) {
      return;
    }
    await this.record.leaveDiscarding(this.record.dirty());
  }

  /** Loads the latest trim in the background for the hint; a failure just means no hint. */
  private loadLatest(): void {
    this.nailTrimmingService
      .getLatest(CURRENT_BABY_ID)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (latest) =>
          this.latestTrimmedAt.set(latest === null ? null : parseTimestamp(latest.trimmedAt)),
        // The HTTP error interceptor already reports the failure.
        error: () => undefined,
      });
  }

  private loadTrim(trimId: string): void {
    this.record.load(this.nailTrimmingService.getById(CURRENT_BABY_ID, trimId), (trim) => {
      this.trimId = trim.id;
      this.trimmedAt.set(parseTimestamp(trim.trimmedAt) ?? this.trimmedAt());
      this.areas.set(sortAreas(trim.areas));
      this.formModel.set({ notes: trim.notes ?? '' });
      this.record.captureBaseline();
    });
  }

  private create(): Promise<NailTrim> {
    const { trimmedAt, areas, notes } = this.payload();
    return firstValueFrom(
      this.nailTrimmingService.create({
        babyId: CURRENT_BABY_ID,
        trimmedAt,
        areas,
        notes: notes || undefined,
      }),
    );
  }

  private update(): Promise<NailTrim> {
    if (this.trimId === null) {
      throw new Error('There is no nail trim to update');
    }
    return firstValueFrom(
      this.nailTrimmingService.update(CURRENT_BABY_ID, this.trimId, this.payload()),
    );
  }

  private payload(): NailTrimPayload {
    const areas = sortAreas(this.areas());
    if (areas.length === 0) {
      throw new Error('The trimmed areas are required');
    }

    return {
      trimmedAt: toIsoString(this.trimmedAt()),
      areas,
      // An empty string clears the notes of an updated trim.
      notes: this.formModel().notes.trim(),
    };
  }
}
