import { Component } from '@angular/core';
import { TRACKING_CARD_ICON_SIZE, TrackingCard } from '@shared';

@Component({
  selector: 'app-nail-trimming-card',
  imports: [TrackingCard],
  template: `
    <app-tracking-card
      link="/detalle/cortar-unas"
      title="Cortar uñas"
      dialogTitle="Añadir corte de uñas"
      dialogMessage="Aquí podrás registrar un corte de uñas."
      accent="var(--app-card-nail-trimming)"
      headerColor="var(--app-card-nail-trimming)"
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
        <circle cx="7" cy="9" r="3" />
        <circle cx="7" cy="23" r="3" />
        <path d="M9.5 10.7 26 23M9.5 21.3 26 9" />
      </svg>
      Consulta el seguimiento de los cortes de uñas.
    </app-tracking-card>
  `,
})
export class NailTrimmingCard {}
