import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, map, of, switchMap } from 'rxjs';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import {
  BREAST_SIDE,
  Breast,
  BreastSegment,
  BreastfeedingSession,
} from '@app/features/breastfeeding/breastfeeding.models';
import { BreastfeedingService } from '@app/features/breastfeeding/breastfeeding.service';
import {
  activeBreastOf,
  durationsByBreast,
  toTimedSegments,
  totalDuration,
} from '@app/features/breastfeeding/breastfeeding-timer';
import {
  createClock,
  formatDuration,
  formatElapsedSince,
  LoadingSpinner,
  TRACKING_CARD_ICON_SIZE,
  TrackingCard,
} from '@shared';

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
  imports: [LoadingSpinner, TrackingCard],
  styleUrl: './breastfeeding-card.scss',
  templateUrl: './breastfeeding-card.html',
})
export class BreastfeedingCard {
  readonly breastSide = BREAST_SIDE;
  readonly iconSize = TRACKING_CARD_ICON_SIZE;

  private readonly breastfeedingService = inject(BreastfeedingService);
  private readonly clock = createClock();
  private readonly reload$ = new BehaviorSubject<void>(undefined);
  private readonly latestState = toSignal(
    this.reload$.pipe(
      switchMap(() =>
        this.breastfeedingService.getLatest(CURRENT_BABY_ID).pipe(
          map((session): LatestBreastfeedingState =>
            session === null ? { status: 'empty' } : { status: 'loaded', session },
          ),
          catchError(() => {
            return of<LatestBreastfeedingState>({ status: 'error' });
          }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as LatestBreastfeedingState },
  );

  reload(): void {
    this.reload$.next();
  }

  /** Segments of the feed that is still open (running or paused), or `null` when there is none. */
  private readonly openFeedSegments = computed(() => {
    const state = this.latestState();
    return state.status === 'loaded' && state.session.status !== 'finished'
      ? toTimedSegments(state.session.segments)
      : null;
  });

  readonly isFeedOpen = computed(() => this.openFeedSegments() !== null);

  readonly feedStatus = computed(() => {
    const segments = this.openFeedSegments();
    if (segments === null) {
      return 'Última toma';
    }

    return activeBreastOf(segments) === null ? 'Toma en pausa' : 'Toma en curso';
  });

  readonly feedElapsed = computed(() => {
    const now = this.clock.now();
    const segments = this.openFeedSegments();
    if (segments !== null) {
      return `Duración ${formatDuration(totalDuration(segments, now))}`;
    }

    const state = this.latestState();
    if (state.status !== 'loaded' || state.session.status !== 'finished' || !state.session.endTime) {
      return null;
    }

    return formatElapsedSince(state.session.endTime, now);
  });

  /** Time spent on each breast while a feed is in progress; `null` otherwise. */
  readonly breastDurations = computed(() => {
    const segments = this.openFeedSegments();
    if (segments === null) {
      return null;
    }

    const { left, right } = durationsByBreast(segments, this.clock.now());
    return { left: formatDuration(left), right: formatDuration(right) };
  });

  readonly lastBreast = computed(() => {
    const state = this.latestState();
    return state.status === 'loaded' ? getLastBreast(state.session) : null;
  });

  readonly lastBreastCaption = computed(() => {
    const segments = this.openFeedSegments();
    return segments !== null && activeBreastOf(segments) !== null ? 'Lado actual' : 'Último lado';
  });

  readonly lastBreastLabel = computed(() => {
    const breast = this.lastBreast();
    return breast === BREAST_SIDE.LEFT ? 'Izquierdo' : breast === BREAST_SIDE.RIGHT ? 'Derecho' : 'Sin dato';
  });
}
