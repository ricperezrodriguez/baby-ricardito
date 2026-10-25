import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('@app/pages/inicio/inicio').then((m) => m.Inicio) },
  { path: 'detalle/:categoria', loadComponent: () => import('@app/pages/detalle-pendiente/detalle-pendiente').then((m) => m.DetallePendiente) },
  { path: '**', redirectTo: '' },
];
