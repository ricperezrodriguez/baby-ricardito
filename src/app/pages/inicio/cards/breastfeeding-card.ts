import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { BreastfeedingSession } from '../../../features/breastfeeding/breastfeeding.models';
import { BreastfeedingService } from '../../../features/breastfeeding/breastfeeding.service';
import {
  TRACKING_CARD_ICON_SIZE,
  TrackingCard,
} from '../../../shared/tracking-card/tracking-card';

const BABY_ID = 'baby-1';
const DATE_FORMATTER = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' });

type LatestBreastfeedingState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'loaded'; session: BreastfeedingSession }
  | { status: 'error' };

function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${totalMinutes} min`;
  }
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

@Component({
  selector: 'app-breastfeeding-card',
  imports: [TrackingCard],
  template: `
    <app-tracking-card
      link="/detalle/pecho"
      title="Lactancias"
      dialogTitle="Añadir lactancia"
      dialogMessage="Aquí podrás registrar una nueva sesión de lactancia."
      accent="var(--app-card-breastfeeding)"
      headerColor="var(--app-card-breastfeeding)"
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
        <path
          d="M9 25V14.5c0-2.5 1.8-4.5 4-4.5h.5V7.5a2.5 2.5 0 0 1 5 0V10h.5c2.2 0 4 2 4 4.5V25"
        />
        <path d="M8 25h16M12.5 17.5h7" />
      </svg>
      {{ summary() }}
    </app-tracking-card>
  `,
})
export class BreastfeedingCard {
  private readonly breastfeedingService = inject(BreastfeedingService);
  private readonly latestState = toSignal(
    this.breastfeedingService.getLatest(BABY_ID).pipe(
      map((session): LatestBreastfeedingState =>
        session === null ? { status: 'empty' } : { status: 'loaded', session },
      ),
      catchError((error: unknown) => {
        console.error('No se pudo cargar la última sesión de lactancia.', error);
        return of<LatestBreastfeedingState>({ status: 'error' });
      }),
    ),
    { initialValue: { status: 'loading' } as LatestBreastfeedingState },
  );

  readonly summary = computed(() => {
    const state = this.latestState();
    if (state.status === 'loading') {
      return 'Cargando la última toma...';
    }
    if (state.status === 'empty') {
      return 'Todavía no hay sesiones de lactancia registradas.';
    }
    if (state.status === 'error') {
      return 'No se pudo cargar la última sesión de lactancia.';
    }

    const sessionLabel =
      state.session.status === 'in_progress'
        ? 'Toma en curso'
        : state.session.status === 'paused'
          ? 'Última toma pausada'
          : 'Última toma';
    const startTime = DATE_FORMATTER.format(new Date(state.session.startTime));
    const duration = formatDuration(state.session.totalDurationSeconds);
    return `${sessionLabel}: ${startTime}. Duración: ${duration}.`;
  });
}
