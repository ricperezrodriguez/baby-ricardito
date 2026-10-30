import { Component, Type, inject, input, output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { RouterLink } from '@angular/router';
import { TrackingDialog, TrackingDialogData } from '@app/shared/tracking-dialog/tracking-dialog';

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

  readonly link = input.required<string>();
  readonly title = input.required<string>();
  /** Modal propio de la tarjeta; si no se indica se muestra el modal genérico provisional. */
  readonly dialogComponent = input<Type<unknown>>(TrackingDialog);
  readonly dialogTitle = input('');
  readonly dialogMessage = input('');
  readonly ariaLabel = input<string>();
  readonly accent = input('var(--app-green)');
  readonly headerColor = input('var(--app-green)');
  /** Se emite cuando el modal se cierra con un resultado (es decir, tras guardar). */
  readonly saved = output<void>();

  openDialog(): void {
    const data: TrackingDialogData = {
      title: this.dialogTitle(),
      message: this.dialogMessage(),
    };

    this.dialog
      .open(this.dialogComponent(), { data, width: '34rem' })
      .afterClosed()
      .subscribe((result: unknown) => {
        if (result !== undefined) {
          this.saved.emit();
        }
      });
  }
}
