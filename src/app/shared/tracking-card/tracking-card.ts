import { Component, Type, inject, input, output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { DialogRouteEvents } from '@app/shared/dialog-route/dialog-route';
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
  private readonly router = inject(Router);

  readonly link = input.required<string>();
  readonly title = input.required<string>();
  /** Modal propio de la tarjeta; si no se indica se muestra el modal genérico provisional. */
  readonly dialogComponent = input<Type<unknown>>(TrackingDialog);
  /** Ruta hija de Inicio (p. ej. `lactancia`) cuyo modal sustituye a `dialogComponent`; la URL pasa a ser enlazable. */
  readonly dialogRoute = input<string>();
  readonly dialogTitle = input('');
  readonly dialogMessage = input('');
  readonly ariaLabel = input<string>();
  readonly accent = input('var(--app-green)');
  readonly headerColor = input('var(--app-green)');
  /** Cuando es true, pulsar el contenido de la tarjeta abre el mismo modal que el botón «+». */
  readonly contentOpensDialog = input(false);
  /** Resalta la tarjeta mientras hay un registro en curso. */
  readonly active = input(false);
  /** Se emite siempre que el modal se cierra, para que la tarjeta refresque sus datos. */
  readonly closed = output<void>();

  constructor() {
    inject(DialogRouteEvents)
      .closed$.pipe(
        filter((path) => path === this.dialogRoute()),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closed.emit());
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
