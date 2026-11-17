import { Component, computed, inject, signal } from '@angular/core';
import { disabled, form, maxLength } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { BATH_REACTION_ICONS, formatBathReaction } from '@app/features/bath/bath.labels';
import {
  BATH_NOTES_MAX_LENGTH,
  BATH_REACTIONS,
  Bath,
  BathReaction,
  UpdateBathDto,
} from '@app/features/bath/bath.models';
import { BathReactionIcon } from '@app/features/bath/bath-reaction-icon';
import { BathService } from '@app/features/bath/bath.service';
import { RecordDeleteButton } from '@app/shared/record-dialog/record-delete-button';
import { RecordNotesField } from '@app/shared/record-dialog/record-notes-field';
import {
  createTodayRecordHint,
  RecordTodayHint,
} from '@app/shared/record-dialog/record-today-hint';
import {
  createClock,
  EditableTime,
  LoadingSpinner,
  parseTimestamp,
  RecordDialogController,
  toIsoString,
  TrackingDialogLayout,
} from '@shared';
import { firstValueFrom } from 'rxjs';

/** Content of a bath as the backend stores it (without the baby, which only the creation sends). */
type BathPayload = Required<UpdateBathDto>;

/** Face button of the reaction selector: icon only, the label is its accessible name. */
interface ReactionOption {
  value: BathReaction;
  icon: string;
  label: string;
}

const REACTION_OPTIONS: readonly ReactionOption[] = BATH_REACTIONS.map((value) => ({
  value,
  icon: BATH_REACTION_ICONS[value],
  label: formatBathReaction(value),
}));

@Component({
  imports: [
    BathReactionIcon,
    EditableTime,
    LoadingSpinner,
    MatButtonModule,
    MatIconModule,
    RecordDeleteButton,
    RecordNotesField,
    RecordTodayHint,
    TrackingDialogLayout,
  ],
  styleUrl: './bath-dialog.scss',
  templateUrl: './bath-dialog.html',
})
export class BathDialog {
  private readonly bathService = inject(BathService);
  private readonly clock = createClock();

  protected readonly notesMaxLength = BATH_NOTES_MAX_LENGTH;

  /** The bath happened now unless the user says otherwise; the hair is not washed by default. */
  protected readonly bathedAt = signal(this.clock.now());
  protected readonly hairWashed = signal(false);
  /** Optional: nothing is chosen on open, and `null` is part of the baseline. */
  protected readonly reaction = signal<BathReaction | null>(null);
  protected readonly reactionOptions = REACTION_OPTIONS;
  private readonly formModel = signal({ notes: '' });

  private readonly snapshot = computed(() =>
    JSON.stringify({
      bathedAt: this.bathedAt(),
      hairWashed: this.hairWashed(),
      reaction: this.reaction(),
      notes: this.formModel().notes.trim(),
    }),
  );

  /**
   * View/edit/delete flows shared by the record dialogs. A bath opened from the history
   * (`/detalle/bano/:recordId`) is shown read-only until the user chooses to edit it.
   */
  protected readonly record = new RecordDialogController<Bath>({
    noun: 'baño',
    gender: 'masculine',
    creationTitle: 'Añadir baño',
    snapshot: () => this.snapshot(),
  });
  protected readonly form = form(this.formModel, (path) => {
    disabled(path.notes, () => this.record.editsDisabled());
    maxLength(path.notes, BATH_NOTES_MAX_LENGTH);
  });

  /** Backend bath that stores this record; it exists once it was loaded from the history. */
  private bathId: string | null = null;

  protected readonly saveDisabled = computed(
    () => this.record.saveDisabled(false) || this.form().invalid(),
  );
  /** A bath cannot be in the future; it moves forward with the clock. */
  protected readonly maxBathedAt = computed(() => this.clock.now());

  /** Non-blocking "already bathed today" notice (creation only). */
  protected readonly todayHint = createTodayRecordHint({
    clock: this.clock,
    chosenAt: () => this.bathedAt(),
    enabled: () => !this.record.historyMode(),
  });

  constructor() {
    if (this.record.requestedId === null) {
      // The default values are the baseline: closing an untouched dialog is silent.
      this.record.captureBaseline();
      this.todayHint.load(this.bathService.getLatest(CURRENT_BABY_ID), (latest) =>
        parseTimestamp(latest.bathedAt),
      );
    } else {
      this.loadBath(this.record.requestedId);
    }
  }

  protected toggleHairWashed(): void {
    if (!this.record.editsDisabled()) {
      this.hairWashed.update((washed) => !washed);
    }
  }

  /** Single choice that can be cleared: tapping the selected face deselects it. */
  protected toggleReaction(reaction: BathReaction): void {
    if (!this.record.editsDisabled()) {
      this.reaction.update((current) => (current === reaction ? null : reaction));
    }
  }

  /** Main button: saves a new bath, starts editing one from the history, or confirms its changes. */
  protected onSave(): void {
    this.record.onSave({
      create: () => void this.save(),
      modify: () => void this.saveChanges(),
    });
  }

  private async save(): Promise<void> {
    if (this.record.isBlocked() || this.form().invalid()) {
      return;
    }
    await this.record.finish('saving', () => this.create(), 'Baño guardado');
  }

  /** Stores the edits of a bath opened from the history, once the user confirms them. */
  private async saveChanges(): Promise<void> {
    await this.record.saveChanges(() => this.update());
  }

  /** Deletes the bath opened from the history, once the user confirms it. */
  protected async deleteBath(): Promise<void> {
    await this.record.remove(() =>
      this.bathId === null
        ? Promise.resolve()
        : firstValueFrom(this.bathService.delete(CURRENT_BABY_ID, this.bathId)),
    );
  }

  /** Close (X, outside click, Escape) and Cancelar: they ask only when there is something to lose. */
  protected async close(): Promise<void> {
    if (this.record.isBlocked()) {
      return;
    }
    await this.record.leaveDiscarding(this.record.dirty());
  }

  private loadBath(bathId: string): void {
    this.record.load(this.bathService.getById(CURRENT_BABY_ID, bathId), (bath) => {
      this.bathId = bath.id;
      this.bathedAt.set(parseTimestamp(bath.bathedAt) ?? this.bathedAt());
      this.hairWashed.set(bath.hairWashed);
      this.reaction.set(bath.reaction ?? null);
      this.formModel.set({ notes: bath.notes ?? '' });
      this.record.captureBaseline();
    });
  }

  private create(): Promise<Bath> {
    const { bathedAt, hairWashed, reaction, notes } = this.payload();
    return firstValueFrom(
      this.bathService.create({
        babyId: CURRENT_BABY_ID,
        bathedAt,
        hairWashed,
        // Only sent when chosen.
        reaction: reaction ?? undefined,
        notes: notes || undefined,
      }),
    );
  }

  private update(): Promise<Bath> {
    if (this.bathId === null) {
      throw new Error('There is no bath to update');
    }
    return firstValueFrom(this.bathService.update(CURRENT_BABY_ID, this.bathId, this.payload()));
  }

  private payload(): BathPayload {
    return {
      bathedAt: toIsoString(this.bathedAt()),
      hairWashed: this.hairWashed(),
      // `null` clears the reaction of an updated bath.
      reaction: this.reaction(),
      // An empty string clears the notes of an updated bath.
      notes: this.formModel().notes.trim(),
    };
  }
}
