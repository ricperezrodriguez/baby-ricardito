import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Photo block of a record dialog: preview plus add/change/remove buttons.
 *
 * Read-only it shows only the photo (nothing at all when there is none). It does not validate or store the
 * file: it emits the chosen one so the dialog hands it to `RecordPhoto`.
 */
@Component({
  selector: 'app-record-photo-field',
  imports: [MatButtonModule, MatIconModule],
  styles: `
    :host {
      display: block;
    }

    .photo {
      margin-bottom: 1rem;
    }

    .photo-title {
      font-size: 1rem;
      margin: 0 0 0.5rem;
    }

    .photo-preview {
      border-radius: 0.5rem;
      display: block;
      margin-bottom: 0.75rem;
      max-height: 16rem;
      object-fit: cover;
      width: 100%;
    }

    .photo-input {
      display: none;
    }

    .photo-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  `,
  template: `
    @if (!readOnly() || previewUrl()) {
      <div class="photo">
        <h4 class="photo-title">Foto</h4>
        @if (previewUrl(); as url) {
          <img class="photo-preview" [alt]="alt()" [src]="url" />
        }
        @if (!readOnly()) {
          <input
            #photoInput
            class="photo-input"
            type="file"
            accept="image/*"
            (change)="select(photoInput)"
          />
          <div class="photo-actions">
            <button
              matButton="tonal"
              type="button"
              [disabled]="disabled()"
              (click)="photoInput.click()"
            >
              <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">
                {{ previewUrl() ? 'edit' : 'add_a_photo' }}
              </mat-icon>
              {{ previewUrl() ? 'Cambiar foto' : 'Añadir foto' }}
            </button>
            @if (previewUrl()) {
              <button matButton type="button" [disabled]="disabled()" (click)="removeRequested.emit()">
                <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">delete</mat-icon>
                Quitar foto
              </button>
            }
          </div>
        }
      </div>
    }
  `,
})
export class RecordPhotoField {
  /** Photo to show (the chosen one, or the stored one); `null` when there is none. */
  readonly previewUrl = input<string | null>(null);
  /** Accessible description of the photo, e.g. `Foto de la toma`. */
  readonly alt = input.required<string>();
  readonly readOnly = input(false);
  /** Disables the buttons (the dialog is busy or saving). */
  readonly disabled = input(false);
  readonly fileSelected = output<File>();
  readonly removeRequested = output<void>();

  protected select(element: HTMLInputElement): void {
    const file = element.files?.item(0) ?? null;
    element.value = '';
    if (file !== null) {
      this.fileSelected.emit(file);
    }
  }
}
