import { Routes } from '@angular/router';
import { DialogRouteData, DialogRouteHost } from '@app/shared/dialog-route/dialog-route';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@app/pages/inicio/inicio').then((m) => m.Inicio),
    children: [
      {
        path: 'lactancia',
        component: DialogRouteHost,
        data: {
          dialog: () =>
            import('@app/pages/inicio/cards/breastfeeding-card/breastfeeding-dialog/breastfeeding-dialog').then(
              (m) => m.BreastfeedingDialog,
            ),
        } satisfies DialogRouteData,
      },
    ],
  },
  {
    path: 'detalle/pecho',
    loadComponent: () => import('@app/pages/detalle-pecho/detalle-pecho').then((m) => m.DetallePecho),
    children: [
      {
        path: ':sessionId',
        component: DialogRouteHost,
        data: {
          dialog: () =>
            import('@app/pages/inicio/cards/breastfeeding-card/breastfeeding-dialog/breastfeeding-dialog').then(
              (m) => m.BreastfeedingDialog,
            ),
          returnTo: '/detalle/pecho',
        } satisfies DialogRouteData,
      },
    ],
  },
  { path: 'detalle/:categoria', loadComponent: () => import('@app/pages/detalle-pendiente/detalle-pendiente').then((m) => m.DetallePendiente) },
  { path: '**', redirectTo: '' },
];
