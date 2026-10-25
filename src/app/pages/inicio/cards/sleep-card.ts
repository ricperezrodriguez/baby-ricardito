import { Component } from '@angular/core';
import {
  TRACKING_CARD_ICON_SIZE,
  TrackingCard,
} from '../../../shared/tracking-card/tracking-card';

@Component({
  selector: 'app-sleep-card',
  imports: [TrackingCard],
  template: `
    <app-tracking-card
      link="/detalle/sueno"
      title="Descanso"
      accent="var(--app-card-sleep)"
      headerColor="var(--app-card-sleep)"
    >
      <svg
        cardIcon
        viewBox="0 0 32 32"
        fill="none"
        width="${TRACKING_CARD_ICON_SIZE}"
        height="${TRACKING_CARD_ICON_SIZE}"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.6"
      >
        <path d="M22.5 20.5A10 10 0 0 1 11 7.2 10 10 0 1 0 22.5 20.5Z" />
        <path d="m23 8 .7 1.8 1.8.7-1.8.7L23 13l-.7-1.8-1.8-.7 1.8-.7L23 8ZM17 4l.4 1 .9.4-.9.4-.4 1-.4-1-.9-.4.9-.4.4-1Z" />
      </svg>
      Revisa sus periodos de descanso a lo largo del día.
    </app-tracking-card>
  `,
})
export class SleepCard {}
