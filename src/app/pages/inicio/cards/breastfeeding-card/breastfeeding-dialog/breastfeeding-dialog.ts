import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { NotificationService } from '@app/core/notification.service';
import {
  Breast,
  BREAST_SIDE,
  BreastfeedingSession,
  CreateBreastfeedingSessionDto,
} from '@app/features/breastfeeding/breastfeeding.models';
import { BreastfeedingService } from '@app/features/breastfeeding/breastfeeding.service';
import { formatDuration, TrackingDialogLayout } from '@shared';
import { interval } from 'rxjs';

interface TimedSegment {
  breast: Breast;
  start: number;
  end: number | null;
}

const SIDES: readonly { breast: Breast; label: string }[] = [
  { breast: BREAST_SIDE.LEFT, label: 'Teta izquierda' },
  { breast: BREAST_SIDE.RIGHT, label: 'Teta derecha' },
];

@Component({
  imports: [
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TrackingDialogLayout,
  ],
  styleUrl: './breastfeeding-dialog.scss',
  templateUrl: './breastfeeding-dialog.html',
})
export class BreastfeedingDialog {
  private readonly dialogRef =
    inject<MatDialogRef<BreastfeedingDialog, BreastfeedingSession>>(MatDialogRef);
  private readonly breastfeedingService = inject(BreastfeedingService);
  private readonly notifications = inject(NotificationService);

  private readonly now = signal(Date.now());
  private readonly segments = signal<TimedSegment[]>([]);

  readonly notes = signal('');
  readonly saving = signal(false);

  readonly hasSegments = computed(() => this.segments().length > 0);
  private readonly activeBreast = computed(
    () => this.segments().find(({ end }) => end === null)?.breast ?? null,
  );

  private readonly durationsMs = computed(() => {
    const now = this.now();
    const totals: Record<Breast, number> = { left: 0, right: 0 };
    for (const { breast, start, end } of this.segments()) {
      totals[breast] += Math.max(0, (end ?? now) - start);
    }
    return totals;
  });

  readonly sideControls = computed(() =>
    SIDES.map(({ breast, label }) => ({
      breast,
      label,
      active: this.activeBreast() === breast,
      duration: formatDuration(this.durationsMs()[breast]),
    })),
  );

  readonly summary = computed(() => {
    const segments = this.segments();
    const durations = this.durationsMs();
    const last = segments.at(-1);

    // The pause is the idle time between consecutive segments (switching breasts or stopping and resuming).
    let pauseMs = 0;
    for (let index = 1; index < segments.length; index++) {
      const previousEnd = segments[index - 1].end;
      if (previousEnd !== null) {
        pauseMs += Math.max(0, segments[index].start - previousEnd);
      }
    }

    return {
      total: formatDuration(durations.left + durations.right),
      pause: formatDuration(pauseMs),
      start: segments[0]?.start ?? null,
      end: last?.end ?? null,
      inProgress: last !== undefined && last.end === null,
    };
  });

  constructor() {
    interval(1_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.now.set(Date.now()));
  }

  toggle(breast: Breast): void {
    const timestamp = Date.now();
    this.now.set(timestamp);
    const wasActive = this.activeBreast() === breast;

    this.segments.update((segments) => {
      const closed = segments.map((segment) =>
        segment.end === null ? { ...segment, end: timestamp } : segment,
      );
      return wasActive ? closed : [...closed, { breast, start: timestamp, end: null }];
    });
  }

  onNotesInput(event: Event): void {
    this.notes.set((event.target as HTMLTextAreaElement).value);
  }

  save(): void {
    const timestamp = Date.now();
    const segments = this.segments().map((segment) => ({
      breast: segment.breast,
      startTime: new Date(segment.start).toISOString(),
      endTime: new Date(segment.end ?? timestamp).toISOString(),
    }));
    const first = segments.at(0);
    const last = segments.at(-1);
    if (!first || !last) {
      return;
    }

    const notes = this.notes().trim();
    const dto: CreateBreastfeedingSessionDto = {
      babyId: CURRENT_BABY_ID,
      startTime: first.startTime,
      endTime: last.endTime,
      segments,
      ...(notes ? { notes } : {}),
    };

    this.saving.set(true);
    this.breastfeedingService.create(dto).subscribe({
      next: (session) => {
        this.notifications.success('Toma guardada');
        this.dialogRef.close(session);
      },
      error: (error: unknown) => {
        console.error('No se pudo guardar la sesión de lactancia.', error);
        this.saving.set(false);
      },
    });
  }
}
