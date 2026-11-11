# Breastfeeding Decisions

## Approved

- Finished feeds remain read-only until the user selects `Editar`.
- In edit mode, show the same per-breast play/stop controls as in creation mode so the user can continue the same feed from the current instant, preserving previous segments.
- History-mode timer changes remain local until the user confirms `Modificar`. Cancelling or dismissing follows the existing unsaved-change discard confirmation.
- Confirming with a running segment reopens the feed (`endTime: null`); confirming with all segments stopped keeps it finished.
- Manual per-breast duration editing is disabled while a segment is running.
- In creation mode, `Guardar` preserves any running segment and keeps the feed in progress (`endTime: null`) after closing. If all segments are stopped, it finishes the feed as before. The success notice distinguishes both outcomes.

### Running-feed system notification (PWA)

- While a feed is open (running or paused) a system notification shows it at the top of the phone (tag `breastfeeding-live`). It disappears when the feed is finished or deleted.
- Title `Toma en curso · Izquierdo|Derecho` or `Toma en pausa`; body `Izq. 8 min · Der. 5 min · Empezó a las 10:42`. It is refreshed on every change (not every second: the web has no live timers); only the first notice of a feed may make a sound.
- Buttons (Android only, two at most): a breast running -> `⏸ Parar <it>` + `▶ Cambiar a <other>`; paused -> `▶ <breast opposite to the last one>` + `✓ Finalizar` (finishes at the current instant).
- Buttons change the feed without opening the app; the card and an open dialog sync (an open dialog closes with `Toma guardada` when the feed is finished from the notification). Tapping the body focuses the app and opens `/lactancia`.
- If the system already killed the app, buttons only close the notification (the mock backend lost the feed anyway); tapping the body opens the app.
- iOS (16.4+, installed app only): same text without buttons; tapping opens the modal. Live Activities / Dynamic Island are not available to PWAs.
- Permission: requested on the first ▶ in the dialog (`PushNotificationService.offerOnFirstUse()`, asked once per device). Settings live in the `Notificaciones` block of the side menu (opened from the app avatar): a general device switch `Notificaciones push` and, under it, the type switch `Toma de lactancia en curso` (type `breastfeeding-live`, on by default), disabled while the general one is off. Stored in `localStorage`. Not in the bell's notifications dialog. The general switch is disabled with a reason when unsupported or blocked.
- Named "push" in the UI on purpose: today the app creates the notification itself (mock backend), but a push server will be added later.
- Only works in the production build: the service worker is disabled on the dev server.

## Declined or deferred

- Native app (Capacitor) for real Live Activities / ongoing notifications: deferred.
- Same notification for the sleep timer: deferred until sleep has a timer.

## File Map

- `src/app/core/push-notifications/push-notification.service.ts`: shared push notifications (permission, general and per-type switches, show/close by type, taps via `SwPush`).
- `src/app/core/push-notifications/push-notification-types.ts`: catalog of notification types shown in the side menu.
- `src/app/features/breastfeeding/breastfeeding-live-notification.service.ts`: running-feed notification content, buttons and actions.
- `src/app/features/breastfeeding/breastfeeding.service.ts`: `changes` stream (origin `app` | `notification`).
- `src/app/shell/notification-settings/notification-settings.ts`: `Notificaciones` block of the side menu (general + per-type switches).
- `src/app/pages/home/cards/breastfeeding-card/breastfeeding-dialog/breastfeeding-dialog.ts`: timer state, local edits and persistence.
- `src/app/pages/home/cards/breastfeeding-card/breastfeeding-dialog/breastfeeding-dialog.html`: view/edit controls.
- `src/app/features/breastfeeding/breastfeeding-timer.ts`: segment transitions and duration calculations.
