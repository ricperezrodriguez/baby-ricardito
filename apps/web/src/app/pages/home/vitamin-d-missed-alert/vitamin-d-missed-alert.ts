import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, forkJoin } from 'rxjs';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { VitaminDDose, VitaminDMissedAlertSettings } from '@app/features/vitamin-d/vitamin-d.models';
import { VitaminDService } from '@app/features/vitamin-d/vitamin-d.service';
import { createLatestRecord } from '@app/shared/latest-record/latest-record';
import {
  AlertBanner,
  createAlertDismissal,
  createClock,
  DialogRouteEvents,
  localDateKey,
  localHour,
  parseTimestamp,
} from '@shared';

interface MissedAlertData {
  readonly settings: VitaminDMissedAlertSettings;
  /** Latest dose ever recorded; `null` when there is none yet. */
  readonly latest: VitaminDDose | null;
}

interface MissedAlert {
  readonly message: string;
  /** One per local day: dismissing hides the alert until tomorrow. */
  readonly fingerprint: string;
}

const CLOCK_TICK_MS = 60_000;
/** Home child routes whose modals can change the alert: a vitamin D dose or the alert settings. */
const REFRESH_ROUTES: readonly string[] = ['vitamina-d', 'notificaciones'];

/**
 * Warning shown on Home from a clock hour (e.g. 18:00) when no vitamin D dose has been recorded
 * today. It appears by itself when the hour is reached and reloads when its modals close, so it
 * needs no inputs.
 */
@Component({
  selector: 'app-vitamin-d-missed-alert',
  imports: [AlertBanner],
  template: `
    @if (alert(); as current) {
      <app-alert-banner
        [message]="current.message"
        dismissLabel="Cerrar aviso de vitamina D"
        (dismissed)="dismiss(current)"
      />
    }
  `,
})
export class VitaminDMissedAlert {
  private readonly vitaminDService = inject(VitaminDService);
  private readonly clock = createClock(CLOCK_TICK_MS);
  private readonly dismissal = createAlertDismissal('vitamin-d-missed', CURRENT_BABY_ID);
  private readonly data = createLatestRecord<MissedAlertData>(() =>
    forkJoin({
      settings: this.vitaminDService.getMissedAlertSettings(CURRENT_BABY_ID),
      latest: this.vitaminDService.getLatest(CURRENT_BABY_ID),
    }),
  );

  /** The alert to show, or `null` while it must stay hidden. */
  protected readonly alert = computed<MissedAlert | null>(() => {
    const state = this.data.state();
    if (state.status !== 'loaded') {
      return null;
    }

    const { settings, latest } = state.data;
    const now = this.clock.now();
    if (!settings.enabled || localHour(now) < settings.thresholdHours) {
      return null;
    }

    const today = localDateKey(now);
    const givenAt = latest === null ? null : parseTimestamp(latest.givenAt);
    if (givenAt !== null && localDateKey(givenAt) === today) {
      return null;
    }

    const fingerprint = `vitamin-d:${today}`;
    return this.dismissal.isDismissed(fingerprint, today)
      ? null
      : { message: 'Todavía no has registrado la vitamina D de hoy.', fingerprint };
  });

  constructor() {
    inject(DialogRouteEvents)
      .closed$.pipe(
        filter((path) => REFRESH_ROUTES.includes(path)),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.data.reload());
  }

  protected dismiss({ fingerprint }: MissedAlert): void {
    this.dismissal.dismiss(fingerprint, localDateKey(this.clock.refresh()));
  }
}
