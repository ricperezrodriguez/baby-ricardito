# Vitamin D feature (`vitamin-d`)

Decision record of the vitamin D tracker and its "not given today" alert. Read it before touching any vitamin D code and update it in the same change whenever the user changes, confirms or discards a decision (see `AGENTS.md`).

- English identifier: `vitamin-d`. Creation modal route: `/vitamina-d`. History: `/detalle/vitamina-d`. Modal of a record: `/vitamina-d/:recordId` (over Home) and `/detalle/vitamina-d/:recordId` (over history, `returnTo`).
- Creation title: "Añadir vitamina D". Snackbar on creation: "Vitamina D guardada". History mode says "dosis" ("Detalle de la dosis", "¿Eliminar dosis?", "Dosis modificada", "Dosis eliminada").
- Status: implemented, `npm run build` passes. Not yet validated by the user in the browser.

## Approved decisions

### Data model

- A `VitaminDDose` is a single instant (no timer): `givenAt` (ISO, never in the future: 422 `GIVEN_AT_IN_FUTURE`), optional `drops` (integer 1 to 10, 400 `INVALID_DROPS`; `null` on update clears them), optional `notes` (max 500). No product/brand and no photo.
- Several doses per day are allowed (no server rule, no 409). The modal only shows a non-blocking hint.
- API segment `vitamin-d`; preferences endpoints `/preferences/vitamin-d-history` and `/preferences/vitamin-d-missed-alert`.

### Stats

- Per day: `doses`, `drops` (sum or `null`) and `status`: `given`, `missed`, `pending` (today without dose; future days of the range too) or `notStarted` (before the local day of the first dose ever).
- Totals: `doses`, `drops`, `daysGiven`, `daysMissed`, `daysInRange` (= given + missed), `adherencePercent` (`null` with 0 evaluated days), `currentStreakDays` (whole history, ending today or yesterday if today is pending), `longestStreakDays` (only within the requested range), `lastGivenAt`.
- `hourMap` counts doses per weekday (Monday = 0) and hour.

### Home card (`pages/home/cards/vitamin-d-card/`)

- Title "Hace X". Aside: "Dada hoy" (check icon) or "Pendiente hoy" (outlined icon), always icon + text.
- Secondary lines: "Hoy: N toma(s) · N gotas" (only when given today and stats loaded) and "Racha: N días seguidos" (hidden at 0). If only the stats fail, both lines are hidden.
- States through `app-async-state`. Reloads only on the `closed` event of the tracking card. Tapping the content opens the latest dose (`/vitamina-d/:recordId`).

### Creation modal (`vitamin-d-card/vitamin-d-dialog/`)

- Fields: date and time (`EditableTime`, starts at now, `max` = now), drops (`QuickValueField`, chips 1 to 4, label "Cantidad (gotas)"), notes (`RecordNotesField`, 500).
- Drops are prefilled with the latest dose's (baseline, so closing untouched is silent). Spinner "Cargando la dosis" until the lookup resolves.
- Non-blocking `role="status"` hint "Hoy ya se registró una dosis a las HH:mm." when the latest dose and the chosen `givenAt` are both today (hidden in history mode).
- Nothing is stored on open; close/cancel ask "¿Descartar cambios?" only when something changed. History mode: view, edit (one `PATCH`) and delete with confirmations.

### History page (`pages/vitamin-d-history/`)

- Title "Historial de vitamina D". Summary (7/30/90 days, default 7): Tomas, Días con toma ("6 de 7"), Cumplimiento, Días omitidos, Racha actual, Mejor racha, Gotas totales.
- Charts (all visible by default, hideable, in this order): "Calendario de tomas" (`app-day-calendar`), "Tomas por día", "Gotas por día" (notice "Sin gotas registradas" when none), "Mapa de horas".
- List grouped by day ("N tomas · N gotas"); rows with HH:mm, "Vitamina D", "N gotas" and a notes flag. Missed days are shown only in the calendar.

### "Not given today" alert on Home (`pages/home/vitamin-d-missed-alert/`)

- Shared `AlertBanner`: "Todavía no has registrado la vitamina D de hoy.", close button "Cerrar aviso de vitamina D".
- Rule: from the configured clock hour on (`localHour(now) >= thresholdHours`) with no dose on today's local day. It appears by itself when the hour is reached (60 s clock), without reloading. Hidden while loading, on failure or when disabled.
- Settings per baby in the backend, edited in the notifications modal (bell), section "Vitamina D": "Avisar si todavía no se ha registrado la vitamina D de hoy" + "Avisar a partir de". `thresholdHours` is the **clock hour** (12 to 22, shown as `HH:00`). Default: enabled, 18:00. It reuses `AlertSettingsSection` unchanged.
- Dismissal per device (`createAlertDismissal('vitamin-d-missed', ...)`): hidden for the rest of the local day (fingerprint `vitamin-d:<date>`). It reloads when the `vitamina-d` or `notificaciones` modal closes.
- The static "Vitamina D" example of the bell list was removed.

### Shared elements created or changed

- `shared/quick-value-field/` (`QuickValueField`: number field + quick-pick chips), extracted from `BottleDialog`, which now uses it. **Not exported from the barrel** on purpose: exporting it pulled Material Chips into the initial bundle (+80 kB, over the 1 MB budget); import it by path.
- `shared/history/day-calendar/` (`DayCalendar`, `app-day-calendar`, by path, no Chart.js) and the optional `calendars` branch of `HistoryPage`.
- `weekdayOfDay(dayKey)` in `shared/utils/time.utils.ts` (exported from the barrel, listed in the `time-utils` skill).
- `lineConfig` in `shared/history/chart-config.utils.ts` takes an optional `color`.

## Declined or deferred

- Product/brand and photo: not included.
- Pause of the treatment, time-of-day reminder, daily drops goal: deferred.
- Shared `RecordAside` for the card aside (the block is local and similar to bottle/diaper/breastfeeding) and a `pluralize` helper: deferred.
- Server rule of one dose per day: declined.

## Open points

- The seed gives a dose "60 minutes ago" (state "Dada hoy"). To review the "Pendiente hoy" state and the alert, delete today's dose or change the seed.
- The empty `notStarted` calendar cells have no text for screen readers (by design); the style review suggested adding the day label.
- The drops field shows the unit twice (label "Cantidad (gotas)" + suffix), as bottle does with ml.

## File map

- Data: `features/vitamin-d/` (`vitamin-d.models.ts`, `vitamin-d.labels.ts`, `vitamin-d.service.ts`).
- Mocks: `core/mocks/mock-backend.vitamin-d.{store,routes,validation,stats,seed}.ts`, `mock-backend.interceptor.ts`.
- Card: `pages/home/cards/vitamin-d-card/`. Modal: `pages/home/cards/vitamin-d-card/vitamin-d-dialog/`.
- History: `pages/vitamin-d-history/` (`vitamin-d-history.ts`, `vitamin-d-history-charts.ts`, `vitamin-d-history-list/`).
- Alert: `pages/home/vitamin-d-missed-alert/`; settings section in `shared/notifications-dialog/`.
- Routes: `app.routes.ts` (`vitamina-d`, `vitamina-d/:recordId`, `detalle/vitamina-d` before `detalle/:category`).
