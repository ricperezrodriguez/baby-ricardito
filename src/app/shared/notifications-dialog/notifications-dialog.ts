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
  FEEDING_OVERDUE_ALERT_THRESHOLDS,
  FeedingOverdueAlertSettings,
  FeedingOverdueAlertThreshold,
} from '@app/features/feeding/feeding.models';
import { FeedingService } from '@app/features/feeding/feeding.service';
import {
  NAIL_TRIM_OVERDUE_ALERT_THRESHOLDS,
  NailTrimOverdueAlertThreshold,
} from '@app/features/nail-trimming/nail-trimming.models';
import { NailTrimmingService } from '@app/features/nail-trimming/nail-trimming.service';
import {
  SLEEP_AWAKE_ALERT_THRESHOLDS,
  SLEEP_LONG_NAP_ALERT_THRESHOLDS,
  SleepAwakeAlertSettings,
  SleepAwakeAlertThreshold,
  SleepLongNapAlertSettings,
  SleepLongNapAlertThreshold,
} from '@app/features/sleep/sleep.models';
import { SleepService } from '@app/features/sleep/sleep.service';
import {
  VITAMIN_D_MISSED_ALERT_THRESHOLDS,
  VitaminDMissedAlertSettings,
} from '@app/features/vitamin-d/vitamin-d.models';
import { VitaminDService } from '@app/features/vitamin-d/vitamin-d.service';
import {
  AlertSettings,
  AlertSettingsSection,
} from '@app/shared/alert-settings-section/alert-settings-section';
import { createClock, formatElapsedSince, toIsoString } from '@shared';
import { map } from 'rxjs';

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

const FEEDING_THRESHOLD_OPTIONS = FEEDING_OVERDUE_ALERT_THRESHOLDS.map(
  (hours: FeedingOverdueAlertThreshold) => ({
    hours,
    label: `${hours.toLocaleString('es')} h`,
  }),
);

const POOP_THRESHOLD_OPTIONS = DIAPER_POOP_ALERT_THRESHOLDS.map((hours) => ({
  hours,
  label: THRESHOLD_LABELS[hours],
}));

const AWAKE_THRESHOLD_OPTIONS = SLEEP_AWAKE_ALERT_THRESHOLDS.map(
  (hours: SleepAwakeAlertThreshold) => ({
    hours,
    label: `${hours} h`,
  }),
);

const LONG_NAP_THRESHOLD_OPTIONS = SLEEP_LONG_NAP_ALERT_THRESHOLDS.map(
  (hours: SleepLongNapAlertThreshold) => ({
    hours,
    label: `${hours} h`,
  }),
);

const VITAMIN_D_THRESHOLD_OPTIONS = VITAMIN_D_MISSED_ALERT_THRESHOLDS.map((hours) => ({
  hours,
  label: `${String(hours).padStart(2, '0')}:00`,
}));

// The threshold of this alert is in days, but the section's option contract names it `hours`.
const NAIL_TRIM_THRESHOLD_OPTIONS = NAIL_TRIM_OVERDUE_ALERT_THRESHOLDS.map(
  (days: NailTrimOverdueAlertThreshold) => ({ hours: days, label: `${days} días` }),
);

// Sample content; real notifications do not exist yet.
const EXAMPLES: readonly NotificationExample[] = [
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
        heading="Alimentación"
        description="Avisar si pasa mucho tiempo desde la última toma (pecho o biberón)"
        loadingLabel="Cargando el aviso de alimentación"
        errorMessage="No se pudo cargar el aviso de alimentación."
        [options]="feedingOptions"
        [load]="loadFeedingSettings"
        [save]="saveFeedingSettings"
      />
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
      <app-alert-settings-section
        heading="Vitamina D"
        description="Avisar si todavía no se ha registrado la vitamina D de hoy"
        loadingLabel="Cargando el aviso de vitamina D"
        errorMessage="No se pudo cargar el aviso de vitamina D."
        [options]="vitaminDOptions"
        [load]="loadVitaminDSettings"
        [save]="saveVitaminDSettings"
      />
      <app-alert-settings-section
        heading="Corte de uñas"
        description="Avisar si pasa mucho tiempo desde el último corte de uñas"
        loadingLabel="Cargando el aviso de corte de uñas"
        errorMessage="No se pudo cargar el aviso de corte de uñas."
        [options]="nailTrimmingOptions"
        [load]="loadNailTrimmingSettings"
        [save]="saveNailTrimmingSettings"
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
  private readonly feedingService = inject(FeedingService);
  private readonly nailTrimmingService = inject(NailTrimmingService);
  private readonly sleepService = inject(SleepService);
  private readonly vitaminDService = inject(VitaminDService);

  protected readonly feedingOptions = FEEDING_THRESHOLD_OPTIONS;
  protected readonly poopOptions = POOP_THRESHOLD_OPTIONS;
  protected readonly awakeOptions = AWAKE_THRESHOLD_OPTIONS;
  protected readonly longNapOptions = LONG_NAP_THRESHOLD_OPTIONS;
  protected readonly vitaminDOptions = VITAMIN_D_THRESHOLD_OPTIONS;
  protected readonly nailTrimmingOptions = NAIL_TRIM_THRESHOLD_OPTIONS;

  protected readonly loadFeedingSettings = () =>
    this.feedingService.getOverdueAlertSettings(CURRENT_BABY_ID);
  protected readonly saveFeedingSettings = (settings: FeedingOverdueAlertSettings) =>
    this.feedingService.saveOverdueAlertSettings(CURRENT_BABY_ID, settings);
  protected readonly loadPoopSettings = () =>
    this.diaperService.getPoopAlertSettings(CURRENT_BABY_ID);
  protected readonly savePoopSettings = (settings: DiaperPoopAlertSettings) =>
    this.diaperService.savePoopAlertSettings(CURRENT_BABY_ID, settings);
  protected readonly loadAwakeSettings = () =>
    this.sleepService.getAwakeAlertSettings(CURRENT_BABY_ID);
  protected readonly saveAwakeSettings = (settings: SleepAwakeAlertSettings) =>
    this.sleepService.saveAwakeAlertSettings(CURRENT_BABY_ID, settings);
  protected readonly loadLongNapSettings = () =>
    this.sleepService.getLongNapAlertSettings(CURRENT_BABY_ID);
  protected readonly saveLongNapSettings = (settings: SleepLongNapAlertSettings) =>
    this.sleepService.saveLongNapAlertSettings(CURRENT_BABY_ID, settings);
  protected readonly loadVitaminDSettings = () =>
    this.vitaminDService.getMissedAlertSettings(CURRENT_BABY_ID);
  protected readonly saveVitaminDSettings = (settings: VitaminDMissedAlertSettings) =>
    this.vitaminDService.saveMissedAlertSettings(CURRENT_BABY_ID, settings);
  // `AlertSettingsSection` speaks `thresholdHours`; here the threshold is in days.
  protected readonly loadNailTrimmingSettings = () =>
    this.nailTrimmingService
      .getOverdueAlertSettings(CURRENT_BABY_ID)
      .pipe(map(({ enabled, thresholdDays }) => ({ enabled, thresholdHours: thresholdDays })));
  protected readonly saveNailTrimmingSettings = (settings: AlertSettings) =>
    this.nailTrimmingService
      .saveOverdueAlertSettings(CURRENT_BABY_ID, {
        enabled: settings.enabled,
        thresholdDays: settings.thresholdHours as NailTrimOverdueAlertThreshold,
      })
      .pipe(map(({ enabled, thresholdDays }) => ({ enabled, thresholdHours: thresholdDays })));

  protected readonly items = computed(() => {
    const now = this.clock.now();
    return EXAMPLES.map((item) => ({
      ...item,
      elapsed: formatElapsedSince(toIsoString(now - item.minutesAgo * MINUTE_MS), now),
    }));
  });
}
