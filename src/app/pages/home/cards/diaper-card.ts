import { Component } from '@angular/core';
import { TRACKING_CARD_ICON_SIZE, TrackingCard } from '@shared';

@Component({
  selector: 'app-diaper-card',
  imports: [TrackingCard],
  template: `
    <app-tracking-card
      link="/detalle/panal"
      title="Pañal"
      dialogTitle="Añadir cambio de pañal"
      dialogMessage="Aquí podrás registrar un cambio de pañal."
      accent="var(--app-card-diaper)"
      headerColor="var(--app-card-diaper)"
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
        <path
          d="M3 9h26l-2 11h-3c-2.2 0-3 1.3-3.8 3l-.9 2h-6.6l-.9-2C11 21.3 10.2 20 8 20H5L3 9Z"
        />
        <path
          d="M4 13h6m12 0h6M10 10v5m12-5v5M12 20c1.2-1 2.5-1.5 4-1.5s2.8.5 4 1.5"
          fill="none"
          stroke="var(--card-header-color)"
          stroke-width="1.2"
        />
      </svg>
      Registra los cambios y consulta su frecuencia.
    </app-tracking-card>
  `,
})
export class DiaperCard {}
