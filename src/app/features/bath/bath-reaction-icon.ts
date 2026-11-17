import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BATH_REACTION_ICONS, formatBathReaction } from '@app/features/bath/bath.labels';
import { BathReaction } from '@app/features/bath/bath.models';

/**
 * Reaction of a bath as a coloured face icon, with no visible text (the accessible name is the
 * reaction label). The size inherits the font size of the consumer. Every colour is a dark app token
 * with at least 3:1 contrast on white (WCAG non-text contrast).
 */
@Component({
  selector: 'app-bath-reaction-icon',
  imports: [MatIconModule],
  host: {
    role: 'img',
    '[attr.aria-label]': 'label()',
    '[class.reaction-happy]': "reaction() === 'happy'",
    '[class.reaction-neutral]': "reaction() === 'neutral'",
    '[class.reaction-sad]': "reaction() === 'sad'",
  },
  template: `
    <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">{{ icon() }}</mat-icon>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 1;
      vertical-align: middle;
    }

    mat-icon {
      width: 1em;
      height: 1em;
      font-size: inherit;
      line-height: 1;
    }

    :host(.reaction-happy) {
      color: var(--app-green);
    }

    :host(.reaction-neutral) {
      color: var(--app-muted);
    }

    :host(.reaction-sad) {
      color: var(--app-coral);
    }
  `,
})
export class BathReactionIcon {
  readonly reaction = input.required<BathReaction>();

  protected readonly icon = computed(() => BATH_REACTION_ICONS[this.reaction()]);
  protected readonly label = computed(() => formatBathReaction(this.reaction()));
}
