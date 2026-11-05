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
        path: 'lactancia/:recordId',
        component: DialogRouteHost,
        data: {
          dialog: () =>
            import('@app/pages/home/cards/breastfeeding-card/breastfeeding-dialog/breastfeeding-dialog').then(
              (m) => m.BreastfeedingDialog,
            ),
        } satisfies DialogRouteData,
      },
      {
        path: 'panal',
        component: DialogRouteHost,
        data: {
          dialog: () =>
            import('@app/pages/home/cards/diaper-card/diaper-dialog/diaper-dialog').then(
              (m) => m.DiaperDialog,
            ),
        } satisfies DialogRouteData,
      },
      {
        path: 'panal/:recordId',
        component: DialogRouteHost,
        data: {
          dialog: () =>
            import('@app/pages/home/cards/diaper-card/diaper-dialog/diaper-dialog').then(
              (m) => m.DiaperDialog,
            ),
        } satisfies DialogRouteData,
      },
      {
        path: 'biberon',
        component: DialogRouteHost,
        data: {
          dialog: () =>
            import('@app/pages/home/cards/bottle-card/bottle-dialog/bottle-dialog').then(
              (m) => m.BottleDialog,
            ),
        } satisfies DialogRouteData,
      },
      {
        path: 'biberon/:recordId',
        component: DialogRouteHost,
        data: {
          dialog: () =>
            import('@app/pages/home/cards/bottle-card/bottle-dialog/bottle-dialog').then(
              (m) => m.BottleDialog,
            ),
        } satisfies DialogRouteData,
      },
      {
        path: 'sueno',
        component: DialogRouteHost,
        data: {
          dialog: () =>
            import('@app/pages/home/cards/sleep-card/sleep-dialog/sleep-dialog').then(
              (m) => m.SleepDialog,
            ),
        } satisfies DialogRouteData,
      },
      {
        path: 'sueno/:recordId',
        component: DialogRouteHost,
        data: {
          dialog: () =>
            import('@app/pages/home/cards/sleep-card/sleep-dialog/sleep-dialog').then(
              (m) => m.SleepDialog,
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
        path: ':recordId',
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
    path: 'detalle/panal',
    loadComponent: () =>
      import('@app/pages/diaper-history/diaper-history').then((m) => m.DiaperHistory),
    children: [
      {
        path: ':recordId',
        component: DialogRouteHost,
        data: {
          dialog: () =>
            import('@app/pages/home/cards/diaper-card/diaper-dialog/diaper-dialog').then(
              (m) => m.DiaperDialog,
            ),
          returnTo: '/detalle/panal',
        } satisfies DialogRouteData,
      },
    ],
  },
  {
    path: 'detalle/biberon',
    loadComponent: () =>
      import('@app/pages/bottle-history/bottle-history').then((m) => m.BottleHistory),
    children: [
      {
        path: ':recordId',
        component: DialogRouteHost,
        data: {
          dialog: () =>
            import('@app/pages/home/cards/bottle-card/bottle-dialog/bottle-dialog').then(
              (m) => m.BottleDialog,
            ),
          returnTo: '/detalle/biberon',
        } satisfies DialogRouteData,
      },
    ],
  },
  {
    path: 'detalle/sueno',
    loadComponent: () =>
      import('@app/pages/sleep-history/sleep-history').then((m) => m.SleepHistory),
    children: [
      {
        path: ':recordId',
        component: DialogRouteHost,
        data: {
          dialog: () =>
            import('@app/pages/home/cards/sleep-card/sleep-dialog/sleep-dialog').then(
              (m) => m.SleepDialog,
            ),
          returnTo: '/detalle/sueno',
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
