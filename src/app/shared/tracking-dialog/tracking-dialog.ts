import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface TrackingDialogData {
  title: string;
  message: string;
}

@Component({
  imports: [MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
      <p>Este espacio se completará en una próxima mejora.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" mat-dialog-close>Entendido</button>
    </mat-dialog-actions>
  `,
})
export class TrackingDialog {
  readonly data = inject<TrackingDialogData>(MAT_DIALOG_DATA);
}
