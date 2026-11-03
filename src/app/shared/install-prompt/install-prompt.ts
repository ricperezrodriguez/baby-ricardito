import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PwaService } from '@app/core/pwa.service';

/** Banner on mobile browsers that offers to install the app on the home screen. */
@Component({
  selector: 'app-install-prompt',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  styles: `
    :host {
      display: block;
    }

    .prompt {
      background: color-mix(in srgb, var(--app-green) 10%, var(--app-surface));
      border-color: var(--app-green);
      border-radius: 1.1rem;
      margin-block-end: 1rem;
    }

    .prompt-body {
      align-items: center;
      display: flex;
      gap: 0.75rem;
      padding: 0.5rem 0.5rem 0.5rem 1rem;
    }

    .prompt-icon {
      color: var(--app-green);
      flex: 0 0 auto;
    }

    .prompt-content {
      flex: 1;
      min-width: 0;
    }

    .prompt-text {
      color: var(--app-ink);
      font-size: 0.95rem;
      line-height: 1.4;
      margin: 0;
    }

    .prompt-action {
      margin-block-start: 0.5rem;
    }
  `,
  template: `
    @if (pwa.installMode(); as mode) {
      <mat-card class="prompt" appearance="outlined" role="status">
        <div class="prompt-body">
          <mat-icon class="prompt-icon" fontSet="material-symbols-outlined" aria-hidden="true">
            install_mobile
          </mat-icon>
          <div class="prompt-content">
            @if (mode === 'native') {
              <p class="prompt-text">
                Instala baby-ricardito en tu móvil para abrirla como una app.
              </p>
              <button
                matButton="filled"
                type="button"
                class="prompt-action"
                (click)="pwa.install()"
              >
                Instalar
              </button>
            } @else {
              <p class="prompt-text">
                Para instalarla como app, pulsa el botón Compartir del navegador y elige «Añadir a
                pantalla de inicio».
              </p>
            }
          </div>
          <button
            matIconButton
            type="button"
            aria-label="Cerrar aviso de instalación"
            (click)="pwa.dismiss()"
          >
            <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">close</mat-icon>
          </button>
        </div>
      </mat-card>
    }
  `,
})
export class InstallPrompt {
  protected readonly pwa = inject(PwaService);
}
