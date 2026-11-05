import { Component, computed, inject, signal } from '@angular/core';
import { disabled, form, FormField, maxLength } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import {
  DIAPER_TYPE_LABELS,
  STOOL_COLOR_LABELS,
  STOOL_CONSISTENCY_LABELS,
} from '@app/features/diaper/diaper.labels';
import {
  CreateDiaperChangeDto,
  DIAPER_NOTES_MAX_LENGTH,
  DIAPER_TYPES,
  DiaperChange,
  DiaperType,
  STOOL_COLORS,
  STOOL_CONSISTENCIES,
  STOOL_DIAPER_TYPES,
  StoolColor,
  StoolConsistency,
} from '@app/features/diaper/diaper.models';
import { DiaperService } from '@app/features/diaper/diaper.service';
import {
  createClock,
  DiaperTypeIcon,
  EditableTime,
  LoadingSpinner,
  parseTimestamp,
  PhotoApi,
  RecordDialogController,
  RecordPhoto,
  RecordPhotoField,
  toIsoString,
  TrackingDialogLayout,
} from '@shared';
import { firstValueFrom, switchMap, tap } from 'rxjs';
import { ChoiceGroup, ChoiceOption } from './choice-group';

const UNSPECIFIED_LABEL = 'Sin indicar';

/** Decorative swatch of each stool color (its Spanish name is always shown next to it). */
const STOOL_COLOR_SWATCHES: Record<StoolColor, string> = {
  yellow: '#f2c94c',
  green: '#4f8a3c',
  brown: '#7b4b2a',
  black: '#1b1b1b',
  red: '#c0281d',
  white: '#ffffff',
};

const STOOL_CONSISTENCY_ICONS: Record<StoolConsistency, string> = {
  liquid: 'water',
  soft: 'cloud',
  mucous: 'bubble_chart',
  firm: 'square',
};

// The type icon is drawn by `DiaperTypeIcon` (same as the card and the history), so these options have none.
const TYPE_OPTIONS: readonly ChoiceOption<DiaperType>[] = DIAPER_TYPES.map((value) => ({
  value,
  label: DIAPER_TYPE_LABELS[value],
}));

const STOOL_COLOR_OPTIONS: readonly ChoiceOption<StoolColor>[] = [
  { value: null, label: UNSPECIFIED_LABEL, icon: 'remove' },
  ...STOOL_COLORS.map((value) => ({
    value,
    label: STOOL_COLOR_LABELS[value],
    color: STOOL_COLOR_SWATCHES[value],
  })),
];

const STOOL_CONSISTENCY_OPTIONS: readonly ChoiceOption<StoolConsistency>[] = [
  { value: null, label: UNSPECIFIED_LABEL, icon: 'remove' },
  ...STOOL_CONSISTENCIES.map((value) => ({
    value,
    label: STOOL_CONSISTENCY_LABELS[value],
    icon: STOOL_CONSISTENCY_ICONS[value],
  })),
];

/** Content of a change as the backend stores it (without the baby, which only the creation sends). */
type DiaperPayload = Required<Omit<CreateDiaperChangeDto, 'babyId'>>;

@Component({
  imports: [
    ChoiceGroup,
    DiaperTypeIcon,
    EditableTime,
    FormField,
    LoadingSpinner,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    RecordPhotoField,
    TrackingDialogLayout,
  ],
  styleUrl: './diaper-dialog.scss',
  templateUrl: './diaper-dialog.html',
})
export class DiaperDialog {
  private readonly diaperService = inject(DiaperService);
  private readonly photoApi: PhotoApi<DiaperChange> = {
    upload: (id, file) => this.diaperService.uploadPhoto(CURRENT_BABY_ID, id, file),
    remove: (id) => this.diaperService.deletePhoto(CURRENT_BABY_ID, id),
  };
  private readonly clock = createClock();

  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly stoolColorOptions = STOOL_COLOR_OPTIONS;
  protected readonly stoolConsistencyOptions = STOOL_CONSISTENCY_OPTIONS;
  protected readonly notesMaxLength = DIAPER_NOTES_MAX_LENGTH;

  /** The change happened now unless the user says otherwise; there is no default type. */
  protected readonly changedAt = signal(this.clock.now());
  protected readonly type = signal<DiaperType | null>(null);
  protected readonly stoolColor = signal<StoolColor | null>(null);
  protected readonly stoolConsistency = signal<StoolConsistency | null>(null);
  private readonly formModel = signal({ hasRash: false, notes: '' });
  protected readonly photo = new RecordPhoto();

  private readonly snapshot = computed(() =>
    JSON.stringify({
      changedAt: this.changedAt(),
      type: this.type(),
      stoolColor: this.stoolColor(),
      stoolConsistency: this.stoolConsistency(),
      hasRash: this.formModel().hasRash,
      notes: this.formModel().notes.trim(),
      photo: this.photo.state(),
    }),
  );

  /**
   * View/edit/delete flows shared by the record dialogs. A change opened from the history
   * (`/detalle/panal/:recordId`) is shown read-only until the user chooses to edit it.
   */
  protected readonly record = new RecordDialogController<DiaperChange>({
    noun: 'pañal',
    gender: 'masculine',
    creationTitle: 'Añadir pañal',
    snapshot: () => this.snapshot(),
  });
  protected readonly form = form(this.formModel, (path) => {
    disabled(path.hasRash, () => this.record.editsDisabled());
    disabled(path.notes, () => this.record.readOnly());
    maxLength(path.notes, DIAPER_NOTES_MAX_LENGTH);
  });

  /** Backend change that stores this record; it exists once it was created or loaded. */
  private changeId: string | null = null;

  protected readonly hasStool = computed(() => {
    const type = this.type();
    return type !== null && STOOL_DIAPER_TYPES.includes(type);
  });
  protected readonly saveDisabled = computed(
    () => this.record.saveDisabled(this.type() === null) || this.form().invalid(),
  );

  // Texts of the read-only view.
  protected readonly typeText = computed(() => {
    const type = this.type();
    return type === null ? '' : DIAPER_TYPE_LABELS[type];
  });
  protected readonly stoolColorText = computed(() => {
    const color = this.stoolColor();
    return color === null ? UNSPECIFIED_LABEL : STOOL_COLOR_LABELS[color];
  });
  protected readonly stoolConsistencyText = computed(() => {
    const consistency = this.stoolConsistency();
    return consistency === null ? UNSPECIFIED_LABEL : STOOL_CONSISTENCY_LABELS[consistency];
  });
  /** A change cannot be in the future; it moves forward with the clock. */
  protected readonly maxChangedAt = computed(() => this.clock.now());

  constructor() {
    if (this.record.requestedId === null) {
      // Anything the user changes from here on is data to lose when closing.
      this.record.captureBaseline();
    } else {
      this.loadChange(this.record.requestedId);
    }
  }

  protected selectType(type: DiaperType | null): void {
    if (type === null) {
      return;
    }

    this.type.set(type);
    if (!STOOL_DIAPER_TYPES.includes(type)) {
      // A wet diaper has no stool data (the backend rejects it).
      this.stoolColor.set(null);
      this.stoolConsistency.set(null);
    }
  }

  /** Main button: saves a new change, starts editing one from the history, or confirms its changes. */
  protected onSave(): void {
    this.record.onSave({
      create: () => void this.save(),
      modify: () => void this.saveChanges(),
    });
  }

  private async save(): Promise<void> {
    if (this.record.isBlocked() || this.type() === null || this.form().invalid()) {
      return;
    }
    await this.record.finish('saving', () => this.store(), 'Pañal guardado');
  }

  /** Stores the edits of a change opened from the history, once the user confirms them. */
  private async saveChanges(): Promise<void> {
    await this.record.saveChanges(() => this.store());
  }

  /** Deletes the change opened from the history, once the user confirms it. */
  protected async deleteChange(): Promise<void> {
    await this.record.remove(() =>
      this.changeId === null
        ? Promise.resolve()
        : firstValueFrom(this.diaperService.delete(CURRENT_BABY_ID, this.changeId)),
    );
  }

  /** Close (X, outside click, Escape) and Cancelar: they ask only when there is something to lose. */
  protected async close(): Promise<void> {
    if (this.record.isBlocked()) {
      return;
    }
    await this.record.leaveDiscarding(this.record.dirty());
  }

  private loadChange(changeId: string): void {
    this.record.load(this.diaperService.getById(CURRENT_BABY_ID, changeId), (change) => {
      this.changeId = change.id;
      this.changedAt.set(parseTimestamp(change.changedAt) ?? this.changedAt());
      this.type.set(change.type);
      this.stoolColor.set(change.stoolColor);
      this.stoolConsistency.set(change.stoolConsistency);
      this.formModel.set({ hasRash: change.hasRash, notes: change.notes ?? '' });
      this.photo.setStored(change.photoUrl);
      this.record.captureBaseline();
    });
  }

  /** Stores the full state: creates the change on the first call and updates it afterwards. */
  private store(): Promise<DiaperChange> {
    const payload = this.payload();
    const stored$ =
      this.changeId === null
        ? this.diaperService
            .create({ babyId: CURRENT_BABY_ID, ...payload, notes: payload.notes || undefined })
            .pipe(tap((change) => (this.changeId = change.id)))
        : this.diaperService.update(CURRENT_BABY_ID, this.changeId, payload);

    return firstValueFrom(
      stored$.pipe(switchMap((change) => this.photo.sync(change, this.photoApi))),
    );
  }

  private payload(): DiaperPayload {
    const type = this.type();
    if (type === null) {
      throw new Error('The diaper type is required');
    }

    const withStool = STOOL_DIAPER_TYPES.includes(type);
    return {
      changedAt: toIsoString(this.changedAt()),
      type,
      // Explicit nulls so that switching to a wet diaper clears the stool data in the backend.
      stoolColor: withStool ? this.stoolColor() : null,
      stoolConsistency: withStool ? this.stoolConsistency() : null,
      hasRash: this.formModel().hasRash,
      notes: this.formModel().notes.trim(),
    };
  }
}
