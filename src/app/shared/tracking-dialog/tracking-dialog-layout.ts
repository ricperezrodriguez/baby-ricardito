import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/** Estructura común de los modales de registro: título, contenido propio y acciones Cancelar/Guardar. */
@Component({
  selector: 'app-tracking-dialog-layout',
  imports: [MatButtonModule, MatDialogModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>{{ title() }}</h2>
    <mat-dialog-content>
      <ng-content />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close [disabled]="saving()">Cancelar</button>
      <button
        matButton="filled"
        type="button"
        [attr.aria-label]="saving() ? 'Guardando' : null"
        [disabled]="saveDisabled() || saving()"
        (click)="save.emit()"
      >
        @if (saving()) {
          <mat-spinner diameter="20" aria-hidden="true" />
        } @else {
          Guardar
        }
      </button>
    </mat-dialog-actions>
  `,
})
export class TrackingDialogLayout {
  readonly title = input.required<string>();
  readonly saveDisabled = input(false);
  readonly saving = input(false);
  readonly save = output<void>();
}
