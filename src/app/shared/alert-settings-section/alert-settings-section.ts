import { Component, DestroyRef, effect, inject, input, OnInit, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { disabled, form, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { EMPTY, Observable, Subject, catchError, switchMap, tap } from 'rxjs';
import { AsyncState } from '@app/shared/async-state/async-state';
import { LoadStatus } from '@app/shared/async-state/load-status';

/** Shape shared by every alert's settings stored in the backend. */
export interface AlertSettings {
  enabled: boolean;
  thresholdHours: number;
}

export interface AlertThresholdOption<Threshold extends number = number> {
  readonly hours: Threshold;
  /** Spanish text shown in the select, e.g. `3 h` */
  readonly label: string;
}

const PLACEHOLDER_SETTINGS: AlertSettings = { enabled: false, thresholdHours: 0 };

let nextSectionId = 0;

/**
 * Settings section of one Home alert (enabled switch + threshold select) for the notifications
 * modal. It loads the settings, saves every change by itself (optimistic UI: only a failed save
 * reverts the form, the HTTP interceptor reports the error) and shows the standard loading and
 * error states with "Reintentar".
 */
@Component({
  selector: 'app-alert-settings-section',
  imports: [AsyncState, FormField, MatFormFieldModule, MatSelectModule, MatSlideToggleModule],
  styles: `
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
  `,
  template: `
    <section class="settings" [attr.aria-labelledby]="titleId">
      <h3 class="settings-title" [id]="titleId">{{ heading() }}</h3>
      <app-async-state
        [status]="status()"
        [loadingLabel]="loadingLabel()"
        [errorMessage]="errorMessage()"
        (retry)="loadSettings()"
      >
        <div class="settings-fields">
          <mat-slide-toggle [formField]="settingsForm.enabled">{{ description() }}</mat-slide-toggle>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Avisar a partir de</mat-label>
            <mat-select [formField]="settingsForm.thresholdHours">
              @for (option of options(); track option.hours) {
                <mat-option [value]="option.hours">{{ option.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      </app-async-state>
    </section>
  `,
})
export class AlertSettingsSection<T extends AlertSettings> implements OnInit {
  /** Section title, e.g. `Pañal` */
  readonly heading = input.required<string>();
  /** Label of the enabled switch, e.g. `Avisar si pasa mucho tiempo sin hacer caca` */
  readonly description = input.required<string>();
  readonly options = input.required<readonly AlertThresholdOption<T['thresholdHours']>[]>();
  readonly loadingLabel = input.required<string>();
  readonly errorMessage = input.required<string>();
  readonly load = input.required<() => Observable<T>>();
  readonly save = input.required<(settings: T) => Observable<T>>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly saveRequests = new Subject<T>();
  /** Last settings known to be stored in the backend; the UI reverts to them if saving fails. */
  private confirmedSettings: AlertSettings = PLACEHOLDER_SETTINGS;
  /** Last settings sent to the backend (or confirmed); changes are saved only when they differ. */
  private requestedSettings: AlertSettings = PLACEHOLDER_SETTINGS;

  protected readonly titleId = `alert-settings-title-${nextSectionId++}`;
  protected readonly status = signal<LoadStatus>('loading');
  private readonly settings = signal<AlertSettings>(PLACEHOLDER_SETTINGS);
  protected readonly settingsForm = form(this.settings, (path) => {
    disabled(path.thresholdHours, ({ valueOf }) => !valueOf(path.enabled));
  });

  constructor() {
    this.saveRequests
      .pipe(
        switchMap((settings) =>
          this.save()(settings).pipe(
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
      if (this.status() !== 'loaded') {
        return;
      }

      untracked(() => {
        const requested = this.requestedSettings;
        if (settings.enabled !== requested.enabled || settings.thresholdHours !== requested.thresholdHours) {
          this.requestedSettings = { ...settings };
          // The select only offers `options()`, so the threshold is always a valid one for `T`.
          this.saveRequests.next({ ...settings } as T);
        }
      });
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  protected loadSettings(): void {
    this.status.set('loading');
    this.load()()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          this.confirmedSettings = settings;
          this.requestedSettings = settings;
          this.settings.set(settings);
          this.status.set('loaded');
        },
        error: () => this.status.set('error'),
      });
  }
}
