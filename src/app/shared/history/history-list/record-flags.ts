import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Small icons (with hidden text for screen readers) telling that a record has notes or a photo. */
@Component({
  selector: 'app-record-flags',
  imports: [MatIconModule],
  host: { '[hidden]': '!hasNotes() && !hasPhoto()' },
  styles: `
    :host {
      align-items: center;
      display: inline-flex;
      gap: 0.25rem;
    }

    :host([hidden]) {
      display: none;
    }

    mat-icon {
      font-size: 1.1rem;
      height: 1.1rem;
      width: 1.1rem;
    }
  `,
  template: `
    @if (hasNotes()) {
      <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">notes</mat-icon>
      <span class="visually-hidden">Con notas</span>
    }
    @if (hasPhoto()) {
      <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">photo</mat-icon>
      <span class="visually-hidden">Con foto</span>
    }
  `,
})
export class RecordFlags {
  readonly hasNotes = input(false);
  readonly hasPhoto = input(false);
}
