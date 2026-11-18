import { DOCUMENT } from '@angular/common';
import { Service, computed, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { readLocalStorageJson, writeLocalStorageJson } from '@app/shared/utils/local-storage';
import { Observable, filter, map } from 'rxjs';
import { PUSH_NOTIFICATION_TYPES, PushNotificationTypeId } from './push-notification-types';

/** `unsupported`: no service worker (dev server) or no Notification API (e.g. iOS outside the installed app). */
export type PushPermission = NotificationPermission | 'unsupported';

export interface PushNotificationAction {
  /** Identifier received back in `clicks()`. */
  readonly action: string;
  /** Spanish text of the button. Only some platforms show buttons (Android yes, iOS no). */
  readonly title: string;
}

export interface PushNotification {
  /** Kind of notification; only one of each kind is visible: showing it again replaces it. */
  readonly type: PushNotificationTypeId;
  readonly title: string;
  readonly body: string;
  readonly actions: readonly PushNotificationAction[];
  /** In-app path (relative, e.g. `lactancia`) opened when the app is not running and the body is tapped. */
  readonly openPath: string;
  /** Replaces the visible notification without sound or vibration. */
  readonly silent: boolean;
}

export interface PushNotificationClick {
  /** Button identifier, or `''` when the body of the notification was tapped. */
  readonly action: string;
}

/** `actions` and `renotify` are supported by the browsers but missing from the TS DOM lib. */
interface ExtendedNotificationOptions extends NotificationOptions {
  actions?: PushNotificationAction[];
  renotify?: boolean;
}

const ICON_PATH = 'icons/icon-192x192.png';
/** Device switch: `null` until the user accepts or rejects push notifications for the first time. */
const ENABLED_KEY = 'push-notifications-enabled';
/** Types the user turned off; new types start on. */
const DISABLED_TYPES_KEY = 'push-notifications-disabled-types';

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Push notifications of this device (shown by the system at the top of the phone): permission, the
 * general switch, one switch per type (`PUSH_NOTIFICATION_TYPES`) and showing/closing them through
 * the Angular service worker. Today the app creates them itself; a push server can be added later.
 * They only work in the production build (the service worker is disabled on the dev server).
 */
@Service()
export class PushNotificationService {
  private readonly window = inject(DOCUMENT).defaultView as Window;
  private readonly swPush = inject(SwPush);

  readonly supported = this.swPush.isEnabled && 'Notification' in this.window;
  /** Types in menu order, for the settings. */
  readonly types = PUSH_NOTIFICATION_TYPES;

  private readonly permissionState = signal<PushPermission>(
    this.supported ? Notification.permission : 'unsupported',
  );
  private readonly preference = signal(readLocalStorageJson(ENABLED_KEY, isBoolean));
  private readonly disabledTypes = signal<readonly string[]>(
    readLocalStorageJson(DISABLED_TYPES_KEY, isStringArray) ?? [],
  );

  readonly permission = this.permissionState.asReadonly();
  /** General switch: on when the user enabled it and the browser grants the permission. */
  readonly enabled = computed(() => this.preference() === true && this.permission() === 'granted');

  constructor() {
    this.watchPermission();
  }

  /** Whether notifications of `type` may be shown (general switch and its own switch on). */
  isTypeEnabled(type: PushNotificationTypeId): boolean {
    return this.enabled() && !this.disabledTypes().includes(type);
  }

  /** Own switch of `type`, regardless of the general one. */
  isTypeSelected(type: PushNotificationTypeId): boolean {
    return !this.disabledTypes().includes(type);
  }

  /**
   * General switch. Turning it on asks for the permission; returns whether it ended up on. Call it
   * directly from a tap handler: browsers, and iOS in particular, reject requests outside a user gesture.
   */
  async setEnabled(enabled: boolean): Promise<boolean> {
    if (!enabled) {
      this.setPreference(false);
      return false;
    }
    this.setPreference((await this.requestPermission()) === 'granted');
    return this.enabled();
  }

  setTypeEnabled(type: PushNotificationTypeId, enabled: boolean): void {
    const others = this.disabledTypes().filter((id) => id !== type);
    const disabled = enabled ? others : [...others, type];
    writeLocalStorageJson(DISABLED_TYPES_KEY, disabled);
    this.disabledTypes.set(disabled);
  }

  /**
   * Asks for push notifications the first time a feature that uses them is started (e.g. the first ▶
   * of a feed), unless the user already chose. Call it directly from the tap handler.
   */
  async offerOnFirstUse(): Promise<void> {
    if (this.supported && this.preference() === null) {
      await this.setEnabled(true);
    }
  }

  /** Shows (or replaces) the notification of its type; ignored when that type is off. */
  async show(notification: PushNotification): Promise<void> {
    const registration = await this.registration();
    if (registration === null || !this.isTypeEnabled(notification.type)) {
      return;
    }

    const options: ExtendedNotificationOptions = {
      body: notification.body,
      tag: notification.type,
      icon: ICON_PATH,
      silent: notification.silent,
      renotify: false,
      requireInteraction: true,
      actions: [...notification.actions],
      // Read by the Angular service worker: tapping the body focuses the app, or opens it if it is closed.
      // It must not navigate the running app: a full reload would lose its in-memory state.
      data: {
        onActionClick: {
          default: { operation: 'focusLastFocusedOrOpen', url: notification.openPath },
        },
      },
    };
    await registration.showNotification(notification.title, options);
  }

  async close(type: PushNotificationTypeId): Promise<void> {
    const registration = await this.registration();
    if (registration === null) {
      return;
    }

    const notifications = await registration.getNotifications({ tag: type });
    notifications.forEach((notification) => notification.close());
  }

  /** Taps on the notifications of `type` while the app is running. The system closes the tapped notification. */
  clicks(type: PushNotificationTypeId): Observable<PushNotificationClick> {
    return this.swPush.notificationClicks.pipe(
      filter(({ notification }) => notification.tag === type),
      map(({ action }) => ({ action })),
    );
  }

  private setPreference(enabled: boolean): void {
    writeLocalStorageJson(ENABLED_KEY, enabled);
    this.preference.set(enabled);
  }

  private async requestPermission(): Promise<PushPermission> {
    if (!this.supported) {
      return 'unsupported';
    }
    if (Notification.permission === 'default') {
      this.permissionState.set(await Notification.requestPermission());
    }
    return this.permissionState();
  }

  private async registration(): Promise<ServiceWorkerRegistration | null> {
    if (!this.supported || this.permissionState() !== 'granted') {
      return null;
    }
    return this.window.navigator.serviceWorker.ready;
  }

  /** Keeps `permission` in sync when the user changes it from the browser settings. */
  private watchPermission(): void {
    if (!this.supported || !('permissions' in this.window.navigator)) {
      return;
    }

    this.window.navigator.permissions
      .query({ name: 'notifications' })
      .then((status) => {
        status.addEventListener('change', () => this.permissionState.set(Notification.permission));
      })
      .catch(() => undefined);
  }
}
