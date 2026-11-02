import { Component } from '@angular/core';
import { TRACKING_CARD_ICON_SIZE, TrackingCard } from '@shared';

@Component({
  selector: 'app-bath-card',
  imports: [TrackingCard],
  template: `
    <app-tracking-card
      link="/detalle/bano"
      title="Baño"
      dialogTitle="Añadir baño"
      dialogMessage="Aquí podrás registrar un baño."
      accent="var(--app-card-bath)"
      headerColor="var(--app-card-bath)"
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
        stroke-width="2"
      >
        <path
          d="M5 16V9a3 3 0 0 1 6 0M3 16h26M5 16v4a6 6 0 0 0 6 6h10a6 6 0 0 0 6-6v-4M9 26l-1 2m15-2 1 2"
        />
        <circle cx="16" cy="11" r="1" />
        <circle cx="21" cy="8" r="1.5" />
      </svg>
      Consulta el seguimiento de los baños.
    </app-tracking-card>
  `,
})
export class BathCard {}
