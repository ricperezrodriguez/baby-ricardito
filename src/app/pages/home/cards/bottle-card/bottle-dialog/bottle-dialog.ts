import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { disabled, form, max, maxLength, min, required, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { BOTTLE_MILK_TYPE_LABELS, formatMl } from '@app/features/bottle/bottle.labels';
import {
  BOTTLE_AMOUNT_MAX_ML,
  BOTTLE_AMOUNT_MIN_ML,
  BOTTLE_MILK_TYPES,
  BOTTLE_NOTES_MAX_LENGTH,
  BOTTLE_QUICK_AMOUNTS_ML,
  BottleFeed,
  BottleMilkType,
  DEFAULT_BOTTLE_MILK_TYPE,
  UpdateBottleFeedDto,
} from '@app/features/bottle/bottle.models';
import { BottleService } from '@app/features/bottle/bottle.service';
import { ChoiceGroup, ChoiceOption } from '@app/shared/choice-group/choice-group';
import { QuickValueField } from '@app/shared/quick-value-field/quick-value-field';
import { RecordNotesField } from '@app/shared/record-dialog/record-notes-field';
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

const MILK_TYPE_OPTIONS: readonly ChoiceOption<BottleMilkType>[] = BOTTLE_MILK_TYPES.map((value) => ({
  value,
  label: BOTTLE_MILK_TYPE_LABELS[value],
}));

const AMOUNT_REQUIRED_MESSAGE = 'Indica la cantidad';
const AMOUNT_RANGE_MESSAGE = `Entre ${BOTTLE_AMOUNT_MIN_ML} y ${BOTTLE_AMOUNT_MAX_ML} ml`;
const AMOUNT_INTEGER_MESSAGE = 'Solo números enteros';

/** Content of a feed as the backend stores it (without the baby, which only the creation sends). */
type BottlePayload = Required<UpdateBottleFeedDto>;

@Component({
  imports: [
    ChoiceGroup,
    EditableTime,
    LoadingSpinner,
    MatButtonModule,
    MatIconModule,
    QuickValueField,
    RecordNotesField,
    TrackingDialogLayout,
  ],
  styleUrl: './bottle-dialog.scss',
  templateUrl: './bottle-dialog.html',
})
export class BottleDialog {
  private readonly bottleService = inject(BottleService);
  private readonly clock = createClock();

  protected readonly milkTypeOptions = MILK_TYPE_OPTIONS;
  protected readonly quickAmounts = BOTTLE_QUICK_AMOUNTS_ML;
  protected readonly formatMl = formatMl;
  protected readonly notesMaxLength = BOTTLE_NOTES_MAX_LENGTH;

  /** The feed happened now unless the user says otherwise. */
  protected readonly fedAt = signal(this.clock.now());
  protected readonly milkType = signal<BottleMilkType | null>(DEFAULT_BOTTLE_MILK_TYPE);
  private readonly formModel = signal<{ amount: number | null; notes: string }>({
    amount: null,
    notes: '',
  });

  private readonly snapshot = computed(() =>
    JSON.stringify({
      fedAt: this.fedAt(),
      milkType: this.milkType(),
      amount: this.formModel().amount,
      notes: this.formModel().notes.trim(),
    }),
  );

  /**
   * View/edit/delete flows shared by the record dialogs. A feed opened from the history
   * (`/detalle/biberon/:recordId`) is shown read-only until the user chooses to edit it.
   * It starts loading in both modes: the creation waits for the amount of the latest feed.
   */
  protected readonly record = new RecordDialogController<BottleFeed>({
    noun: 'biberón',
    gender: 'masculine',
    creationTitle: 'Añadir toma de biberón',
    snapshot: () => this.snapshot(),
    startLoading: true,
  });
  protected readonly form = form(this.formModel, (path) => {
    disabled(path.amount, () => this.record.editsDisabled());
    disabled(path.notes, () => this.record.editsDisabled());
    required(path.amount, { message: AMOUNT_REQUIRED_MESSAGE });
    min(path.amount, BOTTLE_AMOUNT_MIN_ML, { message: AMOUNT_RANGE_MESSAGE });
    max(path.amount, BOTTLE_AMOUNT_MAX_ML, { message: AMOUNT_RANGE_MESSAGE });
    validate(path.amount, ({ value }) => {
      const amount = value();
      return amount !== null && !Number.isInteger(amount)
        ? { kind: 'integer', message: AMOUNT_INTEGER_MESSAGE }
        : undefined;
    });
    maxLength(path.notes, BOTTLE_NOTES_MAX_LENGTH);
  });

  /** Backend feed that stores this record; it exists once it was loaded from the history. */
  private feedId: string | null = null;

  protected readonly saveDisabled = computed(
    () => this.record.saveDisabled(false) || this.form().invalid(),
  );
  protected readonly amountError = computed(() => {
    const error = this.form.amount().errors()[0];
    return error === undefined ? null : (error.message ?? AMOUNT_REQUIRED_MESSAGE);
  });

  // Texts of the read-only view.
  protected readonly milkTypeText = computed(() => {
    const milkType = this.milkType();
    return milkType === null ? '' : BOTTLE_MILK_TYPE_LABELS[milkType];
  });
  protected readonly amountText = computed(() => {
    const amount = this.formModel().amount;
    return amount === null ? '' : formatMl(amount);
  });
  /** A feed cannot be in the future; it moves forward with the clock. */
  protected readonly maxFedAt = computed(() => this.clock.now());

  constructor() {
    if (this.record.requestedId === null) {
      this.prefillAmount();
    } else {
      this.loadFeed(this.record.requestedId);
    }
  }

  protected selectMilkType(milkType: BottleMilkType | null): void {
    if (milkType !== null) {
      this.milkType.set(milkType);
    }
  }

  /** Main button: saves a new feed, starts editing one from the history, or confirms its changes. */
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
    await this.record.finish('saving', () => this.create(), 'Biberón guardado');
  }

  /** Stores the edits of a feed opened from the history, once the user confirms them. */
  private async saveChanges(): Promise<void> {
    await this.record.saveChanges(() => this.update());
  }

  /** Deletes the feed opened from the history, once the user confirms it. */
  protected async deleteFeed(): Promise<void> {
    await this.record.remove(() =>
      this.feedId === null
        ? Promise.resolve()
        : firstValueFrom(this.bottleService.delete(CURRENT_BABY_ID, this.feedId)),
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
   * Creation: starts with the amount of the latest feed (empty when there is none or it cannot be read).
   * The form is shown only afterwards, so nothing typed can be overwritten, and the prefilled values
   * are the baseline: closing without touching anything is silent.
   */
  private prefillAmount(): void {
    this.bottleService
      .getLatest(CURRENT_BABY_ID)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (latest) => this.finishPrefill(latest?.amountMl ?? null),
        // The HTTP error interceptor already reports the failure; the amount just stays empty.
        error: () => this.finishPrefill(null),
      });
  }

  private finishPrefill(amount: number | null): void {
    if (amount !== null && this.formModel().amount === null) {
      this.formModel.update((model) => ({ ...model, amount }));
    }
    this.record.captureBaseline();
    this.record.loading.set(false);
  }

  private loadFeed(feedId: string): void {
    this.record.load(this.bottleService.getById(CURRENT_BABY_ID, feedId), (feed) => {
      this.feedId = feed.id;
      this.fedAt.set(parseTimestamp(feed.fedAt) ?? this.fedAt());
      this.milkType.set(feed.milkType);
      this.formModel.set({ amount: feed.amountMl, notes: feed.notes ?? '' });
      this.record.captureBaseline();
    });
  }

  private create(): Promise<BottleFeed> {
    const { notes, ...payload } = this.payload();
    return firstValueFrom(
      this.bottleService.create({ babyId: CURRENT_BABY_ID, ...payload, notes: notes || undefined }),
    );
  }

  private update(): Promise<BottleFeed> {
    if (this.feedId === null) {
      throw new Error('There is no feed to update');
    }
    return firstValueFrom(this.bottleService.update(CURRENT_BABY_ID, this.feedId, this.payload()));
  }

  private payload(): BottlePayload {
    const { amount, notes } = this.formModel();
    const milkType = this.milkType();
    if (amount === null || milkType === null) {
      throw new Error('The amount and the milk type are required');
    }

    return {
      fedAt: toIsoString(this.fedAt()),
      amountMl: amount,
      milkType,
      // An empty string clears the notes of an updated feed.
      notes: notes.trim(),
    };
  }
}
