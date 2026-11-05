import { Component, Type, computed, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { Router, RouterLink } from '@angular/router';
import { DialogRouteEvents } from '@app/shared/dialog-route/dialog-route';
import { TrackingDialog, TrackingDialogData } from '@app/shared/tracking-dialog/tracking-dialog';
import { filter } from 'rxjs';

export const TRACKING_CARD_ICON_SIZE = 50;

@Component({
  selector: 'app-tracking-card',
  imports: [MatButtonModule, MatCardModule, MatDividerModule, RouterLink],
  styleUrl: './tracking-card.scss',
  templateUrl: './tracking-card.html',
  host: {
    '[style.--card-accent]': 'accent()',
    '[style.--card-header-color]': 'headerColor()',
  },
})
export class TrackingCard {
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly link = input.required<string>();
  readonly title = input.required<string>();
  /** The card's own modal; if omitted, the provisional generic modal is shown. */
  readonly dialogComponent = input<Type<unknown>>(TrackingDialog);
  /** Child route of Home (e.g. `lactancia`) whose modal replaces `dialogComponent`; the URL becomes shareable. */
  readonly dialogRoute = input<string>();
  readonly dialogTitle = input('');
  readonly dialogMessage = input('');
  readonly ariaLabel = input<string>();
  readonly accent = input('var(--app-green)');
  readonly headerColor = input('var(--app-green)');
  /** When true, clicking the card content opens the same modal as the "+" button. */
  readonly contentOpensDialog = input(false);
  /**
   * Route segments (e.g. `['panal', id]`) of the latest finished record, a child route of Home that
   * opens it in history mode. While set, clicking the card content opens it; `null` otherwise.
   */
  readonly recordRoute = input<readonly string[] | null>(null);
  /** Accessible name of the content when it opens the latest record (e.g. `Ver el último pañal`). */
  readonly recordLabel = input('Ver el último registro');
  /** Highlights the card while a record is in progress. */
  readonly active = input(false);
  /** Emitted whenever the modal closes, so the card refreshes its data. */
  readonly closed = output<void>();

  /** The in-progress modal takes priority over opening the latest record. */
  protected readonly opensLatestRecord = computed(
    () => !this.contentOpensDialog() && this.recordRoute() !== null,
  );

  constructor() {
    inject(DialogRouteEvents)
      .closed$.pipe(
        filter((path) => path === this.dialogRoute()),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closed.emit());
  }

  protected openContent(): void {
    const record = this.recordRoute();
    if (this.opensLatestRecord() && record) {
      void this.router.navigate(['/', ...record]);
    } else if (this.contentOpensDialog()) {
      this.openDialog();
    }
  }

  protected openContentWithKey(event: Event): void {
    if (this.opensLatestRecord()) {
      event.preventDefault();
      this.openContent();
    }
  }

  openDialog(): void {
    const route = this.dialogRoute();
    if (route) {
      void this.router.navigate(['/', route]);
      return;
    }

    const data: TrackingDialogData = {
      title: this.dialogTitle(),
      message: this.dialogMessage(),
    };

    this.dialog
      .open(this.dialogComponent(), { data, width: '34rem' })
      .afterClosed()
      .subscribe(() => this.closed.emit());
  }
}
