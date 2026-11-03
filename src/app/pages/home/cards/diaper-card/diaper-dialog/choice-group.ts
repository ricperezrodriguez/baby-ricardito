import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChild, input, model, TemplateRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Option of a `ChoiceGroup`: `value: null` is the "not specified" choice. */
export interface ChoiceOption<T extends string> {
  value: T | null;
  /** Visible text; it is also the accessible name of the option. */
  label: string;
  /** Material Symbols icon name. */
  icon?: string;
  /** Color of a decorative swatch shown instead of the icon. */
  color?: string;
}

/** Context of the `optionIcon` template. */
export interface ChoiceIconContext<T extends string> {
  $implicit: ChoiceOption<T>;
}

let nextGroupId = 0;

/**
 * Exclusive choice shown as large buttons with an icon (or color swatch) and a visible text.
 *
 * Built on native radio inputs, so the browser provides the radiogroup keyboard behavior
 * (arrows move and select, Tab enters and leaves the group). Nothing is selected while `value` is `null`
 * unless an option has `value: null`.
 */
@Component({
  selector: 'app-choice-group',
  imports: [MatIconModule, NgTemplateOutlet],
  host: {
    role: 'radiogroup',
    '[attr.aria-label]': 'label()',
  },
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .choice {
      align-items: center;
      background-color: var(--app-surface);
      border: 2px solid var(--app-muted);
      border-radius: 1.5rem;
      box-sizing: border-box;
      color: var(--app-ink);
      cursor: pointer;
      display: inline-flex;
      font-weight: 500;
      gap: 0.5rem;
      min-height: 3rem;
      padding: 0.5rem 1rem;
      position: relative;
    }

    .choice:has(.choice-input:focus-visible) {
      outline: 3px solid var(--app-focus);
      outline-offset: 2px;
    }

    .choice.selected {
      background-color: var(--app-green);
      border-color: var(--app-green);
      color: var(--app-on-green);
    }

    .choice.disabled {
      cursor: default;
      opacity: 0.6;
    }

    .choice-input {
      cursor: inherit;
      height: 100%;
      inset: 0;
      margin: 0;
      opacity: 0;
      position: absolute;
      width: 100%;
    }

    .swatch {
      border: 1px solid var(--app-ink);
      border-radius: 50%;
      box-sizing: border-box;
      flex: none;
      height: 1.5rem;
      width: 1.5rem;
    }

    .selected .swatch {
      box-shadow: 0 0 0 2px var(--app-surface);
    }
  `,
  template: `
    @for (option of options(); track option.value) {
      <label
        class="choice"
        [class.selected]="option.value === value()"
        [class.disabled]="disabled()"
      >
        <input
          class="choice-input"
          type="radio"
          [name]="name"
          [checked]="option.value === value()"
          [disabled]="disabled()"
          (change)="value.set(option.value)"
        />
        @if (option.color) {
          <span class="swatch" aria-hidden="true" [style.background-color]="option.color"></span>
        } @else if (iconTemplate(); as template) {
          <ng-container *ngTemplateOutlet="template; context: { $implicit: option }" />
        } @else if (option.icon) {
          <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">{{ option.icon }}</mat-icon>
        }
        <span>{{ option.label }}</span>
      </label>
    }
  `,
})
export class ChoiceGroup<T extends string> {
  protected readonly name = `choice-group-${nextGroupId++}`;
  /** Optional `<ng-template #optionIcon let-option>` that draws the icon of every option (replaces `icon`). */
  protected readonly iconTemplate = contentChild<TemplateRef<ChoiceIconContext<T>>>('optionIcon');

  /** Accessible name of the group. */
  readonly label = input.required<string>();
  readonly options = input.required<readonly ChoiceOption<T>[]>();
  readonly value = model<T | null>(null);
  readonly disabled = input(false);
}
