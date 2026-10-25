import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, interval, map, of } from 'rxjs';
import {
  BREAST_SIDE,
  Breast,
  BreastSegment,
  BreastfeedingSession,
} from '@app/features/breastfeeding/breastfeeding.models';
import { BreastfeedingService } from '@app/features/breastfeeding/breastfeeding.service';
import { TRACKING_CARD_ICON_SIZE, TrackingCard } from '@shared';

const BABY_ID = 'baby-1';

type LatestBreastfeedingState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'loaded'; session: BreastfeedingSession }
  | { status: 'error' };

function getLastBreast(session: BreastfeedingSession): Breast | null {
  let lastSegment: BreastSegment | undefined;

  for (const segment of session.segments) {
    if (!lastSegment || Date.parse(segment.startTime) > Date.parse(lastSegment.startTime)) {
      lastSegment = segment;
    }
  }

  return lastSegment?.breast ?? null;
}

function formatElapsedSince(endTime: string, now: number): string {
  const elapsedMilliseconds = now - Date.parse(endTime);
  if (!Number.isFinite(elapsedMilliseconds)) {
    return 'Hora no disponible';
  }

  const elapsedMinutes = Math.max(0, Math.floor(elapsedMilliseconds / 60_000));
  const days = Math.floor(elapsedMinutes / 1_440);
  const hours = Math.floor((elapsedMinutes % 1_440) / 60);
  const minutes = elapsedMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `Hace ${days} d ${hours} h` : `Hace ${days} d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `Hace ${hours} h ${minutes} min` : `Hace ${hours} h`;
  }
  return elapsedMinutes > 0 ? `Hace ${elapsedMinutes} min` : 'Hace menos de 1 min';
}

@Component({
  selector: 'app-breastfeeding-card',
  imports: [TrackingCard],
  styleUrl: './breastfeeding-card.scss',
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
          d="M11 6v3c0 2-2 3-3 4-2 2-3 4-3 7v4c0 2 2 3 4 3h14c2 0 4-1 4-3v-4c0-3-1-5-3-7-1-1-3-2-3-4V6"
        />
        <path
          d="M6 17c2-2 4-3 6-3 2.5 0 4 2 3 4.5-1 3-3 5.5-5.5 5.5-2.5 0-4.5-2-4.5-5M26 17c-2-2-4-3-6-3-2.5 0-4 2-3 4.5 1 3 3 5.5 5.5 5.5 2.5 0 4.5-2 4.5-5"
        />
        <path d="M11 19h.01M21 19h.01" stroke-width="2.4" />
      </svg>
      @if (latestState(); as state) {
        @if (state.status === 'loaded') {
          <div class="breastfeeding-summary">
            <div class="feed-details">
              <span class="feed-status">
                {{
                  state.session.status === 'in_progress'
                    ? 'Toma en curso'
                    : state.session.status === 'paused'
                      ? 'Toma pausada'
                      : 'Última toma'
                }}
              </span>
              @if (timeSinceLastFeed(); as elapsed) {
                <span class="feed-elapsed">{{ elapsed }}</span>
              }
            </div>
            <div class="last-breast">
              <span class="last-breast-caption">Último lado</span>
              <svg
                class="breast-icon"
                viewBox="0 0 40 40"
                fill="none"
                aria-hidden="true"
              >
                <path
                  class="breast-lobe"
                  [class.highlighted]="lastBreast() === breastSide.LEFT"
                  d="M17 15c-3.5-3.5-9-3.5-11.5 0-2 3-1.5 9.5 1.3 13.2 2.4 3.2 6.2 3.7 8.7 1.5 2.8-2.5 3.6-6.8 1.5-10.4Z"
                />
                <path
                  class="breast-lobe"
                  [class.highlighted]="lastBreast() === breastSide.RIGHT"
                  d="M23 15c3.5-3.5 9-3.5 11.5 0 2 3 1.5 9.5-1.3 13.2-2.4 3.2-6.2 3.7-8.7 1.5-2.8-2.5-3.6-6.8-1.5-10.4Z"
                />
                <circle class="breast-nipple" cx="10.5" cy="22" r="1.2" />
                <circle class="breast-nipple" cx="29.5" cy="22" r="1.2" />
              </svg>
              <span class="last-breast-label">{{ lastBreastLabel() }}</span>
            </div>
          </div>
        } @else {
          <p class="state-message">{{ fallbackMessage() }}</p>
        }
      }
    </app-tracking-card>
  `,
})
export class BreastfeedingCard {
  readonly breastSide = BREAST_SIDE;

  private readonly breastfeedingService = inject(BreastfeedingService);
  private readonly clockTick = toSignal(interval(60_000), { initialValue: 0 });
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

  readonly timeSinceLastFeed = computed(() => {
    this.clockTick();
    const state = this.latestState();
    if (state.status !== 'loaded' || state.session.status !== 'finished' || !state.session.endTime) {
      return null;
    }

    return formatElapsedSince(state.session.endTime, Date.now());
  });

  readonly lastBreast = computed(() => {
    const state = this.latestState();
    return state.status === 'loaded' ? getLastBreast(state.session) : null;
  });

  readonly lastBreastLabel = computed(() => {
    const breast = this.lastBreast();
    return breast === BREAST_SIDE.LEFT ? 'Izquierdo' : breast === BREAST_SIDE.RIGHT ? 'Derecho' : 'Sin dato';
  });

  readonly fallbackMessage = computed(() => {
    const state = this.latestState();
    switch (state.status) {
      case 'loading':
        return 'Cargando la última toma...';
      case 'empty':
        return 'Todavía no hay sesiones de lactancia registradas.';
      case 'error':
        return 'No se pudo cargar la última sesión de lactancia.';
      case 'loaded':
        return '';
    }
  });
}
