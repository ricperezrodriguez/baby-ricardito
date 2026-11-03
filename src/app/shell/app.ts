import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterLink, RouterOutlet } from '@angular/router';
import { InstallPrompt } from '@shared';

interface SettingsItem {
  readonly icon: string;
  readonly label: string;
  readonly description: string;
}

@Component({
  imports: [
    InstallPrompt,
    RouterOutlet,
    RouterLink,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
  ],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  /** URL de la foto del bebé; si es `null` se muestra la inicial. */
  protected readonly babyPhoto = signal<string | null>('baby-avatar.svg');

  protected readonly settings: readonly SettingsItem[] = [
    {
      icon: 'child_care',
      label: 'Perfil del bebé',
      description: 'Nombre, foto y fecha de nacimiento',
    },
    { icon: 'swap_horiz', label: 'Cambiar o añadir bebé', description: 'Gestiona varios perfiles' },
    { icon: 'group', label: 'Cuidadores', description: 'Comparte el seguimiento con tu familia' },
    {
      icon: 'straighten',
      label: 'Unidades y formato',
      description: 'ml/oz, kg/lb y formato de hora',
    },
    { icon: 'palette', label: 'Apariencia', description: 'Tema y tamaño del texto' },
  ];
}
