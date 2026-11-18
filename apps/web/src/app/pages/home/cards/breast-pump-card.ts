import { Component } from '@angular/core';
import { TRACKING_CARD_ICON_SIZE, TrackingCard } from '@shared';

@Component({
  selector: 'app-breast-pump-card',
  imports: [TrackingCard],
  template: `
    <app-tracking-card
      link="/detalle/extractor-de-leche"
      title="Extractor de leche"
      dialogTitle="Añadir extracción de leche"
      dialogMessage="Aquí podrás registrar una extracción de leche."
      accent="var(--app-card-breast-pump)"
      headerColor="var(--app-card-breast-pump)"
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
          d="M10 15h12v10a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V15ZM12 15v-3h8v3M16 12V8m0 0 5-4m-5 4-5-4M11 4H7v6h4l5-2M21 4h4v6h-4l-5-2M12 20h8"
        />
      </svg>
      Consulta el seguimiento de las extracciones de leche.
    </app-tracking-card>
  `,
})
export class BreastPumpCard {}
