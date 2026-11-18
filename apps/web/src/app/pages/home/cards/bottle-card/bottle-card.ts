import { Component, computed, inject } from '@angular/core';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { BOTTLE_MILK_TYPE_LABELS, formatMl } from '@app/features/bottle/bottle.labels';
import { BottleFeed, BottleStatsTotals } from '@app/features/bottle/bottle.models';
import { BottleService } from '@app/features/bottle/bottle.service';
import { AsyncState } from '@app/shared/async-state/async-state';
import { LastRecordSummary } from '@app/shared/last-record-summary/last-record-summary';
import { createLatestRecord } from '@app/shared/latest-record/latest-record';
import {
  createClock,
  formatDurationText,
  formatElapsedSince,
  localDateRange,
  localTimeZone,
  TRACKING_CARD_ICON_SIZE,
  TrackingCard,
} from '@shared';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

interface BottleSummary {
  readonly latest: BottleFeed;
  /** Totals of the current local day; `null` when the stats could not be loaded. */
  readonly today: BottleStatsTotals | null;
}

const CLOCK_TICK_MS = 60_000;

@Component({
  selector: 'app-bottle-card',
  imports: [AsyncState, LastRecordSummary, TrackingCard],
  styleUrl: './bottle-card.scss',
  templateUrl: './bottle-card.html',
})
export class BottleCard {
  readonly iconSize = TRACKING_CARD_ICON_SIZE;

  private readonly bottleService = inject(BottleService);
  private readonly clock = createClock(CLOCK_TICK_MS);
  private readonly latest = createLatestRecord<BottleSummary>(() => this.loadSummary());

  protected readonly latestState = this.latest.state;

  private readonly summary = computed(() => {
    const state = this.latestState();
    return state.status === 'loaded' ? state.data : null;
  });

  protected readonly lastFeed = computed(() => {
    const summary = this.summary();
    if (summary === null) {
      return null;
    }

    return {
      elapsed: formatElapsedSince(summary.latest.fedAt, this.clock.now()),
      amount: formatMl(summary.latest.amountMl),
      milkTypeLabel: BOTTLE_MILK_TYPE_LABELS[summary.latest.milkType],
    };
  });

  protected readonly todayText = computed(() => {
    const today = this.summary()?.today;
    if (today === null || today === undefined) {
      return null;
    }

    return `Hoy: ${today.feeds} ${today.feeds === 1 ? 'toma' : 'tomas'} · ${formatMl(today.totalMl)}`;
  });

  /** Only with at least two feeds today (the backend returns `null` otherwise). */
  protected readonly intervalText = computed(() => {
    const seconds = this.summary()?.today?.averageIntervalSeconds;
    return seconds === null || seconds === undefined
      ? null
      : `Intervalo medio hoy: ${formatDurationText(seconds * 1_000)}`;
  });

  protected readonly secondaryLines = computed(() => [this.todayText(), this.intervalText()]);

  protected readonly recordRoute = computed(() => {
    const summary = this.summary();
    return summary === null ? null : ['biberon', summary.latest.id];
  });

  reload(): void {
    this.latest.reload();
  }

  private loadSummary(): Observable<BottleSummary | null> {
    const { from, to } = localDateRange(this.clock.refresh(), 1);

    return forkJoin({
      latest: this.bottleService.getLatest(CURRENT_BABY_ID),
      // The stats only complement the card: if they fail, the rest is still shown.
      today: this.bottleService.getStats(CURRENT_BABY_ID, { from, to, timeZone: localTimeZone() }).pipe(
        map((stats): BottleStatsTotals | null => stats.totals),
        catchError(() => of(null)),
      ),
    }).pipe(map(({ latest, today }) => (latest === null ? null : { latest, today })));
  }
}
