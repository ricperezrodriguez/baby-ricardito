import { DOCUMENT } from '@angular/common';
import { Service, computed, inject, signal } from '@angular/core';
import { readLocalStorageJson, writeLocalStorageJson } from '@app/shared/utils/local-storage';

/** Chrome/Edge/Samsung event that lets the app trigger the native install dialog (not in the TS DOM lib). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** `native`: the browser can show its own install dialog; `ios`: only manual steps are possible. */
export type InstallMode = 'native' | 'ios';

const DISMISSED_KEY = 'pwa-install-dismissed';

function isTrue(value: unknown): value is true {
  return value === true;
}

/** Install-to-home-screen state of the app; the prompt only applies to mobile browsers (not installed yet). */
@Service()
export class PwaService {
  private readonly window = inject(DOCUMENT).defaultView as Window;
  private readonly installEvent = signal<BeforeInstallPromptEvent | null>(null);
  private readonly dismissed = signal(readLocalStorageJson(DISMISSED_KEY, isTrue) === true);
  private readonly installed = signal(this.isStandalone());

  private readonly isMobile = this.window.matchMedia('(pointer: coarse)').matches;
  private readonly isIos = this.detectIos();

  /** What to offer to the user, or `null` when nothing should be shown. */
  readonly installMode = computed<InstallMode | null>(() => {
    if (this.installed() || this.dismissed() || !this.isMobile) {
      return null;
    }

    if (this.installEvent()) {
      return 'native';
    }

    return this.isIos ? 'ios' : null;
  });

  constructor() {
    this.window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installEvent.set(event as BeforeInstallPromptEvent);
    });
    this.window.addEventListener('appinstalled', () => {
      this.installEvent.set(null);
      this.installed.set(true);
    });
  }

  /** Opens the browser's install dialog. A captured event can be used only once. */
  async install(): Promise<void> {
    const event = this.installEvent();
    if (!event) {
      return;
    }

    this.installEvent.set(null);
    await event.prompt();
    await event.userChoice;
  }

  /** Hides the install prompt on this device for good. */
  dismiss(): void {
    writeLocalStorageJson(DISMISSED_KEY, true);
    this.dismissed.set(true);
  }

  private isStandalone(): boolean {
    const iosStandalone = 'standalone' in navigator && navigator.standalone === true;
    return iosStandalone || this.window.matchMedia('(display-mode: standalone)').matches;
  }

  private detectIos(): boolean {
    const { userAgent, platform, maxTouchPoints } = navigator;
    // iPadOS reports itself as a Mac, but it is the only "Mac" with a touch screen.
    return /iphone|ipad|ipod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
  }
}
