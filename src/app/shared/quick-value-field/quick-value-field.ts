import { Component, computed, input, viewChild } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatChipListbox, MatChipListboxChange, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/**
 * Whole-number input of a record dialog with a row of quick-pick chips (`60 ml`, `90 ml`... or `1 gota`...).
 *
 * The dialog owns the value and the validation (`required`, `min`, `max`... and `disabled` in its `form()`
 * schema) and passes the field of its form plus the message to show; the chips follow the field: they are
 * disabled with it and the one equal to the current value is selected. Pressing the selected chip keeps it.
 */
@Component({
  selector: 'app-quick-value-field',
  imports: [FormField, MatChipsModule, MatFormFieldModule, MatInputModule],
  styles: `
    :host {
      display: block;
    }

    .value-field {
      width: 100%;
    }
  `,
  template: `
    <mat-form-field class="value-field" appearance="outline">
      <mat-label>{{ label() }}</mat-label>
      <input matInput type="number" inputmode="numeric" [formField]="field()" />
      @if (suffix(); as text) {
        <span matTextSuffix>{{ text }}</span>
      }
      @if (errorMessage(); as message) {
        <mat-error>{{ message }}</mat-error>
      }
    </mat-form-field>
    <mat-chip-listbox
      [attr.aria-label]="quickLabel()"
      [value]="selectedQuick()"
      [disabled]="field()().disabled()"
      (change)="selectQuick($event)"
    >
      @for (quick of quickOptions(); track quick.value) {
        <mat-chip-option [value]="quick.value">{{ quick.label }}</mat-chip-option>
      }
    </mat-chip-listbox>
  `,
})
export class QuickValueField {
  private readonly quickList = viewChild(MatChipListbox);

  /** Number field of the dialog form. */
  readonly field = input.required<FieldTree<number | null>>();
  /** Label of the input (it already carries the unit when there is no `suffix`, e.g. `Cantidad (ml)`). */
  readonly label = input.required<string>();
  /** Unit shown after the value (`ml`, `gotas`). */
  readonly suffix = input<string | null>(null);
  readonly quickValues = input.required<readonly number[]>();
  /** Text of a quick-pick chip; the plain number by default. */
  readonly formatQuick = input<(value: number) => string>((value) => String(value));
  /** Accessible name of the chip group. */
  readonly quickLabel = input('Cantidades habituales');
  /** Validation message shown under the input; the dialog derives it from the field errors. */
  readonly errorMessage = input<string | null>(null);

  protected readonly quickOptions = computed(() => {
    const format = this.formatQuick();
    return this.quickValues().map((value) => ({ value, label: format(value) }));
  });
  /** The quick value equal to the current one, if any. */
  protected readonly selectedQuick = computed(() => {
    const value = this.field()().value();
    return value !== null && this.quickValues().includes(value) ? value : null;
  });

  protected selectQuick(event: MatChipListboxChange): void {
    const value: unknown = event.value;
    if (typeof value === 'number') {
      this.field()().value.set(value);
    } else {
      // Pressing the selected chip must not clear the value: select it again.
      const list = this.quickList();
      if (list) {
        list.value = this.selectedQuick();
      }
    }
  }
}
