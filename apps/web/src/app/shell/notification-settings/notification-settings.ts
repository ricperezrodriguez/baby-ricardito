import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PushNotificationService } from '@app/core/push-notifications/push-notification.service';
import { PushNotificationTypeId } from '@app/core/push-notifications/push-notification-types';

/**
 * "Notificaciones" block of the side menu: the general push switch of this device and, under it,
 * one switch per notification type (`PUSH_NOTIFICATION_TYPES`), disabled while the general one is off.
 */
@Component({
  selector: 'app-notification-settings',
  imports: [MatIconModule, MatSlideToggleModule],
  styles: `
    :host {
      display: block;
      padding: 0.5rem 0;
    }

    .heading {
      color: var(--app-muted);
      font-size: 0.85rem;
      font-weight: 600;
      margin: 0;
      padding: 0.5rem 1rem 0.25rem;
    }

    .setting {
      align-items: center;
      display: flex;
      gap: 1rem;
      padding: 0.5rem 1rem;
    }

    .setting-icon {
      color: var(--app-muted);
      flex: none;
    }

    .setting-text {
      flex: 1;
      min-width: 0;
    }

    .setting-title {
      color: var(--app-ink);
      cursor: pointer;
      display: block;
      font-size: 1rem;
    }

    .setting-description {
      color: var(--app-muted);
      font-size: 0.875rem;
      margin: 0.125rem 0 0;
    }

    .disabled .setting-title {
      cursor: default;
    }

    .types {
      list-style: none;
      margin: 0;
      padding: 0 0 0 1.5rem;
    }
  `,
  template: `
    <h2 class="heading" id="push-settings-heading">Notificaciones</h2>
    <div role="group" aria-labelledby="push-settings-heading">
      <div class="setting" [class.disabled]="generalHint() !== null">
        <mat-icon class="setting-icon" fontSet="material-symbols-outlined" aria-hidden="true">
          notifications_active
        </mat-icon>
        <div class="setting-text">
          <!-- Tapping the text also toggles the switch. -->
          <label class="setting-title" id="push-general-title" for="push-general-button">
            Notificaciones push
          </label>
          <p class="setting-description" id="push-general-description">
            {{ generalHint() ?? 'Avisos en la parte superior del móvil' }}
          </p>
        </div>
        <mat-slide-toggle
          id="push-general"
          hideIcon
          aria-labelledby="push-general-title"
          aria-describedby="push-general-description"
          [checked]="push.enabled()"
          [disabled]="generalHint() !== null"
          (change)="changeGeneral($event)"
        />
      </div>

      <ul class="types">
        @for (type of push.types; track type.id) {
          <li class="setting" [class.disabled]="!push.enabled()">
            <mat-icon class="setting-icon" fontSet="material-symbols-outlined" aria-hidden="true">
              {{ type.icon }}
            </mat-icon>
            <div class="setting-text">
              <label
                class="setting-title"
                [id]="'push-' + type.id + '-title'"
                [for]="'push-' + type.id + '-button'"
              >
                {{ type.label }}
              </label>
              <p class="setting-description" [id]="'push-' + type.id + '-description'">
                {{ type.description }}
              </p>
            </div>
            <mat-slide-toggle
              [id]="'push-' + type.id"
              hideIcon
              [aria-labelledby]="'push-' + type.id + '-title'"
              [aria-describedby]="'push-' + type.id + '-description'"
              [checked]="push.isTypeSelected(type.id)"
              [disabled]="!push.enabled()"
              (change)="changeType(type.id, $event)"
            />
          </li>
        }
      </ul>
    </div>
  `,
})
export class NotificationSettings {
  protected readonly push = inject(PushNotificationService);

  /** Why the general switch cannot be used, or `null` when it can. */
  protected readonly generalHint = computed(() => {
    if (!this.push.supported) {
      return 'Instala la app en la pantalla de inicio para activarlas';
    }
    return this.push.permission() === 'denied'
      ? 'Bloqueadas. Permítelas en los ajustes del navegador'
      : null;
  });

  protected async changeGeneral(event: MatSlideToggleChange): Promise<void> {
    const enabled = await this.push.setEnabled(event.checked);
    // A refused permission leaves the switch off even if the bound value did not change.
    event.source.checked = enabled;
  }

  protected changeType(type: PushNotificationTypeId, event: MatSlideToggleChange): void {
    this.push.setTypeEnabled(type, event.checked);
  }
}
