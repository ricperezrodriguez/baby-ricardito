import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { NotificationService } from '@app/core/notification.service';
import { SleepSession } from '@app/features/sleep/sleep.models';
import { SleepService } from '@app/features/sleep/sleep.service';
import { sleepSpan } from '@app/features/sleep/sleep.span';
import { AsyncState } from '@app/shared/async-state/async-state';
import { LastRecordSummary } from '@app/shared/last-record-summary/last-record-summary';
import { createLatestRecord } from '@app/shared/latest-record/latest-record';
import {
  createClock,
  formatDuration,
  formatDurationText,
  formatElapsedSince,
  localDateRange,
  localTimeZone,
  spanDuration,
  toIsoString,
  TRACKING_CARD_ICON_SIZE,
  TrackingCard,
} from '@shared';
import { catchError, finalize, forkJoin, map, Observable, of } from 'rxjs';

interface SleepSummary {
  readonly latest: SleepSession;
  /** Seconds asleep today (finished sleeps only); `null` when the stats could not be loaded. */
  readonly todaySeconds: number | null;
}

@Component({
  selector: 'app-sleep-card',
  imports: [AsyncState, LastRecordSummary, MatButtonModule, TrackingCard],
  styleUrl: './sleep-card.scss',
  templateUrl: './sleep-card.html',
})
export class SleepCard {
  readonly iconSize = TRACKING_CARD_ICON_SIZE;

  private readonly sleepService = inject(SleepService);
  private readonly notifications = inject(NotificationService);
  private readonly clock = createClock();
  private readonly latest = createLatestRecord<SleepSummary>(() => this.loadSummary());

  protected readonly latestState = this.latest.state;
  protected readonly waking = signal(false);

  private readonly summary = computed(() => {
    const state = this.latestState();
    return state.status === 'loaded' ? state.data : null;
  });

  protected readonly isSleeping = computed(() => this.summary()?.latest.status === 'in_progress');

  protected readonly recordRoute = computed(() => {
    const latest = this.summary()?.latest;
    return latest?.status === 'finished' ? ['sueno', latest.id] : null;
  });

  protected readonly title = computed(() => {
    const latest = this.summary()?.latest;
    if (!latest) {
      return '';
    }

    if (latest.status === 'in_progress') {
      return 'Durmiendo';
    }

    return latest.endTime === null
      ? 'Despierto'
      : `Despierto ${formatElapsedSince(latest.endTime, this.clock.now()).toLowerCase()}`;
  });

  private readonly ongoingText = computed(() => {
    const latest = this.summary()?.latest;
    const span = latest?.status === 'in_progress' ? sleepSpan(latest) : null;
    return span === null
      ? null
      : `Duración ${formatDuration(spanDuration(span, this.clock.now()))}`;
  });

  private readonly lastSleepText = computed(() => {
    const latest = this.summary()?.latest;
    return latest?.status === 'finished'
      ? `Último sueño: ${formatDurationText(latest.durationSeconds * 1_000)}`
      : null;
  });

  private readonly todayText = computed(() => {
    const seconds = this.summary()?.todaySeconds;
    return seconds ? `Hoy: ${formatDurationText(seconds * 1_000)} dormido` : null;
  });

  protected readonly secondaryLines = computed(() => [
    this.ongoingText(),
    this.lastSleepText(),
    this.todayText(),
  ]);

  reload(): void {
    this.latest.reload();
  }

  /** Ends the ongoing sleep right now, without opening the modal. */
  protected wakeUp(): void {
    const latest = this.summary()?.latest;
    if (!latest || latest.status !== 'in_progress' || this.waking()) {
      return;
    }

    this.waking.set(true);
    this.sleepService
      .update(CURRENT_BABY_ID, latest.id, { endTime: toIsoString(this.clock.refresh()) })
      .pipe(finalize(() => this.waking.set(false)))
      .subscribe({
        // Errors are reported by the HTTP error interceptor.
        next: () => {
          this.notifications.success('Sueño terminado');
          this.reload();
        },
      });
  }

  private loadSummary(): Observable<SleepSummary | null> {
    const { from, to } = localDateRange(this.clock.refresh(), 1);

    return forkJoin({
      latest: this.sleepService.getLatest(CURRENT_BABY_ID),
      // The stats only complement the card: if they fail, the rest is still shown.
      todaySeconds: this.sleepService
        .getStats(CURRENT_BABY_ID, { from, to, timeZone: localTimeZone() })
        .pipe(
          map((stats): number | null => stats.totals.totalSeconds),
          catchError(() => of(null)),
        ),
    }).pipe(map(({ latest, todaySeconds }) => (latest === null ? null : { latest, todaySeconds })));
  }
}
