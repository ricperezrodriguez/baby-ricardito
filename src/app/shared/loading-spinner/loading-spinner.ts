import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  imports: [MatProgressSpinnerModule],
  template: `<mat-progress-spinner mode="indeterminate" [diameter]="diameter()" [attr.aria-label]="label()" />`,
  styles: `
    :host {
      align-items: center;
      display: flex;
      justify-content: center;
      min-height: 3.25rem;
    }
  `,
})
export class LoadingSpinner {
  /** Texto accesible que describe qué se está cargando. */
  readonly label = input('Cargando');
  readonly diameter = input(32);
}
