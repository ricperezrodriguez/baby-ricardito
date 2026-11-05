import { Component, computed, inject } from '@angular/core';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import {
  activeBreastOf,
  durationsByBreast,
  toTimedSegments,
  totalDuration,
} from '@app/features/breastfeeding/breastfeeding-timer';
import {
  BREAST_SIDE,
  Breast,
  BreastSegment,
  BreastfeedingSession,
} from '@app/features/breastfeeding/breastfeeding.models';
import { BreastfeedingService } from '@app/features/breastfeeding/breastfeeding.service';
import { AsyncState } from '@app/shared/async-state/async-state';
import { LastRecordSummary } from '@app/shared/last-record-summary/last-record-summary';
import { createLatestRecord } from '@app/shared/latest-record/latest-record';
import {
  TRACKING_CARD_ICON_SIZE,
  TrackingCard,
  createClock,
  formatDuration,
  formatElapsedSince,
} from '@shared';

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
  imports: [AsyncState, LastRecordSummary, TrackingCard],
  styleUrl: './breastfeeding-card.scss',
  templateUrl: './breastfeeding-card.html',
})
export class BreastfeedingCard {
  readonly breastSide = BREAST_SIDE;
  readonly iconSize = TRACKING_CARD_ICON_SIZE;

  private readonly breastfeedingService = inject(BreastfeedingService);
  private readonly clock = createClock();
  private readonly latest = createLatestRecord<BreastfeedingSession>(() =>
    this.breastfeedingService.getLatest(CURRENT_BABY_ID),
  );

  protected readonly latestState = this.latest.state;

  reload(): void {
    this.latest.reload();
  }

  /** Segments of the feed that is still open (running or paused), or `null` when there is none. */
  private readonly openFeedSegments = computed(() => {
    const state = this.latestState();
    return state.status === 'loaded' && state.data.status !== 'finished'
      ? toTimedSegments(state.data.segments)
      : null;
  });

  readonly isFeedOpen = computed(() => this.openFeedSegments() !== null);

  /** Route that opens the latest feed in history mode; `null` while it is still open or missing. */
  protected readonly recordRoute = computed(() => {
    const state = this.latestState();
    return state.status === 'loaded' && state.data.status === 'finished'
      ? ['lactancia', state.data.id]
      : null;
  });

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
    if (state.status !== 'loaded' || state.data.status !== 'finished' || !state.data.endTime) {
      return null;
    }

    return formatElapsedSince(state.data.endTime, now);
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
    return state.status === 'loaded' ? getLastBreast(state.data) : null;
  });

  readonly lastBreastCaption = computed(() => {
    const segments = this.openFeedSegments();
    return segments !== null && activeBreastOf(segments) !== null ? 'Lado actual' : 'Último lado';
  });

  readonly lastBreastLabel = computed(() => {
    const breast = this.lastBreast();
    return breast === BREAST_SIDE.LEFT
      ? 'Izquierdo'
      : breast === BREAST_SIDE.RIGHT
        ? 'Derecho'
        : 'Sin dato';
  });
}
