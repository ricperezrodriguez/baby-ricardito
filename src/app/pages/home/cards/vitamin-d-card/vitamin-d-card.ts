import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { formatDoseCount, formatDrops } from '@app/features/vitamin-d/vitamin-d.labels';
import { VitaminDDose, VitaminDStatsTotals } from '@app/features/vitamin-d/vitamin-d.models';
import { VitaminDService } from '@app/features/vitamin-d/vitamin-d.service';
import { AsyncState } from '@app/shared/async-state/async-state';
import { LastRecordSummary } from '@app/shared/last-record-summary/last-record-summary';
import { createLatestRecord } from '@app/shared/latest-record/latest-record';
import {
  createClock,
  formatElapsedSince,
  localDateKey,
  localDateRange,
  localTimeZone,
  parseTimestamp,
  TRACKING_CARD_ICON_SIZE,
  TrackingCard,
} from '@shared';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

interface VitaminDSummary {
  readonly latest: VitaminDDose;
  /** Totals of the current local day plus the streak; `null` when the stats could not be loaded. */
  readonly stats: VitaminDStatsTotals | null;
}

const CLOCK_TICK_MS = 60_000;

@Component({
  selector: 'app-vitamin-d-card',
  imports: [AsyncState, LastRecordSummary, MatIconModule, TrackingCard],
  styleUrl: './vitamin-d-card.scss',
  templateUrl: './vitamin-d-card.html',
})
export class VitaminDCard {
  readonly iconSize = TRACKING_CARD_ICON_SIZE;

  private readonly vitaminDService = inject(VitaminDService);
  private readonly clock = createClock(CLOCK_TICK_MS);
  private readonly latest = createLatestRecord<VitaminDSummary>(() => this.loadSummary());

  protected readonly latestState = this.latest.state;

  private readonly summary = computed(() => {
    const state = this.latestState();
    return state.status === 'loaded' ? state.data : null;
  });

  protected readonly elapsed = computed(() => {
    const summary = this.summary();
    return summary === null ? null : formatElapsedSince(summary.latest.givenAt, this.clock.now());
  });

  /** Whether the latest dose belongs to the current local day. */
  protected readonly givenToday = computed(() => {
    const summary = this.summary();
    const givenAt = summary === null ? null : parseTimestamp(summary.latest.givenAt);
    return givenAt !== null && localDateKey(givenAt) === localDateKey(this.clock.now());
  });

  /** Doses (and drops, when recorded) of today; only once today's dose is given and the stats loaded. */
  protected readonly todayText = computed(() => {
    const today = this.summary()?.stats;
    if (!this.givenToday() || today === null || today === undefined) {
      return null;
    }

    const doses = `Hoy: ${formatDoseCount(today.doses)}`;
    return today.drops === null ? doses : `${doses} · ${formatDrops(today.drops)}`;
  });

  protected readonly streakText = computed(() => {
    const days = this.summary()?.stats?.currentStreakDays ?? 0;
    return days > 0 ? `Racha: ${days === 1 ? '1 día' : `${days} días`} seguidos` : null;
  });

  protected readonly secondaryLines = computed(() => [this.todayText(), this.streakText()]);

  protected readonly recordRoute = computed(() => {
    const summary = this.summary();
    return summary === null ? null : ['vitamina-d', summary.latest.id];
  });

  reload(): void {
    this.latest.reload();
  }

  private loadSummary(): Observable<VitaminDSummary | null> {
    const { from, to } = localDateRange(this.clock.refresh(), 1);

    return forkJoin({
      latest: this.vitaminDService.getLatest(CURRENT_BABY_ID),
      // The stats only complement the card: if they fail, the rest is still shown.
      stats: this.vitaminDService.getStats(CURRENT_BABY_ID, { from, to, timeZone: localTimeZone() }).pipe(
        map((stats): VitaminDStatsTotals | null => stats.totals),
        catchError(() => of(null)),
      ),
    }).pipe(map(({ latest, stats }) => (latest === null ? null : { latest, stats })));
  }
}
