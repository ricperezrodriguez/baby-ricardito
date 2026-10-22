import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio) },
  { path: 'detalle/:categoria', loadComponent: () => import('./pages/detalle-pendiente/detalle-pendiente').then((m) => m.DetallePendiente) },
  { path: '**', redirectTo: '' },
];
