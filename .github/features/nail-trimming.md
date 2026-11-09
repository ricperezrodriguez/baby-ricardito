# Nail trimming feature (`nail-trimming`)

Decision record of the nail trimming tracker and its "overdue" alert. Read it before touching any nail trimming code and update it in the same change whenever the user changes, confirms or discards a decision (see `AGENTS.md`).

- English identifier: `nail-trimming`. Creation modal route: `/cortar-unas`. History: `/detalle/cortar-unas`. Modal of a record: `/cortar-unas/:recordId` (over Home) and `/detalle/cortar-unas/:recordId` (over history, `returnTo`).
- Creation title: "Añadir corte de uñas". Snackbar on creation: "Corte de uñas guardado". History mode says "corte" ("Detalle del corte", "¿Eliminar corte?", "Corte modificado", "Corte eliminado").
- Status: implemented, `npm run build` passes. Not yet validated by the user in the browser.

## Approved decisions

### Data model

- A `NailTrim` is a single instant (no timer): `trimmedAt` (ISO, never in the future: 422 `TRIMMED_AT_IN_FUTURE`), `areas` (non-empty list of `hands` / `feet`, no duplicates, 400 `INVALID_AREAS`; a PATCH replaces the whole list), optional `notes` (max 500). No photo.
- Several trims per day are allowed (no 409). The modal only shows a non-blocking hint.
- API segment `nail-trimming`, collection `trims`; preferences endpoints `/preferences/nail-trimming-history` and `/preferences/nail-trimming-overdue-alert`.

### Stats

- Intervals are measured **per zone**: between consecutive trims of the same zone; a "hands and feet" trim counts for both. Whole local days, assigned to the date of the most recent trim; the first trim of the range is measured against the previous one even outside the range; two trims of the same zone on the same day produce no interval.
- Per day: `trims`, `hands`, `feet` (both-trims count in each).
- Totals: `trims`, exclusive buckets `handsOnly` / `feetOnly` / `both` (sum = `trims`), `averageHandsIntervalDays`, `averageFeetIntervalDays`, `longestIntervalDays`, `lastHandsAt`, `lastFeetAt` (whole history, not the range). No `hourMap` (an hour-of-day map adds nothing for such a rare event).

### Home card (`pages/home/cards/nail-trimming-card/`)

- Title "Corte de uñas" (was "Cortar uñas"). Summary title "Hace X" since the latest trim. Aside: `back_hand` / `footprint` icons (both for "hands and feet") + text of the latest trim's zones.
- Secondary lines, always both: "Manos · Hace N d" and "Pies · Hace N d" ("Sin registros" when none), from the whole history. If only the stats fail, both lines are hidden.
- States through `app-async-state`. Reloads only on the `closed` event. Tapping the content opens the latest trim.

### Creation modal (`nail-trimming-card/nail-trimming-dialog/`)

- Fields: date and time (`EditableTime`, starts now, `max` = now), zones (`ChoiceGroup` in `multiple` mode: two checkable options "Manos" and "Pies", icon + text, at least one required so Guardar is disabled with none), notes (`RecordNotesField`, 500).
- "Manos" is preselected and part of the baseline, so closing an untouched modal is silent.
- Non-blocking `role="status"` hint "Hoy ya se registró un corte de uñas a las HH:mm." when the latest trim and the chosen `trimmedAt` are both today (loaded in background, creation only).
- Nothing is stored on open; one `POST` on save. History mode: view, edit (one `PATCH`) and delete with confirmations.

### History page (`pages/nail-trimming-history/`)

- Title "Historial de corte de uñas". Periods 30 / 90 / 180 days, default 30 (new optional `periodOptions` in `createHistoryStats`).
- Summary: Cortes, Intervalo medio de manos, Intervalo medio de pies, Intervalo más largo, Últimas manos, Últimos pies (short dates).
- Charts (all visible by default, hideable, in this order): "Calendario de cortes" (`app-day-calendar`), "Días entre cortes" (grouped bars Manos/Pies), "Reparto manos / pies" (donut: solo manos / solo pies / manos y pies). No hour map.
- List grouped by day ("N cortes"); rows with HH:mm, zones and a notes flag.

### "Overdue" alert on Home (`pages/home/nail-trimming-overdue-alert/`)

- Shared `AlertBanner`: "Han pasado N días desde el último corte de uñas.", close button "Cerrar aviso de corte de uñas".
- Rule: enabled and whole local days since the latest trim (any zone) >= `thresholdDays`. Not shown without any trim. Appears by itself when the threshold is crossed (60 s clock). Hidden while loading, on failure or when disabled.
- Settings per baby in the backend, edited in the notifications modal, section "Corte de uñas". Thresholds 5 / 7 / 10 / 14 days, default enabled, 7. The static "Corte de uñas" example of the bell list was removed.
- Dismissal per device (`createAlertDismissal('nail-trimming-overdue', ...)`): hidden for the rest of the local day. It reloads when the `cortar-unas` or `notificaciones` modal closes.

### Shared elements created or changed

- `localDaysBetween(from, to)` in `shared/utils/time.utils.ts` (exported from the barrel, listed in the `time-utils` skill).
- `periodOptions` (optional) in `shared/history/history-stats.ts`.
- `HistoryPage`: `hourMap` (content) and `heatmap` (input) are optional, so a page can omit the hour map.
- `ChoiceGroup`: optional `multiple` input and `values` model (checkboxes, `role="group"`); exclusive radio behavior unchanged.
- `DayCalendar`: new `empty` state (day number only) and optional `texts` input (given label, legend); defaults keep vitamin D unchanged.
- `AlertSettingsSection` reused unchanged: the notifications dialog maps `thresholdDays` to its `thresholdHours` field (see open points).

## Declined or deferred

- Refactors of duplicated code between dialogs/stores (save/close methods, delete button, "already today" hint), a shared `RecordAside`: deferred.
- Photo, injury/bleeding flag, tool used, per-zone alert thresholds, average interval line on the card: not included.

## Open points

- Not validated in the browser yet (calendar, charts, card aside icons).
- `AlertSettingsSection` speaks `thresholdHours`; nail trimming thresholds are days, mapped with a `map` and a cast in `NotificationsDialog`. Generalizing the section contract would affect every alert and needs agreement.
- Chart colors are copied from the diaper history palette (not exported there).
- Two trims of the same zone on the same day draw two bars with the same date label in "Días entre cortes".

## File map

- Data: `features/nail-trimming/` (`nail-trimming.models.ts`, `nail-trimming.labels.ts`, `nail-trimming.service.ts`).
- Mocks: `core/mocks/mock-backend.nail-trimming.{store,routes,validation,stats,seed}.ts`, `mock-backend.interceptor.ts`. Seed: latest trim 7 days ago (hands, 17:00), so the alert shows with the default threshold.
- Card: `pages/home/cards/nail-trimming-card/`. Modal: `pages/home/cards/nail-trimming-card/nail-trimming-dialog/`.
- History: `pages/nail-trimming-history/` (`nail-trimming-history.ts`, `nail-trimming-history-charts.ts`, `nail-trimming-history-list/`).
- Alert: `pages/home/nail-trimming-overdue-alert/`; settings section in `shared/notifications-dialog/`.
- Routes: `app.routes.ts` (`cortar-unas`, `cortar-unas/:recordId`, `detalle/cortar-unas` before `detalle/:category`).
