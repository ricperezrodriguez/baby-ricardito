import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, forkJoin, map } from 'rxjs';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { DiaperChange, DiaperPoopAlertSettings } from '@app/features/diaper/diaper.models';
import { DiaperService } from '@app/features/diaper/diaper.service';
import { createLatestRecord } from '@app/shared/latest-record/latest-record';
import { formatElapsedHoursOrDays } from '@app/shared/utils/time.utils';
import {
  AlertBanner,
  createAlertDismissal,
  createClock,
  DialogRouteEvents,
  localDateKey,
  parseTimestamp,
} from '@shared';

interface PoopAlertData {
  readonly settings: DiaperPoopAlertSettings;
  readonly stool: DiaperChange;
}

interface PoopAlert {
  readonly message: string;
  /** Identifies the last poop, so a new one shows the alert again even on the same day. */
  readonly fingerprint: string;
}

const CLOCK_TICK_MS = 60_000;
const HOUR_MS = 3_600_000;
/** Home child routes whose modals can change the alert: a diaper change or the alert settings. */
const REFRESH_ROUTES: readonly string[] = ['panal', 'notificaciones'];

/**
 * Warning shown on Home when too much time has passed since the last poop. It reloads by itself
 * when the diaper or notifications modal closes, so it needs no inputs.
 */
@Component({
  selector: 'app-diaper-poop-alert',
  imports: [AlertBanner],
  template: `
    @if (alert(); as current) {
      <app-alert-banner
        [message]="current.message"
        dismissLabel="Cerrar aviso de caca"
        (dismissed)="dismiss(current)"
      />
    }
  `,
})
export class DiaperPoopAlert {
  private readonly diaperService = inject(DiaperService);
  private readonly clock = createClock(CLOCK_TICK_MS);
  private readonly dismissal = createAlertDismissal('diaper-poop', CURRENT_BABY_ID);
  private readonly latest = createLatestRecord<PoopAlertData>(() =>
    forkJoin({
      settings: this.diaperService.getPoopAlertSettings(CURRENT_BABY_ID),
      stool: this.diaperService.getLatestStool(CURRENT_BABY_ID),
    }).pipe(map(({ settings, stool }) => (stool === null ? null : { settings, stool }))),
  );

  /** The alert to show, or `null` while it must stay hidden. */
  protected readonly alert = computed<PoopAlert | null>(() => {
    const state = this.latest.state();
    if (state.status !== 'loaded') {
      return null;
    }

    const { settings, stool } = state.data;
    const now = this.clock.now();
    const stoolTime = parseTimestamp(stool.changedAt);
    if (!settings.enabled || stoolTime === null) {
      return null;
    }

    const elapsed = now - stoolTime;
    const fingerprint = `${stool.id}:${stool.changedAt}`;
    if (elapsed < settings.thresholdHours * HOUR_MS || this.dismissal.isDismissed(fingerprint, localDateKey(now))) {
      return null;
    }

    return { message: `Han pasado ${formatElapsedHoursOrDays(elapsed)} sin hacer caca.`, fingerprint };
  });

  constructor() {
    inject(DialogRouteEvents)
      .closed$.pipe(
        filter((path) => REFRESH_ROUTES.includes(path)),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.latest.reload());
  }

  protected dismiss({ fingerprint }: PoopAlert): void {
    this.dismissal.dismiss(fingerprint, localDateKey(this.clock.refresh()));
  }
}
