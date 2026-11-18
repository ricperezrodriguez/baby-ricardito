import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, forkJoin, map } from 'rxjs';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { SleepAwakeAlertSettings, SleepSession } from '@app/features/sleep/sleep.models';
import { SleepService } from '@app/features/sleep/sleep.service';
import {
  AlertBanner,
  createAlertDismissal,
  createClock,
  createLatestRecord,
  DialogRouteEvents,
  formatElapsedHoursOrDays,
  localDateKey,
  parseTimestamp,
} from '@shared';

interface SleepAwakeAlertData {
  readonly settings: SleepAwakeAlertSettings;
  readonly session: SleepSession;
}

interface SleepAwakeAlertMessage {
  readonly message: string;
  /** Identifies the last sleep, so waking up after another one shows the alert again even on the same day. */
  readonly fingerprint: string;
}

const CLOCK_TICK_MS = 60_000;
const HOUR_MS = 3_600_000;
/** Home child routes whose modals can change the alert: a sleep or the alert settings. */
const REFRESH_ROUTES: readonly string[] = ['sueno', 'notificaciones'];

/**
 * Notice shown on Home when the baby has been awake for a long time since the last sleep ended.
 * It reloads by itself when the sleep or notifications modal closes, so it needs no inputs.
 */
@Component({
  selector: 'app-sleep-awake-alert',
  imports: [AlertBanner],
  template: `
    @if (alert(); as current) {
      <app-alert-banner
        [message]="current.message"
        dismissLabel="Cerrar aviso de despierto"
        (dismissed)="dismiss(current)"
      />
    }
  `,
})
export class SleepAwakeAlert {
  private readonly sleepService = inject(SleepService);
  private readonly clock = createClock(CLOCK_TICK_MS);
  private readonly dismissal = createAlertDismissal('sleep-awake', CURRENT_BABY_ID);
  private readonly latest = createLatestRecord<SleepAwakeAlertData>(() =>
    forkJoin({
      settings: this.sleepService.getAwakeAlertSettings(CURRENT_BABY_ID),
      session: this.sleepService.getLatest(CURRENT_BABY_ID),
    }).pipe(map(({ settings, session }) => (session === null ? null : { settings, session }))),
  );

  /** The alert to show, or `null` while it must stay hidden. */
  protected readonly alert = computed<SleepAwakeAlertMessage | null>(() => {
    const state = this.latest.state();
    if (state.status !== 'loaded') {
      return null;
    }

    const { settings, session } = state.data;
    const wokeUpAt = session.endTime === null ? null : parseTimestamp(session.endTime);
    if (!settings.enabled || wokeUpAt === null) {
      return null;
    }

    const now = this.clock.now();
    const elapsed = now - wokeUpAt;
    const fingerprint = `${session.id}:${session.endTime}`;
    if (elapsed < settings.thresholdHours * HOUR_MS || this.dismissal.isDismissed(fingerprint, localDateKey(now))) {
      return null;
    }

    return { message: `Lleva ${formatElapsedHoursOrDays(elapsed)} despierto.`, fingerprint };
  });

  constructor() {
    inject(DialogRouteEvents)
      .closed$.pipe(
        filter((path) => REFRESH_ROUTES.includes(path)),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.latest.reload());
  }

  protected dismiss({ fingerprint }: SleepAwakeAlertMessage): void {
    this.dismissal.dismiss(fingerprint, localDateKey(this.clock.refresh()));
  }
}
