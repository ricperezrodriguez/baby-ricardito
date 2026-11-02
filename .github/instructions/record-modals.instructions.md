---
applyTo: "src/app/**/*dialog*/**,src/app/shared/dialog-route/**,src/app/shared/tracking-dialog/**,src/app/shared/confirmation-dialog/**,src/app/shared/tracking-card/**,src/app/app.routes.ts,src/app/core/notification.service.ts"
---

# Creation modals, closing rules and snackbars

General rules for the modals opened from the tracking cards on Home (`+` button or card content) and for user feedback. The modal that views/edits an existing record from a history page is in `.github/instructions/dialogs-feedback.instructions.md`.

## Route-driven modals (linkable)

Record modals open from a child route of Home, so the URL is the source of truth: the modal is open if and only if the URL says so. A direct link such as `/lactancia` opens the app with Home behind and the modal on top.

- **Route:** in `src/app/app.routes.ts`, `''` (`Home`) has one child route per modal with `component: DialogRouteHost` and `data: { dialog: () => import(...).then(m => m.XDialog) } satisfies DialogRouteData`. The dialog is lazy-loaded. Optional `dialogData` provides `title`/`message` to the generic placeholder `TrackingDialog`. Optional `returnTo` is the route to navigate to on close (default `/`).
- **Host:** `DialogRouteHost` (`src/app/shared/dialog-route/dialog-route.ts`) has no view. When activated it opens the modal with `MatDialog` (`closeOnNavigation: false`, because the route governs closing); when the modal closes it navigates to `returnTo` (or `/`); if the route is left (browser back) it closes the modal. It passes `DialogRouteContext` (`dialogData` fields plus route `params`) as `MAT_DIALOG_DATA`.
- **Card:** `TrackingCard` takes `dialogRoute="lactancia"`. With it, the `+` button and the actionable content navigate to `/lactancia` instead of opening the dialog directly. Without it, it opens `dialogComponent` (behavior of cards without a route yet).
- **Card refresh:** `DialogRouteHost` calls `DialogRouteEvents.notifyClosed(path)` and the `TrackingCard` whose `dialogRoute` matches emits `closed`, which reloads it. Do not refresh the card any other way.
- **Home** must contain `<router-outlet />` for the child routes to activate. `Home` is not recreated when a modal opens or closes.
- **Adding a new modal:** (1) create the dialog component with `TrackingDialogLayout`; (2) add its child route; (3) set `dialogRoute` on its card. Routes are Spanish and without accents (`lactancia`, `biberon`, `panal`, `sueno`). An unknown URL falls into `**` and redirects to Home.
- **Exception:** `ConfirmationDialog` has no route (it is ephemeral and depends on the state of the modal that opens it).

## Closing and cancelling creation modals

Creation modals use `TrackingDialogLayout` (`src/app/shared/tracking-dialog/tracking-dialog-layout.ts`). The layout never closes the modal: it emits events and the modal using it decides what to do and closes it.

- **Close (X, outside click, Escape)** emits `dismiss`. It is non-destructive: it keeps the record (saves what is pending and closes). **No confirmation.**
- **Cancelar** emits `discard` only after confirming in `ConfirmationDialog` (`¿Cancelar registro?`). It is destructive: it deletes the record.
- General rule: ask for confirmation only for irreversible actions or ones that lose data. Reversible ones do not ask.
- If there is nothing to lose (the record has no data yet), closing shows no confirmation or notice.
- While the modal is saving, loading or closing (`busy`/`saving`), close, cancel and save are blocked.

## Informational snackbar

Any action whose result is not obvious on screen must be reported with a snackbar, so the user never doubts what happened to their data.

- Use `NotificationService` (`src/app/core/notification.service.ts`): `success()` for confirmations and information, `error()` for failures. Never use `MatSnackBar` directly.
- Examples: `Toma guardada` on save; `Toma en curso. Puedes continuarla desde la tarjeta.` when closing with X a feed that keeps running.
- Show the snackbar only when the operation succeeded, right before closing the modal. HTTP errors are already reported by `http-error-snackbar.interceptor.ts`; do not duplicate them.
- Texts are short, in Spanish and in a neutral tone.
