import { Component } from '@angular/core';
import {
  TRACKING_CARD_ICON_SIZE,
  TrackingCard,
} from '../../../shared/tracking-card/tracking-card';

@Component({
  selector: 'app-diaper-card',
  imports: [TrackingCard],
  template: `
    <app-tracking-card
      link="/detalle/panal"
      title="Cuidados"
      dialogTitle="Añadir cuidado"
      dialogMessage="Aquí podrás registrar un cambio de pañal y otros cuidados."
      accent="var(--app-card-diaper)"
      headerColor="var(--app-card-diaper)"
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
        <path d="M7 10h18l-2 13a3 3 0 0 1-3 2h-8a3 3 0 0 1-3-2L7 10Z" />
        <path d="M7 10c2 2 4 3 9 3s7-1 9-3M12 21c1.2-1.6 2.5-2.5 4-2.5s2.8.9 4 2.5" />
      </svg>
      Registra los cambios y consulta su frecuencia.
    </app-tracking-card>
  `,
})
export class DiaperCard {}
