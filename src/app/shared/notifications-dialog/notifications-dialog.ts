import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import {
  DIAPER_POOP_ALERT_THRESHOLDS,
  DiaperPoopAlertSettings,
  DiaperPoopAlertThreshold,
} from '@app/features/diaper/diaper.models';
import { DiaperService } from '@app/features/diaper/diaper.service';
import {
  SLEEP_AWAKE_ALERT_THRESHOLDS,
  SLEEP_LONG_NAP_ALERT_THRESHOLDS,
  SleepAwakeAlertSettings,
  SleepAwakeAlertThreshold,
  SleepLongNapAlertSettings,
  SleepLongNapAlertThreshold,
} from '@app/features/sleep/sleep.models';
import { SleepService } from '@app/features/sleep/sleep.service';
import { AlertSettingsSection } from '@app/shared/alert-settings-section/alert-settings-section';
import { createClock, formatElapsedSince, toIsoString } from '@shared';

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

const POOP_THRESHOLD_OPTIONS = DIAPER_POOP_ALERT_THRESHOLDS.map((hours) => ({
  hours,
  label: THRESHOLD_LABELS[hours],
}));

const AWAKE_THRESHOLD_OPTIONS = SLEEP_AWAKE_ALERT_THRESHOLDS.map((hours: SleepAwakeAlertThreshold) => ({
  hours,
  label: `${hours} h`,
}));

const LONG_NAP_THRESHOLD_OPTIONS = SLEEP_LONG_NAP_ALERT_THRESHOLDS.map((hours: SleepLongNapAlertThreshold) => ({
  hours,
  label: `${hours} h`,
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
    AlertSettingsSection,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
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
      <app-alert-settings-section
        heading="Pañal"
        description="Avisar si pasa mucho tiempo sin hacer caca"
        loadingLabel="Cargando los avisos de pañal"
        errorMessage="No se pudieron cargar los avisos de pañal."
        [options]="poopOptions"
        [load]="loadPoopSettings"
        [save]="savePoopSettings"
      />
      <app-alert-settings-section
        heading="Despierto mucho tiempo"
        description="Avisar si pasa mucho tiempo despierto"
        loadingLabel="Cargando el aviso de despierto"
        errorMessage="No se pudo cargar el aviso de despierto."
        [options]="awakeOptions"
        [load]="loadAwakeSettings"
        [save]="saveAwakeSettings"
      />
      <app-alert-settings-section
        heading="Siesta muy larga"
        description="Avisar si una siesta dura mucho tiempo"
        loadingLabel="Cargando el aviso de siesta larga"
        errorMessage="No se pudo cargar el aviso de siesta larga."
        [options]="longNapOptions"
        [load]="loadLongNapSettings"
        [save]="saveLongNapSettings"
      />
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
  private readonly diaperService = inject(DiaperService);
  private readonly sleepService = inject(SleepService);

  protected readonly poopOptions = POOP_THRESHOLD_OPTIONS;
  protected readonly awakeOptions = AWAKE_THRESHOLD_OPTIONS;
  protected readonly longNapOptions = LONG_NAP_THRESHOLD_OPTIONS;

  protected readonly loadPoopSettings = () => this.diaperService.getPoopAlertSettings(CURRENT_BABY_ID);
  protected readonly savePoopSettings = (settings: DiaperPoopAlertSettings) =>
    this.diaperService.savePoopAlertSettings(CURRENT_BABY_ID, settings);
  protected readonly loadAwakeSettings = () => this.sleepService.getAwakeAlertSettings(CURRENT_BABY_ID);
  protected readonly saveAwakeSettings = (settings: SleepAwakeAlertSettings) =>
    this.sleepService.saveAwakeAlertSettings(CURRENT_BABY_ID, settings);
  protected readonly loadLongNapSettings = () => this.sleepService.getLongNapAlertSettings(CURRENT_BABY_ID);
  protected readonly saveLongNapSettings = (settings: SleepLongNapAlertSettings) =>
    this.sleepService.saveLongNapAlertSettings(CURRENT_BABY_ID, settings);

  protected readonly items = computed(() => {
    const now = this.clock.now();
    return EXAMPLES.map((item) => ({
      ...item,
      elapsed: formatElapsedSince(toIsoString(now - item.minutesAgo * MINUTE_MS), now),
    }));
  });
}
