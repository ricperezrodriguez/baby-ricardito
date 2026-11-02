import { Component } from '@angular/core';
import { TRACKING_CARD_ICON_SIZE, TrackingCard } from '@shared';

@Component({
  selector: 'app-vitamin-d-card',
  imports: [TrackingCard],
  template: `
    <app-tracking-card
      link="/detalle/vitamina-d"
      title="Vitamina D"
      dialogTitle="Añadir vitamina D"
      dialogMessage="Aquí podrás registrar una toma de vitamina D."
      accent="var(--app-card-vitamin-d)"
      headerColor="var(--app-card-vitamin-d)"
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
        <path d="M16 3C13 8 7 14 7 19a9 9 0 0 0 18 0c0-5-6-11-9-16Z" />
        <path
          d="M11 19c0 2.8 2.2 5 5 5"
          fill="none"
          stroke="var(--card-header-color)"
          stroke-width="1.5"
        />
      </svg>
      Consulta el seguimiento de las tomas de vitamina D.
    </app-tracking-card>
  `,
})
export class VitaminDCard {}
