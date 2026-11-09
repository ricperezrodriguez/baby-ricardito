import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { formatNailAreas } from '@app/features/nail-trimming/nail-trimming.labels';
import {
  NailTrim,
  NailTrimmingStatsTotals,
} from '@app/features/nail-trimming/nail-trimming.models';
import { NailTrimmingService } from '@app/features/nail-trimming/nail-trimming.service';
import { AsyncState } from '@app/shared/async-state/async-state';
import { LastRecordSummary } from '@app/shared/last-record-summary/last-record-summary';
import { createLatestRecord } from '@app/shared/latest-record/latest-record';
import {
  createClock,
  formatElapsedSince,
  localDateRange,
  localTimeZone,
  TRACKING_CARD_ICON_SIZE,
  TrackingCard,
} from '@shared';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

interface NailTrimmingSummary {
  readonly latest: NailTrim;
  /** Whole-history totals (last trim per zone); `null` when the stats could not be loaded. */
  readonly totals: NailTrimmingStatsTotals | null;
}

const CLOCK_TICK_MS = 60_000;

@Component({
  selector: 'app-nail-trimming-card',
  imports: [AsyncState, LastRecordSummary, MatIconModule, TrackingCard],
  styleUrl: './nail-trimming-card.scss',
  templateUrl: './nail-trimming-card.html',
})
export class NailTrimmingCard {
  readonly iconSize = TRACKING_CARD_ICON_SIZE;

  private readonly nailTrimmingService = inject(NailTrimmingService);
  private readonly clock = createClock(CLOCK_TICK_MS);
  private readonly latest = createLatestRecord<NailTrimmingSummary>(() => this.loadSummary());

  protected readonly latestState = this.latest.state;

  private readonly summary = computed(() => {
    const state = this.latestState();
    return state.status === 'loaded' ? state.data : null;
  });

  protected readonly elapsed = computed(() => {
    const summary = this.summary();
    return summary === null ? null : formatElapsedSince(summary.latest.trimmedAt, this.clock.now());
  });

  protected readonly areasText = computed(() => {
    const summary = this.summary();
    return summary === null ? null : formatNailAreas(summary.latest.areas);
  });

  protected readonly hasHands = computed(
    () => this.summary()?.latest.areas.includes('hands') ?? false,
  );

  protected readonly hasFeet = computed(
    () => this.summary()?.latest.areas.includes('feet') ?? false,
  );

  protected readonly secondaryLines = computed(() => {
    const totals = this.summary()?.totals;
    if (totals === null || totals === undefined) {
      return [];
    }

    const now = this.clock.now();
    return [
      this.zoneLine('Manos', totals.lastHandsAt, now),
      this.zoneLine('Pies', totals.lastFeetAt, now),
    ];
  });

  protected readonly recordRoute = computed(() => {
    const summary = this.summary();
    return summary === null ? null : ['cortar-unas', summary.latest.id];
  });

  reload(): void {
    this.latest.reload();
  }

  private zoneLine(label: string, lastAt: string | null, now: number): string {
    return `${label} · ${lastAt === null ? 'Sin registros' : formatElapsedSince(lastAt, now)}`;
  }

  private loadSummary(): Observable<NailTrimmingSummary | null> {
    const { from, to } = localDateRange(this.clock.refresh(), 1);

    return forkJoin({
      latest: this.nailTrimmingService.getLatest(CURRENT_BABY_ID),
      // The stats only complement the card: if they fail, the rest is still shown.
      stats: this.nailTrimmingService
        .getStats(CURRENT_BABY_ID, { from, to, timeZone: localTimeZone() })
        .pipe(
          map((stats): NailTrimmingStatsTotals | null => stats.totals),
          catchError(() => of(null)),
        ),
    }).pipe(map(({ latest, stats }) => (latest === null ? null : { latest, totals: stats })));
  }
}
