import { Component, computed, inject } from '@angular/core';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { DIAPER_TYPE_LABELS } from '@app/features/diaper/diaper.labels';
import { DiaperChange } from '@app/features/diaper/diaper.models';
import { DiaperService } from '@app/features/diaper/diaper.service';
import { AsyncState } from '@app/shared/async-state/async-state';
import { DiaperTypeIcon } from '@app/shared/diaper-type-icon/diaper-type-icon';
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

interface DiaperSummary {
  readonly latest: DiaperChange;
  /** Most recent change with poop; `null` when there is none. */
  readonly latestStool: DiaperChange | null;
  /** Changes of the current local day; `null` when the stats could not be loaded. */
  readonly todayChanges: number | null;
}

const CLOCK_TICK_MS = 60_000;

@Component({
  selector: 'app-diaper-card',
  imports: [AsyncState, DiaperTypeIcon, LastRecordSummary, TrackingCard],
  styleUrl: './diaper-card.scss',
  templateUrl: './diaper-card.html',
})
export class DiaperCard {
  readonly iconSize = TRACKING_CARD_ICON_SIZE;

  private readonly diaperService = inject(DiaperService);
  private readonly clock = createClock(CLOCK_TICK_MS);
  private readonly latest = createLatestRecord<DiaperSummary>(() => this.loadSummary());

  protected readonly latestState = this.latest.state;

  private readonly summary = computed(() => {
    const state = this.latestState();
    return state.status === 'loaded' ? state.data : null;
  });

  protected readonly lastChange = computed(() => {
    const summary = this.summary();
    if (summary === null) {
      return null;
    }

    return {
      elapsed: formatElapsedSince(summary.latest.changedAt, this.clock.now()),
      type: summary.latest.type,
      typeLabel: DIAPER_TYPE_LABELS[summary.latest.type],
    };
  });

  protected readonly todayText = computed(() => {
    const changes = this.summary()?.todayChanges;
    if (changes === null || changes === undefined) {
      return null;
    }

    return `Hoy: ${changes} ${changes === 1 ? 'cambio' : 'cambios'}`;
  });

  protected readonly stoolText = computed(() => {
    const summary = this.summary();
    if (summary === null) {
      return null;
    }

    return summary.latestStool === null
      ? 'Sin cacas registradas'
      : `Última caca: ${formatElapsedSince(summary.latestStool.changedAt, this.clock.now()).toLowerCase()}`;
  });

  protected readonly secondaryLines = computed(() => [this.todayText(), this.stoolText()]);

  protected readonly recordRoute = computed(() => {
    const summary = this.summary();
    return summary === null ? null : ['panal', summary.latest.id];
  });

  reload(): void {
    this.latest.reload();
  }

  private loadSummary(): Observable<DiaperSummary | null> {
    const { from, to } = localDateRange(this.clock.refresh(), 1);

    return forkJoin({
      latest: this.diaperService.getLatest(CURRENT_BABY_ID),
      latestStool: this.diaperService.getLatestStool(CURRENT_BABY_ID),
      // The stats only complement the card: if they fail, the rest is still shown.
      todayChanges: this.diaperService
        .getStats(CURRENT_BABY_ID, { from, to, timeZone: localTimeZone() })
        .pipe(
          map((stats): number | null => stats.totals.changes),
          catchError(() => of(null)),
        ),
    }).pipe(
      map(({ latest, latestStool, todayChanges }) =>
        latest === null ? null : { latest, latestStool, todayChanges },
      ),
    );
  }
}
