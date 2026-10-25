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
import { formatElapsedSince, TRACKING_CARD_ICON_SIZE, TrackingCard } from '@shared';

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

@Component({
  selector: 'app-breastfeeding-card',
  imports: [TrackingCard],
  styleUrl: './breastfeeding-card.scss',
  templateUrl: './breastfeeding-card.html',
})
export class BreastfeedingCard {
  readonly breastSide = BREAST_SIDE;
  readonly iconSize = TRACKING_CARD_ICON_SIZE;

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
