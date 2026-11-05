import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, forkJoin, map } from 'rxjs';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { FeedingOverdueAlertSettings, FinishedFeeding } from '@app/features/feeding/feeding.models';
import { FeedingService } from '@app/features/feeding/feeding.service';
import { createLatestRecord } from '@app/shared/latest-record/latest-record';
import {
  AlertBanner,
  createAlertDismissal,
  createClock,
  DialogRouteEvents,
  formatDurationText,
  localDateKey,
  parseTimestamp,
} from '@shared';

interface FeedingAlertData {
  readonly settings: FeedingOverdueAlertSettings;
  readonly feed: FinishedFeeding;
}

interface FeedingAlert {
  readonly message: string;
  /** Identifies the last feed, so a new one shows the alert again even on the same day. */
  readonly fingerprint: string;
}

const CLOCK_TICK_MS = 60_000;
const HOUR_MS = 3_600_000;
/** Home child routes whose modals can change the alert: a breastfeeding session, a bottle feed or the settings. */
const REFRESH_ROUTES: readonly string[] = ['lactancia', 'biberon', 'notificaciones'];

/**
 * Warning shown on Home when too much time has passed since the last feed (breastfeeding or bottle).
 * It reloads by itself when one of those modals closes, so it needs no inputs.
 */
@Component({
  selector: 'app-feeding-overdue-alert',
  imports: [AlertBanner],
  template: `
    @if (alert(); as current) {
      <app-alert-banner
        [message]="current.message"
        dismissLabel="Cerrar aviso de toma"
        (dismissed)="dismiss(current)"
      />
    }
  `,
})
export class FeedingOverdueAlert {
  private readonly feedingService = inject(FeedingService);
  private readonly clock = createClock(CLOCK_TICK_MS);
  private readonly dismissal = createAlertDismissal('feeding-overdue', CURRENT_BABY_ID);
  private readonly latest = createLatestRecord<FeedingAlertData>(() =>
    forkJoin({
      settings: this.feedingService.getOverdueAlertSettings(CURRENT_BABY_ID),
      feed: this.feedingService.getLastFeed(CURRENT_BABY_ID),
    }).pipe(
      // No feed yet, or one in progress (the baby is being fed): nothing to warn about.
      map(({ settings, feed }) => (feed === null || feed.status === 'in_progress' ? null : { settings, feed })),
    ),
  );

  /** The alert to show, or `null` while it must stay hidden. */
  protected readonly alert = computed<FeedingAlert | null>(() => {
    const state = this.latest.state();
    if (state.status !== 'loaded') {
      return null;
    }

    const { settings, feed } = state.data;
    const now = this.clock.now();
    const feedTime = parseTimestamp(feed.endedAt);
    if (!settings.enabled || feedTime === null) {
      return null;
    }

    const elapsed = now - feedTime;
    if (
      elapsed < settings.thresholdHours * HOUR_MS ||
      this.dismissal.isDismissed(feed.fingerprint, localDateKey(now))
    ) {
      return null;
    }

    return {
      message: `Han pasado ${formatDurationText(elapsed)} desde la última toma.`,
      fingerprint: feed.fingerprint,
    };
  });

  constructor() {
    inject(DialogRouteEvents)
      .closed$.pipe(
        filter((path) => REFRESH_ROUTES.includes(path)),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.latest.reload());
  }

  protected dismiss({ fingerprint }: FeedingAlert): void {
    this.dismissal.dismiss(fingerprint, localDateKey(this.clock.refresh()));
  }
}
