---
applyTo: 'src/app/**/*dialog*/**,src/app/shared/dialog-route/**,src/app/shared/tracking-dialog/**,src/app/shared/confirmation-dialog/**,src/app/app.routes.ts'
---

# View / edit record modal

This file describes **only** the modal that opens when the user taps a row of a history list to see, modify or delete an existing record. The behavior is the same for every tracker (breastfeeding "toma", bottle, diaper, sleep, and any card added in the future). Only the noun and the editable fields change.

For the history page that hosts the modal, see `.github/instructions/history-page.instructions.md`. For the general modal rules (creation modals, closing, snackbars) see `.github/instructions/record-modals.instructions.md`.

## One component, two uses

The view/edit modal is **not** a new component: it is the same dialog used to create a record (e.g. `BreastfeedingDialog`), built on `TrackingDialogLayout`. It switches to _history mode_ when its route provides a record id. New trackers must follow the same pattern: one dialog component that handles both creation and history mode.

## Route

- The modal is a child route of the history page, with `component: DialogRouteHost`: `detalle/<category>` > `:recordId`. The param is **always** `recordId`, for every tracker: never choose a tracker-specific name (`sessionId`, `changeId`...). It is defined once as `RECORD_ID_PARAM` / `RECORD_DIALOG_ROUTE` (`:recordId`) in `shared/dialog-route/dialog-route.ts` (`RECORD_DIALOG_ROUTE` is exported from `@shared`).
- Route `data`: `{ dialog: () => import(...).then(m => m.XDialog), returnTo: '/detalle/<category>' } satisfies DialogRouteData`. `returnTo` is where `DialogRouteHost` navigates when the modal closes (default is `/`).
- `DialogRouteHost` passes `DialogRouteContext` as `MAT_DIALOG_DATA`: the `dialogData` fields plus `params` (the route params). The dialog injects it as optional and reads `params['recordId']` through `RecordDialogController` (no per-dialog configuration); without it the dialog runs in creation mode.
- The history page must contain `<router-outlet />`. The URL is the source of truth: the modal is open if and only if the URL says so, so the link is shareable and the browser back button closes it.
- The modal path (`:recordId`, `RECORD_DIALOG_ROUTE`) is what `DialogRouteEvents.notifyClosed(path)` emits when it closes. The history page and its list listen to that path to reload (see the history page file). Do not refresh them any other way.
- If loading the record fails (e.g. it was deleted), the dialog closes itself; the HTTP error interceptor already reports the error.
- Only **finished** records open in history mode. A record still in progress is continued in its own creation route (`/lactancia`, ...), so the list links there instead. If a running record is opened by URL, the dialog drops history mode and behaves like the creation dialog.

## Modes and buttons

| Mode           | Title                | Fields                                                                                               | Footer                              |
| -------------- | -------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------- |
| View (initial) | `Detalle de la toma` | All disabled (plain text, no edit icons, no photo buttons; empty notes and missing photo are hidden) | trash icon, `Cancelar`, `Editar`    |
| Edit           | `Editar toma`        | Enabled                                                                                              | trash icon, `Cancelar`, `Modificar` |

- `Editar` only switches to edit mode; nothing is saved yet.
- `Modificar` replaces `Guardar` as the main action. It is disabled until there is at least one change (`dirty`), and opens a `ConfirmationDialog` (`¿Modificar toma?`, buttons `Volver` / `Modificar`) before saving.
- The **trash icon** (`aria-label="Eliminar toma"`, coral color, left side of the footer through the `[dialogActionsStart]` slot of the layout) is visible in **both** modes, so a record can be deleted without entering edit mode. It opens a `ConfirmationDialog` (`¿Eliminar toma?`, buttons `Volver` / `Eliminar toma`).
- `Cancelar` never deletes in history mode: it closes the modal (see below). It keeps the label from the creation modal.
- Timer-style controls (start/stop per breast) are not used in history mode: show the plain label and the duration instead of the toggle buttons.
- Use the noun of the tracker in the texts (`toma`, `biberón`, `cambio`, `descanso`...), keeping the same sentence structure. Copy is in Spanish.

## Saving behavior

- In history mode **nothing is persisted while editing**. All changes stay local (including the chosen photo) and are sent in one request after the user confirms `Modificar`. In creation mode each change is still persisted immediately.
- Detect changes by comparing a serialized snapshot of the editable state (segments/times, notes, photo state) taken right after loading the record with the current one. Do not compare by reference.
- When a time that defines the record changes (e.g. the start), send the matching top-level field too (`startTime`, `endTime`), not only the child data, so lists, ordering and stats stay correct.
- Records without child data (e.g. a feed without segments) keep their times read-only; only notes and photo are editable.
- Sends go through the dialog's write queue so they never race each other.

## Closing and discarding

- `Cancelar`, `X`, outside click and `Escape` all end in the same place in history mode: **close the modal and discard local edits**.
- Ask for confirmation **only when there are unsaved changes**: `¿Descartar cambios?` (buttons `Seguir editando` / `Descartar`). With no changes, close silently.
- In history mode the layout must not show its own "cancel record" confirmation: bind `[confirmBeforeDiscard]="!historyMode()"` and let the dialog handle `(discard)` and `(dismiss)` itself.
- While loading, saving or leaving (`busy`/`saving`/`leaving`) closing, cancelling, saving and deleting are blocked, and a second confirmation cannot be opened on top of one that is already open.

## Feedback

Snackbars through `NotificationService.success()`, shown only on success and right before closing: `Toma modificada` after `Modificar`, `Toma eliminada` after deleting. Do not show one when the user only closes or discards. Do not duplicate HTTP errors (the interceptor reports them).

## `TrackingDialogLayout` contract used by this modal

- `title`, `saveLabel` (`Editar` / `Modificar` / `Guardar`), `saveDisabled`, `saving`, `busy`.
- `confirmBeforeDiscard` (boolean, default `true`): when `false`, `Cancelar` emits `discard` without its own confirmation.
- Content projection slot `[dialogActionsStart]` for extra actions at the left of the footer (the trash icon).
- The layout never closes the modal: it emits `save`, `dismiss` and `discard`, and the dialog decides what to do.

## Adding the modal to a new tracker

1. Make the tracker's dialog accept the route context (`MAT_DIALOG_DATA`, optional) and implement history mode: `historyMode`, `editing`, `readOnly = historyMode && !editing`, snapshot-based `dirty`, and the three confirmations above.
2. Add the child route under the tracker's history page with `returnTo`.
3. Link the history rows to `['/detalle/<category>', id]` (finished) or to the creation route (in progress).
4. Make sure the history page reloads when the `:recordId` path is notified (use `RECORD_DIALOG_ROUTE` as `dialogRoute`).
