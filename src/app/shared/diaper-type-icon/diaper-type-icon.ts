import { Component, input } from '@angular/core';
import { DIAPER_TYPE, DiaperType } from '@app/features/diaper/diaper.models';

/** Decorative icon of a diaper type: a drop for pee, a swirl for poop and both for mixed. Pair it with the type label. */
@Component({
  selector: 'app-diaper-type-icon',
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      align-items: center;
      display: inline-flex;
      gap: 0.15rem;
    }

    svg {
      fill: none;
      flex: 0 0 auto;
      height: var(--diaper-type-icon-size, 2.25rem);
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.6;
      width: var(--diaper-type-icon-size, 2.25rem);
    }
  `,
  template: `
    @if (type() !== diaperType.DIRTY) {
      <svg viewBox="0 0 24 24">
        <path d="M12 3.5c3 3.6 5.5 6.6 5.5 9.6a5.5 5.5 0 0 1-11 0c0-3 2.5-6 5.5-9.6Z" />
      </svg>
    }
    @if (type() !== diaperType.WET) {
      <svg viewBox="0 0 24 24">
        <path
          d="M12 3.5c-1 0-1.8.7-1.8 1.6 0 .7.4 1.2 1 1.6-2 .2-3.4 1.1-3.7 2.6-2 .3-3.5 1.6-3.5 3.4 0 2.1 1.9 3.7 4.4 3.7h7.2c2.5 0 4.4-1.6 4.4-3.7 0-1.8-1.5-3.1-3.5-3.4-.3-1.5-1.7-2.4-3.7-2.6.6-.4 1-.9 1-1.6 0-.9-.8-1.6-1.8-1.6Z"
        />
        <path d="M8.5 12.5c1 .9 2.2 1.3 3.5 1.3s2.5-.4 3.5-1.3" />
      </svg>
    }
  `,
})
export class DiaperTypeIcon {
  protected readonly diaperType = DIAPER_TYPE;

  readonly type = input.required<DiaperType>();
}
