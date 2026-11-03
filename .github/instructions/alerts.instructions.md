---
applyTo: "src/app/pages/home/**,src/app/shared/alerts/**"
---

# Home alerts

Dismissible notices shown at the top of Home when something needs the user's attention (e.g. `Han pasado 26 h sin hacer caca.`). Reference: `src/app/pages/home/diaper-poop-alert/`. Every new alert (bottle, sleep, vitamin D, ...) reuses the shared pieces below; never copy the markup, styles or `localStorage` code of an existing alert.

## Shared pieces (`@shared`, folder `src/app/shared/alerts/`)

| Piece | Responsibility |
|---|---|
| `AlertBanner` (`app-alert-banner`) | Presentation only: card with icon, message and close button. Inputs: `message`, `dismissLabel` (accessible name of the close button, Spanish, e.g. `Cerrar aviso de caca`), optional `icon` (default `warning`) and `tone` (`warning` asks the user to act, `info` just informs); output `dismissed`. It has `role="status"` and no logic. |
| `createAlertDismissal(alertId, babyId)` | Remembers the dismissal in `localStorage` (per device, best effort, key `alert-dismissal:<alertId>:<babyId>`). `isDismissed(fingerprint, today)` is reactive (usable inside `computed`) and `dismiss(fingerprint, today)` stores it. |

A dismissed alert stays hidden for that **local day** and that **fingerprint**: when the fact that triggers the alert changes (a new poop, a new feed), the fingerprint changes and the alert can appear again the same day.

## An alert is a small component with its own rule

The component under `pages/home/<feature>-<name>-alert/` owns everything specific and nothing else:

1. **Data:** load what it needs with `createLatestRecord` (it reloads when the modals that can change it close, through `DialogRouteEvents.closed$` and a `REFRESH_ROUTES` list).
2. **Rule:** a `computed<{ message: string; fingerprint: string } | null>` that returns `null` while the alert must stay hidden (not loaded, disabled, below the threshold, dismissed). Time through `@shared` helpers (`formatElapsedHoursOrDays`, `localDateKey`, `parseTimestamp`, `createClock`); load the `time-utils` skill first.
3. **Dismissal:** `createAlertDismissal('<feature>-<name>', CURRENT_BABY_ID)` (the id is English, kebab-case: `diaper-poop`, `bottle-overdue`); `isDismissed` inside the rule and `dismiss` from `(dismissed)`, passing `localDateKey(clock.refresh())`.
4. **Template:** `@if (alert(); as current) { <app-alert-banner [message]="current.message" dismissLabel="..." (dismissed)="dismiss(current)" /> }`.

Then add it to `home.html` (the orchestrator edits Home). The alert has no loading or error UI: while it loads or fails it stays hidden (this is one of the exceptions in `loading-states.instructions.md`).

## Rules

- Copy is Spanish, short and neutral; no blame, no alarmist wording. Identifiers are English.
- The user can always dismiss it, and dismissing does not need a confirmation (it is reversible by nature: it comes back the next day or with a new fact).
- Alert settings (enabled, threshold) that the user can change are stored in the **backend**, like the diaper ones (`getPoopAlertSettings`), and edited in the notifications modal. Only the dismissal is local.
- Do not show a snackbar when dismissing or when the alert appears.
- Several alerts are stacked in the order they appear in `home.html`. If there are ever many, propose a common container with ordering and a visible limit to the user instead of growing `home.html`.
