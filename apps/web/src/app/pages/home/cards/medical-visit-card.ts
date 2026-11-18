import { Component } from '@angular/core';
import { TRACKING_CARD_ICON_SIZE, TrackingCard } from '@shared';

@Component({
  selector: 'app-medical-visit-card',
  imports: [TrackingCard],
  template: `
    <app-tracking-card
      link="/detalle/visita-medica"
      title="Visita médica"
      dialogTitle="Añadir visita médica"
      dialogMessage="Aquí podrás registrar una visita médica."
      accent="var(--app-card-medical-visit)"
      headerColor="var(--app-card-medical-visit)"
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
        <rect x="5" y="7" width="22" height="20" rx="3" />
        <path d="M12 7V5h8v2M12 17h8m-4-4v8" />
      </svg>
      Consulta el seguimiento de las visitas médicas.
    </app-tracking-card>
  `,
})
export class MedicalVisitCard {}
