import { formatDate } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  LOCALE_ID,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormField, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  formatDuration,
  parseDateTimeLocal,
  parseDuration,
  toDateTimeLocal,
} from '@app/shared/utils/time.utils';

const DATE_TIME_FORMAT = 'dd/MM/yyyy HH:mm:ss';

/**
 * Hora o duración que el usuario puede modificar al pincharla.
 *
 * Muestra el valor como un botón; al activarlo se convierte en un campo editable que se confirma
 * con Enter o con el botón de aceptar y se descarta con Escape o con el botón de cancelar.
 * Escape no se propaga, para que no cierre el modal que lo contiene.
 *
 * `datetime` trabaja con ms epoch (fecha y hora locales) y `duration` con ms (`mm:ss` o `h:mm:ss`).
 * Emite `committed` solo cuando el valor editado es válido y distinto del mostrado.
 */
@Component({
  selector: 'app-editable-time',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  styles: `
    :host {
      display: inline-block;
      max-width: 100%;
    }

    .value-button,
    .value-text {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }

    .editor {
      align-items: flex-start;
      display: flex;
      gap: 0.25rem;
    }

    .field {
      flex: 1;
      min-width: 12rem;
    }
  `,
  template: `
    @if (editing()) {
      <div class="editor" role="group" [attr.aria-label]="'Editar ' + label().toLowerCase()">
        <mat-form-field class="field" appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ label() }}</mat-label>
          @if (kind() === 'datetime') {
            <input
              #editor
              matInput
              type="datetime-local"
              step="1"
              [formField]="form.text"
              (keydown)="onKeydown($event)"
            />
          } @else {
            <input
              #editor
              matInput
              type="text"
              inputmode="numeric"
              autocomplete="off"
              placeholder="mm:ss"
              [formField]="form.text"
              (keydown)="onKeydown($event)"
            />
          }
          @if (form.text().errors()[0]; as error) {
            <mat-error>{{ error.message }}</mat-error>
          }
        </mat-form-field>
        <button
          matIconButton
          type="button"
          [attr.aria-label]="'Aceptar ' + label().toLowerCase()"
          [disabled]="form().invalid()"
          (click)="commit()"
        >
          <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">check</mat-icon>
        </button>
        <button
          matIconButton
          type="button"
          [attr.aria-label]="'Cancelar edición de ' + label().toLowerCase()"
          (click)="cancel()"
        >
          <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">close</mat-icon>
        </button>
      </div>
    } @else if (disabled() || value() === null) {
      <span class="value-text">{{ displayText() }}</span>
    } @else {
      <button
        #trigger
        matButton
        type="button"
        class="value-button"
        [attr.aria-label]="'Editar ' + label().toLowerCase() + ': ' + displayText()"
        (click)="startEditing()"
      >
        {{ displayText() }}
        <mat-icon fontSet="material-symbols-outlined" iconPositionEnd aria-hidden="true">
          edit
        </mat-icon>
      </button>
    }
  `,
})
export class EditableTime {
  private readonly injector = inject(Injector);
  private readonly locale = inject(LOCALE_ID);

  /** Nombre del valor, usado como etiqueta del campo y en los textos accesibles. */
  readonly label = input.required<string>();
  readonly kind = input.required<'datetime' | 'duration'>();
  /** Ms epoch (`datetime`) o ms (`duration`); `null` si aún no hay valor. */
  readonly value = input.required<number | null>();
  /** Límites inclusivos en las mismas unidades que `value`. */
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  readonly disabled = input(false);
  /** Texto mostrado cuando no hay valor (`value` es `null`). */
  readonly emptyText = input('—');
  readonly committed = output<number>();

  private readonly editorElement = viewChild('editor', { read: ElementRef<HTMLInputElement> });
  private readonly triggerElement = viewChild('trigger', { read: ElementRef<HTMLButtonElement> });
  private readonly model = signal({ text: '' });

  protected readonly editing = signal(false);
  protected readonly form = form(this.model, (path) => {
    validate(path.text, ({ value }) => this.validateText(value()));
  });
  protected readonly displayText = computed(() => {
    const value = this.value();
    return value === null ? this.emptyText() : this.format(value);
  });

  protected startEditing(): void {
    const value = this.value();
    if (this.disabled() || value === null) {
      return;
    }

    this.model.set({ text: this.toEditableText(value) });
    this.form.text().markAsTouched();
    this.editing.set(true);
    afterNextRender(() => this.editorElement()?.nativeElement.focus(), { injector: this.injector });
  }

  protected commit(): void {
    const value = this.value();
    if (!this.editing() || value === null || this.form().invalid()) {
      return;
    }

    const parsed = this.parse(this.model().text);
    this.close();
    // Compared as text so the sub-second part hidden by the field does not count as a change.
    if (parsed !== null && this.toEditableText(parsed) !== this.toEditableText(value)) {
      this.committed.emit(parsed);
    }
  }

  protected cancel(): void {
    this.close();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.cancel();
    }
  }

  private close(): void {
    this.editing.set(false);
    afterNextRender(() => this.triggerElement()?.nativeElement.focus(), { injector: this.injector });
  }

  private validateText(text: string): { kind: string; message: string } | undefined {
    const parsed = this.parse(text);
    const isDateTime = this.kind() === 'datetime';
    if (parsed === null) {
      return {
        kind: 'invalid',
        message: isDateTime ? 'Indica una fecha y hora válidas' : 'Usa el formato mm:ss',
      };
    }

    const min = this.min();
    if (min !== null && parsed < min) {
      const limit = this.format(min);
      return {
        kind: 'min',
        message: isDateTime ? `No puede ser anterior a ${limit}` : `No puede ser inferior a ${limit}`,
      };
    }
    const max = this.max();
    if (max !== null && parsed > max) {
      const limit = this.format(max);
      return {
        kind: 'max',
        message: isDateTime ? `No puede ser posterior a ${limit}` : `No puede superar ${limit}`,
      };
    }
    return undefined;
  }

  private parse(text: string): number | null {
    return this.kind() === 'datetime' ? parseDateTimeLocal(text) : parseDuration(text);
  }

  private format(value: number): string {
    return this.kind() === 'datetime'
      ? formatDate(value, DATE_TIME_FORMAT, this.locale)
      : formatDuration(value);
  }

  private toEditableText(value: number): string {
    return this.kind() === 'datetime' ? toDateTimeLocal(value) : formatDuration(value);
  }
}
