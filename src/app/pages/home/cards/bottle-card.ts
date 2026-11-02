import { Component } from '@angular/core';
import {
  TRACKING_CARD_ICON_SIZE,
  TrackingCard,
} from '@shared';

@Component({
  selector: 'app-bottle-card',
  imports: [TrackingCard],
  template: `
    <app-tracking-card
      link="/detalle/biberon"
      title="Biberón"
      dialogTitle="Añadir toma de biberón"
      dialogMessage="Aquí podrás registrar una nueva toma de biberón."
      accent="var(--app-card-bottle)"
      headerColor="var(--app-card-bottle)"
    >
      <svg
        cardIcon
        viewBox="0 0 32 32"
        fill="currentColor"
        width="${TRACKING_CARD_ICON_SIZE}"
        height="${TRACKING_CARD_ICON_SIZE}"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.6"
      >
        <path d="M12 6h8v4l2 2v13a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V12l2-2V6Z" />
        <path d="M15 6V4h2v2" />
        <path
          d="M12 10h8M12 19h8"
          fill="none"
          stroke="var(--card-header-color)"
          stroke-width="1.2"
        />
      </svg>
      Consulta el seguimiento general de cada toma.
    </app-tracking-card>
  `,
})
export class BottleCard {}
