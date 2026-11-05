import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/**
 * Notes block of a record dialog: outlined textarea with an `n/max` counter.
 *
 * The dialog owns the value and the validation (`maxLength` in its `form()` schema, and `disabled` while
 * read-only or busy) and passes the notes field of its form. Read-only it shows nothing when there are no
 * notes, and no counter otherwise.
 */
@Component({
  selector: 'app-record-notes-field',
  imports: [FormField, MatFormFieldModule, MatInputModule],
  styles: `
    :host {
      display: block;
    }

    .notes-field {
      width: 100%;
    }

    .over-limit {
      color: var(--app-coral);
    }
  `,
  template: `
    @if (!readOnly() || field()().value()) {
      <mat-form-field class="notes-field" appearance="outline">
        <mat-label>{{ label() }}</mat-label>
        <textarea matInput rows="3" [formField]="field()"></textarea>
        @if (!readOnly()) {
          <mat-hint align="end" [class.over-limit]="field()().invalid()">
            {{ field()().value().length }}/{{ maxLength() }}
            @if (field()().invalid()) {
              · Máximo superado
            }
          </mat-hint>
        }
      </mat-form-field>
    }
  `,
})
export class RecordNotesField {
  /** Notes field of the dialog form (`form.notes`). */
  readonly field = input.required<FieldTree<string>>();
  /** Limit shown in the counter; the validation itself lives in the dialog form schema. */
  readonly maxLength = input.required<number>();
  readonly label = input('Notas');
  readonly readOnly = input(false);
}
