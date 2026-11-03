import { Component, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { createClock, formatElapsedSince, toIsoString } from '@shared';

interface NotificationExample {
  readonly icon: string;
  readonly title: string;
  readonly message: string;
  readonly minutesAgo: number;
  readonly unread: boolean;
}

const MINUTE_MS = 60_000;

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
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatListModule],
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
      margin: 0 0 0.5rem;
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

  protected readonly items = computed(() => {
    const now = this.clock.now();
    return EXAMPLES.map((item) => ({
      ...item,
      elapsed: formatElapsedSince(toIsoString(now - item.minutesAgo * MINUTE_MS), now),
    }));
  });
}
