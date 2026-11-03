import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { disabled, form, FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import {
  DEFAULT_DIAPER_POOP_ALERT_SETTINGS,
  DIAPER_POOP_ALERT_THRESHOLDS,
  DiaperPoopAlertSettings,
  DiaperPoopAlertThreshold,
} from '@app/features/diaper/diaper.models';
import { DiaperService } from '@app/features/diaper/diaper.service';
import { AsyncState, createClock, formatElapsedSince, LoadStatus, toIsoString } from '@shared';

interface NotificationExample {
  readonly icon: string;
  readonly title: string;
  readonly message: string;
  readonly minutesAgo: number;
  readonly unread: boolean;
}

const MINUTE_MS = 60_000;

const THRESHOLD_LABELS: Record<DiaperPoopAlertThreshold, string> = {
  12: '12 h',
  24: '24 h',
  36: '36 h',
  48: '2 días',
  72: '3 días',
};

const THRESHOLD_OPTIONS = DIAPER_POOP_ALERT_THRESHOLDS.map((hours) => ({
  hours,
  label: THRESHOLD_LABELS[hours],
}));

// Ejemplos de contenido; las notificaciones reales aún no existen.
const EXAMPLES: readonly NotificationExample[] = [
  {
    icon: 'schedule',
    title: 'Hora de la toma',
    message: 'Han pasado 3 h desde la última toma de pecho.',
    minutesAgo: 4,
    unread: true,
  },
  {
    icon: 'vaccines',
    title: 'Vitamina D',
    message: 'Todavía no has registrado la vitamina D de hoy.',
    minutesAgo: 45,
    unread: true,
  },
  {
    icon: 'stethoscope',
    title: 'Cita con el pediatra',
    message: 'Mañana a las 10:00 tienes la revisión de los 2 meses.',
    minutesAgo: 180,
    unread: false,
  },
  {
    icon: 'baby_changing_station',
    title: 'Cambio de pañal',
    message: 'Hace 4 h del último cambio de pañal.',
    minutesAgo: 240,
    unread: false,
  },
  {
    icon: 'group',
    title: 'Actividad de un cuidador',
    message: 'Ana ha registrado un baño.',
    minutesAgo: 24 * 60,
    unread: false,
  },
  {
    icon: 'content_cut',
    title: 'Corte de uñas',
    message: 'Hace una semana del último corte de uñas.',
    minutesAgo: 2 * 24 * 60,
    unread: false,
  },
];

@Component({
  imports: [
    AsyncState,
    FormField,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatListModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  styles: `
    .header {
      align-items: flex-start;
      display: flex;
      justify-content: space-between;
      padding-block-start: 0.5rem;
      padding-inline-end: 0.5rem;
    }

    .header h2 {
      flex: 1;
      min-width: 0;
    }

    .settings {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-block-end: 1rem;
    }

    .settings-title {
      color: var(--app-ink);
      font-size: 1.05rem;
      margin: 0;
    }

    .settings-fields {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .note {
      color: var(--app-muted);
      font-size: 0.9rem;
      margin: 1rem 0 0.5rem;
    }

    .unread {
      color: var(--app-coral);
      font-size: 0.8rem;
      font-weight: 600;
    }
  `,
  template: `
    <div class="header">
      <h2 mat-dialog-title>Notificaciones</h2>
      <button matIconButton type="button" aria-label="Cerrar" mat-dialog-close>
        <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">close</mat-icon>
      </button>
    </div>
    <mat-dialog-content>
      <section class="settings" aria-labelledby="diaper-settings-title">
        <h3 class="settings-title" id="diaper-settings-title">Pañal</h3>
        <app-async-state
          [status]="settingsStatus()"
          loadingLabel="Cargando los avisos de pañal"
          errorMessage="No se pudieron cargar los avisos de pañal."
          (retry)="loadSettings()"
        >
          <div class="settings-fields">
            <mat-slide-toggle [formField]="settingsForm.enabled">
              Avisar si pasa mucho tiempo sin hacer caca
            </mat-slide-toggle>
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Avisar a partir de</mat-label>
              <mat-select [formField]="settingsForm.thresholdHours">
                @for (option of thresholdOptions; track option.hours) {
                  <mat-option [value]="option.hours">{{ option.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </app-async-state>
      </section>
      <mat-divider />
      <p class="note">Ejemplos de avisos que podrás recibir. Todavía no están activos.</p>
      <mat-list>
        @for (item of items(); track item.title) {
          <mat-list-item lines="3">
            <mat-icon matListItemIcon fontSet="material-symbols-outlined" aria-hidden="true">
              {{ item.icon }}
            </mat-icon>
            <span matListItemTitle>
              {{ item.title }}
              @if (item.unread) {
                <span class="unread">· Nueva</span>
              }
            </span>
            <span matListItemLine>{{ item.message }}</span>
            <span matListItemLine>{{ item.elapsed }}</span>
          </mat-list-item>
        }
      </mat-list>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close cdkFocusInitial>Cerrar</button>
    </mat-dialog-actions>
  `,
})
export class NotificationsDialog {
  private readonly clock = createClock();
  private readonly destroyRef = inject(DestroyRef);
  private readonly diaperService = inject(DiaperService);
  private readonly saveRequests = new Subject<DiaperPoopAlertSettings>();
  /** Last settings known to be stored in the backend; the UI reverts to them if saving fails. */
  private confirmedSettings = DEFAULT_DIAPER_POOP_ALERT_SETTINGS;
  /** Last settings sent to the backend (or confirmed); changes are saved only when they differ. */
  private requestedSettings = DEFAULT_DIAPER_POOP_ALERT_SETTINGS;

  protected readonly thresholdOptions = THRESHOLD_OPTIONS;
  protected readonly settingsStatus = signal<LoadStatus>('loading');
  private readonly settings = signal<DiaperPoopAlertSettings>(DEFAULT_DIAPER_POOP_ALERT_SETTINGS);
  protected readonly settingsForm = form(this.settings, (path) => {
    disabled(path.thresholdHours, ({ valueOf }) => !valueOf(path.enabled));
  });

  protected readonly items = computed(() => {
    const now = this.clock.now();
    return EXAMPLES.map((item) => ({
      ...item,
      elapsed: formatElapsedSince(toIsoString(now - item.minutesAgo * MINUTE_MS), now),
    }));
  });

  constructor() {
    this.loadSettings();

    // Optimistic UI: the form already shows the change; only a failed save reverts it (the HTTP
    // interceptor reports the error).
    this.saveRequests
      .pipe(
        switchMap((settings) =>
          this.diaperService.savePoopAlertSettings(CURRENT_BABY_ID, settings).pipe(
            tap(() => (this.confirmedSettings = settings)),
            catchError(() => {
              this.requestedSettings = this.confirmedSettings;
              this.settings.set(this.confirmedSettings);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();

    effect(() => {
      const settings = this.settings();
      if (this.settingsStatus() !== 'loaded') {
        return;
      }

      untracked(() => {
        const requested = this.requestedSettings;
        if (settings.enabled !== requested.enabled || settings.thresholdHours !== requested.thresholdHours) {
          this.requestedSettings = { ...settings };
          this.saveRequests.next({ ...settings });
        }
      });
    });
  }

  protected loadSettings(): void {
    this.settingsStatus.set('loading');
    this.diaperService
      .getPoopAlertSettings(CURRENT_BABY_ID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          this.confirmedSettings = settings;
          this.requestedSettings = settings;
          this.settings.set(settings);
          this.settingsStatus.set('loaded');
        },
        error: () => this.settingsStatus.set('error'),
      });
  }
}
