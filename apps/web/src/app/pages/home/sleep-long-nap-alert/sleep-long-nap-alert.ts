import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, forkJoin, map } from 'rxjs';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { SleepLongNapAlertSettings, SleepSession } from '@app/features/sleep/sleep.models';
import { SleepService } from '@app/features/sleep/sleep.service';
import { isNightSleepStart, sleepSpan } from '@app/features/sleep/sleep.span';
import {
  AlertBanner,
  createAlertDismissal,
  createClock,
  createLatestRecord,
  DialogRouteEvents,
  formatElapsedHoursOrDays,
  localDateKey,
  spanDuration,
} from '@shared';

interface SleepLongNapAlertData {
  readonly settings: SleepLongNapAlertSettings;
  readonly session: SleepSession;
}

interface SleepLongNapAlertMessage {
  readonly message: string;
  /** Identifies the ongoing nap, so another long nap shows the alert again even on the same day. */
  readonly fingerprint: string;
}

const CLOCK_TICK_MS = 60_000;
const HOUR_MS = 3_600_000;
/** Home child routes whose modals can change the alert: a sleep or the alert settings. */
const REFRESH_ROUTES: readonly string[] = ['sueno', 'notificaciones'];

/**
 * Notice shown on Home when an ongoing nap (a sleep that started by day) lasts too long.
 * It reloads by itself when the sleep or notifications modal closes, so it needs no inputs.
 */
@Component({
  selector: 'app-sleep-long-nap-alert',
  imports: [AlertBanner],
  template: `
    @if (alert(); as current) {
      <app-alert-banner
        [message]="current.message"
        dismissLabel="Cerrar aviso de siesta larga"
        (dismissed)="dismiss(current)"
      />
    }
  `,
})
export class SleepLongNapAlert {
  private readonly sleepService = inject(SleepService);
  private readonly clock = createClock(CLOCK_TICK_MS);
  private readonly dismissal = createAlertDismissal('sleep-long-nap', CURRENT_BABY_ID);
  private readonly latest = createLatestRecord<SleepLongNapAlertData>(() =>
    forkJoin({
      settings: this.sleepService.getLongNapAlertSettings(CURRENT_BABY_ID),
      session: this.sleepService.getLatest(CURRENT_BABY_ID),
    }).pipe(map(({ settings, session }) => (session === null ? null : { settings, session }))),
  );

  /** The alert to show, or `null` while it must stay hidden. */
  protected readonly alert = computed<SleepLongNapAlertMessage | null>(() => {
    const state = this.latest.state();
    if (state.status !== 'loaded') {
      return null;
    }

    const { settings, session } = state.data;
    const span = sleepSpan(session);
    if (!settings.enabled || span === null || span.end !== null || isNightSleepStart(span.start)) {
      return null;
    }

    const now = this.clock.now();
    const elapsed = spanDuration(span, now);
    const fingerprint = `${session.id}:${session.startTime}`;
    if (elapsed < settings.thresholdHours * HOUR_MS || this.dismissal.isDismissed(fingerprint, localDateKey(now))) {
      return null;
    }

    return { message: `Lleva ${formatElapsedHoursOrDays(elapsed)} durmiendo la siesta.`, fingerprint };
  });

  constructor() {
    inject(DialogRouteEvents)
      .closed$.pipe(
        filter((path) => REFRESH_ROUTES.includes(path)),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.latest.reload());
  }

  protected dismiss({ fingerprint }: SleepLongNapAlertMessage): void {
    this.dismissal.dismiss(fingerprint, localDateKey(this.clock.refresh()));
  }
}
