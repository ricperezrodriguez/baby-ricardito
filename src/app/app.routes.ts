import { Routes } from '@angular/router';
import { DialogRouteData, DialogRouteHost } from '@app/shared/dialog-route/dialog-route';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@app/pages/home/home').then((m) => m.Home),
    children: [
      {
        path: 'lactancia',
        component: DialogRouteHost,
        data: {
          dialog: () =>
            import('@app/pages/home/cards/breastfeeding-card/breastfeeding-dialog/breastfeeding-dialog').then(
              (m) => m.BreastfeedingDialog,
            ),
        } satisfies DialogRouteData,
      },
      {
        path: 'notificaciones',
        component: DialogRouteHost,
        data: {
          dialog: () =>
            import('@app/shared/notifications-dialog/notifications-dialog').then(
              (m) => m.NotificationsDialog,
            ),
        } satisfies DialogRouteData,
      },
    ],
  },
  {
    path: 'detalle/pecho',
    loadComponent: () =>
      import('@app/pages/breastfeeding-history/breastfeeding-history').then(
        (m) => m.BreastfeedingHistory,
      ),
    children: [
      {
        path: ':sessionId',
        component: DialogRouteHost,
        data: {
          dialog: () =>
            import('@app/pages/home/cards/breastfeeding-card/breastfeeding-dialog/breastfeeding-dialog').then(
              (m) => m.BreastfeedingDialog,
            ),
          returnTo: '/detalle/pecho',
        } satisfies DialogRouteData,
      },
    ],
  },
  {
    path: 'detalle/:category',
    loadComponent: () =>
      import('@app/pages/pending-history/pending-history').then((m) => m.PendingHistory),
  },
  { path: '**', redirectTo: '' },
];
