import { Component, inject, input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { TrackingDialog, TrackingDialogData } from '../tracking-dialog/tracking-dialog';

export const TRACKING_CARD_ICON_SIZE = 50;

@Component({
  selector: 'app-tracking-card',
  imports: [RouterLink, MatCardModule],
  styleUrl: './tracking-card.scss',
  templateUrl: './tracking-card.html',
  host: {
    '[style.--card-accent]': 'accent()',
    '[style.--card-header-color]': 'headerColor()',
  },
})
export class TrackingCard {
  private readonly dialog = inject(MatDialog);

  readonly link = input.required<string>();
  readonly title = input.required<string>();
  readonly dialogTitle = input.required<string>();
  readonly dialogMessage = input.required<string>();
  readonly ariaLabel = input<string>();
  readonly accent = input('var(--app-green)');
  readonly headerColor = input('var(--app-green)');

  openDialog(): void {
    const data: TrackingDialogData = {
      title: this.dialogTitle(),
      message: this.dialogMessage(),
    };

    this.dialog.open(TrackingDialog, { data });
  }
}
