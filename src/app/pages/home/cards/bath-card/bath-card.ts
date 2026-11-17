import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { BathReactionIcon } from '@app/features/bath/bath-reaction-icon';
import { formatHairWashed } from '@app/features/bath/bath.labels';
import { Bath, BathStatsTotals } from '@app/features/bath/bath.models';
import { BathService } from '@app/features/bath/bath.service';
import { AsyncState } from '@app/shared/async-state/async-state';
import { LastRecordSummary } from '@app/shared/last-record-summary/last-record-summary';
import { createLatestRecord } from '@app/shared/latest-record/latest-record';
import {
  createClock,
  formatClockTime,
  formatDayHeading,
  formatElapsedSince,
  localDateKey,
  localDateRange,
  localTimeZone,
  parseTimestamp,
  TRACKING_CARD_ICON_SIZE,
  TrackingCard,
} from '@shared';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

interface BathSummary {
  readonly latest: Bath;
  /** Totals of the stats range (average) plus whole-history last hair wash; `null` when the stats failed. */
  readonly totals: BathStatsTotals | null;
}

const CLOCK_TICK_MS = 60_000;
/** Local days used for the average interval between baths (same as the 30-day period of the history). */
const AVERAGE_RANGE_DAYS = 30;
const AVERAGE_DAYS_FORMAT = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });

@Component({
  selector: 'app-bath-card',
  imports: [AsyncState, BathReactionIcon, LastRecordSummary, MatIconModule, TrackingCard],
  styleUrl: './bath-card.scss',
  templateUrl: './bath-card.html',
})
export class BathCard {
  readonly iconSize = TRACKING_CARD_ICON_SIZE;

  private readonly bathService = inject(BathService);
  private readonly clock = createClock(CLOCK_TICK_MS);
  private readonly latest = createLatestRecord<BathSummary>(() => this.loadSummary());

  protected readonly latestState = this.latest.state;

  private readonly summary = computed(() => {
    const state = this.latestState();
    return state.status === 'loaded' ? state.data : null;
  });

  protected readonly elapsed = computed(() => {
    const summary = this.summary();
    return summary === null ? null : formatElapsedSince(summary.latest.bathedAt, this.clock.now());
  });

  protected readonly hairWashed = computed(() => this.summary()?.latest.hairWashed ?? false);

  /** Baby's reaction in the latest bath; `null` hides the face icon. */
  protected readonly reaction = computed(() => this.summary()?.latest.reaction ?? null);

  protected readonly hairText = computed(() => {
    const summary = this.summary();
    return summary === null ? null : formatHairWashed(summary.latest.hairWashed);
  });

  /** Day and time of the latest bath, e.g. `Ayer · 19:30`. */
  private readonly whenLine = computed(() => {
    const summary = this.summary();
    const bathedAt = summary === null ? null : parseTimestamp(summary.latest.bathedAt);
    if (bathedAt === null) {
      return null;
    }

    return `${formatDayHeading(localDateKey(bathedAt), this.clock.now())} · ${formatClockTime(bathedAt)}`;
  });

  /** Whole-history last hair wash; hidden when the stats could not be loaded. */
  private readonly hairLine = computed(() => {
    const totals = this.summary()?.totals;
    if (totals === null || totals === undefined) {
      return null;
    }

    const { lastHairWashAt } = totals;
    return `Pelo · ${lastHairWashAt === null ? 'Sin registros' : formatElapsedSince(lastHairWashAt, this.clock.now())}`;
  });

  /** Hidden when the stats failed or there are no intervals in the range. */
  private readonly averageLine = computed(() => {
    const average = this.summary()?.totals?.averageIntervalDays ?? null;
    return average === null ? null : `Media: cada ${AVERAGE_DAYS_FORMAT.format(average)} d`;
  });

  protected readonly secondaryLines = computed(() => [
    this.whenLine(),
    this.hairLine(),
    this.averageLine(),
  ]);

  protected readonly recordRoute = computed(() => {
    const summary = this.summary();
    return summary === null ? null : ['bano', summary.latest.id];
  });

  reload(): void {
    this.latest.reload();
  }

  private loadSummary(): Observable<BathSummary | null> {
    const { from, to } = localDateRange(this.clock.refresh(), AVERAGE_RANGE_DAYS);

    return forkJoin({
      latest: this.bathService.getLatest(CURRENT_BABY_ID),
      // The stats only complement the card: if they fail, the rest is still shown.
      stats: this.bathService
        .getStats(CURRENT_BABY_ID, { from, to, timeZone: localTimeZone() })
        .pipe(
          map((stats): BathStatsTotals | null => stats.totals),
          catchError(() => of(null)),
        ),
    }).pipe(map(({ latest, stats }) => (latest === null ? null : { latest, totals: stats })));
  }
}
