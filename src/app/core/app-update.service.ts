import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter, fromEvent } from 'rxjs';
import { NotificationService } from '@app/core/notification.service';

/** Detects new deployed versions of the PWA and lets the user reload into them. */
@Service()
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly notifications = inject(NotificationService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates
      .pipe(filter((event) => event.type === 'VERSION_READY'))
      .subscribe(() => this.offerUpdate());

    this.swUpdate.unrecoverable.subscribe(() => this.offerUpdate());

    // An installed app stays open in the background for days: look for updates when it comes back.
    fromEvent(this.document, 'visibilitychange')
      .pipe(filter(() => this.document.visibilityState === 'visible'))
      .subscribe(() => void this.swUpdate.checkForUpdate().catch(() => false));
  }

  private offerUpdate(): void {
    this.notifications
      .withAction('Hay una nueva versión disponible', 'Actualizar')
      .subscribe(() => void this.reload());
  }

  private async reload(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
    } finally {
      this.document.location.reload();
    }
  }
}
