import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { Bath, BathOverdueAlertSettings } from '@app/features/bath/bath.models';
import { BathService } from '@app/features/bath/bath.service';
import { createLatestRecord } from '@app/shared/latest-record/latest-record';
import {
  AlertBanner,
  createAlertDismissal,
  createClock,
  DialogRouteEvents,
  localDateKey,
  localDaysBetween,
  parseTimestamp,
} from '@shared';
import { filter, forkJoin } from 'rxjs';

interface OverdueAlertData {
  readonly settings: BathOverdueAlertSettings;
  /** Latest bath; `null` when there is none yet. */
  readonly latest: Bath | null;
}

interface OverdueAlert {
  readonly message: string;
  /** One per local day: dismissing hides the alert until tomorrow. */
  readonly fingerprint: string;
}

const CLOCK_TICK_MS = 60_000;
/** Home child routes whose modals can change the alert: a bath or the alert settings. */
const REFRESH_ROUTES: readonly string[] = ['bano', 'notificaciones'];

/**
 * Notice shown on Home when the days since the latest bath reach the configured threshold.
 * It appears by itself when the threshold is crossed and reloads when its modals close, so it
 * needs no inputs.
 */
@Component({
  selector: 'app-bath-overdue-alert',
  imports: [AlertBanner],
  template: `
    @if (alert(); as current) {
      <app-alert-banner
        [message]="current.message"
        dismissLabel="Cerrar aviso de baño"
        (dismissed)="dismiss(current)"
      />
    }
  `,
})
export class BathOverdueAlert {
  private readonly bathService = inject(BathService);
  private readonly clock = createClock(CLOCK_TICK_MS);
  private readonly dismissal = createAlertDismissal('bath-overdue', CURRENT_BABY_ID);
  private readonly data = createLatestRecord<OverdueAlertData>(() =>
    forkJoin({
      settings: this.bathService.getOverdueAlertSettings(CURRENT_BABY_ID),
      latest: this.bathService.getLatest(CURRENT_BABY_ID),
    }),
  );

  /** The alert to show, or `null` while it must stay hidden. */
  protected readonly alert = computed<OverdueAlert | null>(() => {
    const state = this.data.state();
    if (state.status !== 'loaded') {
      return null;
    }

    const { settings, latest } = state.data;
    const bathedAt = latest === null ? null : parseTimestamp(latest.bathedAt);
    if (!settings.enabled || bathedAt === null) {
      return null;
    }

    const now = this.clock.now();
    const days = localDaysBetween(bathedAt, now);
    if (days < settings.thresholdDays) {
      return null;
    }

    const today = localDateKey(now);
    const fingerprint = `bath:${today}`;
    return this.dismissal.isDismissed(fingerprint, today)
      ? null
      : {
          message: `${days === 1 ? 'Ha pasado 1 día' : `Han pasado ${days} días`} desde el último baño.`,
          fingerprint,
        };
  });

  constructor() {
    inject(DialogRouteEvents)
      .closed$.pipe(
        filter((path) => REFRESH_ROUTES.includes(path)),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.data.reload());
  }

  protected dismiss({ fingerprint }: OverdueAlert): void {
    this.dismissal.dismiss(fingerprint, localDateKey(this.clock.refresh()));
  }
}
