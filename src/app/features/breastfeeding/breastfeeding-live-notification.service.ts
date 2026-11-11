import { Service, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import {
  PushNotification,
  PushNotificationAction,
  PushNotificationClick,
  PushNotificationService,
} from '@app/core/push-notifications/push-notification.service';
import {
  TimedSegment,
  activeBreastOf,
  durationsByBreast,
  toSegmentDtos,
  toTimedSegments,
  toggleSegment,
} from '@app/features/breastfeeding/breastfeeding-timer';
import {
  BREAST_SIDE,
  Breast,
  BreastfeedingSession,
  UpdateBreastfeedingSessionDto,
} from '@app/features/breastfeeding/breastfeeding.models';
import { BreastfeedingService } from '@app/features/breastfeeding/breastfeeding.service';
import {
  createClock,
  formatClockTime,
  formatDurationText,
  parseTimestamp,
  toIsoString,
} from '@shared';
import { EMPTY, Observable, Subject, catchError, concatMap, of, switchMap } from 'rxjs';

const TYPE = 'breastfeeding-live';
/** Creation modal route, which resumes the running feed. */
const OPEN_PATH = 'lactancia';

const FINISH_ACTION = 'finish';
const TOGGLE_ACTIONS: Record<Breast, string> = {
  left: 'toggle-left',
  right: 'toggle-right',
};
const BREAST_LABELS: Record<Breast, string> = {
  left: 'Izquierdo',
  right: 'Derecho',
};

function otherBreast(breast: Breast): Breast {
  return breast === BREAST_SIDE.LEFT ? BREAST_SIDE.RIGHT : BREAST_SIDE.LEFT;
}

/**
 * Buttons of the notification. Android shows two at most: switch/stop while a breast runs; while
 * paused, start the breast opposite to the last one or finish the feed.
 */
function liveActions(segments: readonly TimedSegment[]): PushNotificationAction[] {
  const active = activeBreastOf(segments);
  if (active !== null) {
    return [BREAST_SIDE.LEFT, BREAST_SIDE.RIGHT].map((breast) => ({
      action: TOGGLE_ACTIONS[breast],
      title:
        breast === active
          ? `⏸ Parar ${BREAST_LABELS[breast].toLowerCase()}`
          : `▶ Cambiar a ${BREAST_LABELS[breast].toLowerCase()}`,
    }));
  }

  const last = segments.at(-1)?.breast;
  const next = last === undefined ? BREAST_SIDE.LEFT : otherBreast(last);
  return [
    { action: TOGGLE_ACTIONS[next], title: `▶ ${BREAST_LABELS[next]}` },
    { action: FINISH_ACTION, title: '✓ Finalizar' },
  ];
}

function liveNotification(
  session: BreastfeedingSession,
  now: number,
  silent: boolean,
): PushNotification {
  const segments = toTimedSegments(session.segments);
  const active = activeBreastOf(segments);
  const { left, right } = durationsByBreast(segments, now);
  const start = segments[0]?.start ?? parseTimestamp(session.startTime) ?? now;

  return {
    type: TYPE,
    title: active === null ? 'Toma en pausa' : `Toma en curso · ${BREAST_LABELS[active]}`,
    body: `Izq. ${formatDurationText(left)} · Der. ${formatDurationText(right)} · Empezó a las ${formatClockTime(start)}`,
    actions: liveActions(segments),
    openPath: OPEN_PATH,
    silent,
  };
}

/** Changes that a button of the notification makes to the running feed; `null` for unknown actions. */
function actionUpdate(
  session: BreastfeedingSession,
  action: string,
  now: number,
): UpdateBreastfeedingSessionDto | null {
  const segments = toTimedSegments(session.segments);

  if (action === FINISH_ACTION) {
    const active = activeBreastOf(segments);
    const closed = active === null ? segments : toggleSegment(segments, active, now);
    return { segments: toSegmentDtos(closed), endTime: toIsoString(now) };
  }

  const breast = (Object.keys(TOGGLE_ACTIONS) as Breast[]).find(
    (side) => TOGGLE_ACTIONS[side] === action,
  );
  return breast === undefined
    ? null
    : { segments: toSegmentDtos(toggleSegment(segments, breast, now)), endTime: null };
}

/**
 * Push notification shown while a feed is open (running or paused), with play/stop/finish buttons
 * that change the feed without opening the app. It stays in sync with every change of the feed and
 * follows the push settings of the side menu (type `breastfeeding-live`).
 */
@Service()
export class BreastfeedingLiveNotificationService {
  private readonly breastfeedingService = inject(BreastfeedingService);
  private readonly push = inject(PushNotificationService);
  private readonly router = inject(Router);
  private readonly clock = createClock(60_000);
  private readonly syncRequests = new Subject<void>();
  /** Feed whose notification is visible; updates of the same feed are silent. */
  private shownSessionId: string | null = null;

  private readonly enabled = computed(() => this.push.isTypeEnabled(TYPE));

  constructor() {
    this.syncRequests
      .pipe(
        switchMap(() => (this.enabled() ? this.latestSession() : of(null))),
        takeUntilDestroyed(),
      )
      .subscribe((session) => void this.render(session));

    this.breastfeedingService.changes
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.syncRequests.next());

    this.push
      .clicks(TYPE)
      .pipe(
        concatMap((click) => this.handleClick(click)),
        takeUntilDestroyed(),
      )
      .subscribe();

    effect(() => {
      this.enabled();
      this.syncRequests.next();
    });
  }

  private latestSession(): Observable<BreastfeedingSession | null> {
    // The HTTP error interceptor reports failures; the notification stays as it was.
    return this.breastfeedingService.getLatest(CURRENT_BABY_ID).pipe(catchError(() => EMPTY));
  }

  private async render(session: BreastfeedingSession | null): Promise<void> {
    if (!this.enabled() || session === null || session.status === 'finished') {
      this.shownSessionId = null;
      await this.push.close(TYPE);
      return;
    }

    const silent = this.shownSessionId === session.id;
    this.shownSessionId = session.id;
    await this.push.show(liveNotification(session, this.clock.refresh(), silent));
  }

  /** The tapped notification is closed by the system; it is shown again once the feed is re-read. */
  private handleClick({ action }: PushNotificationClick): Observable<unknown> {
    if (action === '') {
      void this.router.navigateByUrl(`/${OPEN_PATH}`);
      this.syncRequests.next();
      return EMPTY;
    }

    return this.latestSession().pipe(
      switchMap((session) => {
        const update =
          session === null || session.status === 'finished'
            ? null
            : actionUpdate(session, action, this.clock.refresh());
        if (session === null || update === null) {
          this.syncRequests.next();
          return EMPTY;
        }
        // The change event of the update re-renders the notification.
        return this.breastfeedingService
          .update(CURRENT_BABY_ID, session.id, update, 'notification')
          .pipe(
            catchError(() => {
              this.syncRequests.next();
              return EMPTY;
            }),
          );
      }),
    );
  }
}
