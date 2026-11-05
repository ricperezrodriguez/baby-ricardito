# Bottle feature (`bottle`)

Decision record of the bottle tracker and of the combined feeding alert. Read it before touching any bottle or feeding-alert code and update it in the same change whenever the user changes, confirms or discards a decision (see `AGENTS.md`).

- English identifier: `bottle`. Creation modal route: `/biberon`. History: `/detalle/biberon`. Modal of a record: `/biberon/:recordId` (over Home) and `/detalle/biberon/:recordId` (over history, `returnTo`).
- User-facing copy says "biberón". Creation title: "Añadir toma de biberón". Snackbar: "Biberón guardado".
- Status: implemented, `npm run build` passes. Not yet validated by the user in the browser.

## Approved decisions

### Data model

- A `BottleFeed` is a single instant, not a span: `fedAt` (ISO, never in the future: 422 `FED_AT_IN_FUTURE`), `amountMl` (integer 1 to 500, 400 `INVALID_AMOUNT`), `milkType`, optional `notes` (max 500). No timer, no "in progress" state.
- `milkType` is `breast_milk` ("Leche materna"), `formula` ("Fórmula") or `mixed` ("Mixta"); required and exclusive. **Leche materna is preselected** in the creation modal. A mixed feed counts whole under "Mixta" in stats; there is no split, brand or preparation field.
- No photo (no `photoUrl`, no photo endpoints).
- The list endpoint accepts a repeatable `milkType` filter (API only; there is no filter UI).

### Stats

- Per day: feeds, total ml, average amount (rounded) and average interval (start to start from the previous feed, assigned to the later feed's day). Days without feeds are included with zeros. There are **no per-type ml per day**.
- Totals: feeds, total ml, ml per milk type, average daily ml (over all days of the range, zeros included), average feeds per day (1 decimal), average amount and average interval.
- `hourMap` counts feeds (not ml) per weekday (Monday = 0) and hour.

### Home card (`pages/home/cards/bottle-card/`)

- Title "Hace X". Aside: amount of the last feed and its milk type.
- Secondary lines: "Hoy: N tomas · X ml" and "Intervalo medio hoy: ..." (hidden with fewer than 2 feeds today). If only the stats fail, both lines are hidden and the rest stays.
- Not shown on purpose: exact time, per-type breakdown, notes. "Hoy" corrects on the next reload (no midnight rollover), like diaper.
- States through `app-async-state` ("Cargando la última toma", "Todavía no hay tomas de biberón registradas.", "No se pudo cargar la última toma."). Reloads only on the `closed` event of the tracking card.
- Tapping the content opens the latest feed in history mode (`/biberon/:recordId`).

### Creation modal (`bottle-card/bottle-dialog/`)

- Fields: milk type (`ChoiceGroup`), amount in ml (number input with quick-pick chips 60, 90, 120, 150, 180 ml), date and time (`EditableTime`, starts at now, `max` = now), notes (`RecordNotesField`, 500).
- **The amount is prefilled with the amount of the latest feed** (empty when there is none or the lookup fails). The prefill counts as the baseline, so closing untouched is silent. The modal shows the loading spinner until the lookup resolves, so nothing typed can be overwritten.
- Nothing is stored on open. "Guardar" is disabled until the form is valid and creates the record with one call. Close/cancel ask "¿Descartar cambios?" only when something changed.
- History mode: view, edit (one `PATCH` after "¿Modificar biberón?") and delete with confirmations.

### History page (`pages/bottle-history/`)

- Title "Historial de biberones". Summary (7/30/90 days, default 7), 8 cards: biberones, total, media diaria, cantidad media, intervalo medio, and ml of Leche materna, Fórmula and Mixta.
- Charts (all visible by default, hideable): feeds per day, ml per day (a single colour), average amount (line), average interval (line, hours), hour heatmap (feed count). **No milk type split doughnut and no per-type stacking** (the user asked to remove milk type from the charts, keeping the summary cards).
- List grouped by day ("N biberones · X ml"); rows with HH:mm, amount in bold, milk type text and a notes flag. No type filter.

### Combined feeding alert on Home

- `feeding-overdue-alert` (first alert on Home) uses the shared `AlertBanner`: "Han pasado X desde la última toma.", with a close button ("Cerrar aviso de toma"). `X` uses `formatDurationText` (e.g. "3 h 12 min").
- It takes into account **breastfeeding and bottle together**: time since the end of the last breastfeeding session (`endTime`) or the bottle `fedAt`, whichever is more recent. While a breastfeeding session is in progress it stays hidden. Without any feed it is not shown.
- Settings per baby in the backend (`/preferences/feeding-overdue-alert`), edited in the notifications modal (bell), section "Alimentación": "Avisar si pasa mucho tiempo desde la última toma (pecho o biberón)". Default: enabled, 3 h. Allowed thresholds: 1, 1.5, 2, 2.5, 3, 3.5, 4 h.
- Dismissal per device (`createAlertDismissal('feeding-overdue', ...)`): hidden for the rest of the local day or until a new feed changes the fingerprint (`breastfeeding:<id>` or `bottle:<id>`).
- It reloads when the `lactancia`, `biberon` or `notificaciones` modal closes.

### Shared elements created or changed

- `shared/choice-group/` (`ChoiceGroup`, `ChoiceOption`), moved from `DiaperDialog` and exported from the barrel. `DiaperDialog` now imports it from there.
- `shared/record-dialog/record-notes-field.ts` (`RecordNotesField`: notes field with counter), used by `DiaperDialog` and `BottleDialog`; the `field-group` SCSS mixin in `_record-dialog.scss`.
- `features/feeding/` (shared domain code of the combined alert: `FeedingService`, settings models, `getLastFeed`).
- The mock interceptor now takes its stores through a `MockStores` interface.

## Declined or deferred

- Photo of the feed: not included.
- Optional duration of the feed (`durationMinutes`): deferred.
- Filter of the history list by milk type: not included.
- Leftover (offered vs taken) and a daily ml goal: not included.
- Combining breastfeeding and bottle in the Home card (last feed, "Hoy", interval): not included; only the alert combines them.
- Milk type split chart and per-type stacking in the charts: removed on request.

## Open points

- Creation title was approved as "Añadir toma de biberón" (diaper uses "Añadir pañal").
- Quick-pick chip pressed twice keeps the amount (it does not clear it).
- The amount label "Cantidad (ml)" plus the "ml" suffix may be read twice by a screen reader.

## File map

- Data: `features/bottle/` (`bottle.models.ts`, `bottle.labels.ts`, `bottle.service.ts`), `features/feeding/` (`feeding.models.ts`, `feeding.service.ts`).
- Mocks: `core/mocks/mock-backend.bottle.{store,routes,validation,stats,seed}.ts`, `mock-backend.feeding.{store,routes,validation}.ts`, `mock-backend.interceptor.ts`.
- Card: `pages/home/cards/bottle-card/`. Modal: `pages/home/cards/bottle-card/bottle-dialog/`.
- History: `pages/bottle-history/` (`bottle-history.ts`, `bottle-history-charts.ts`, `bottle-history-list/`).
- Alert: `pages/home/feeding-overdue-alert/`; settings section in `shared/notifications-dialog/`.
- Routes: `app.routes.ts` (`biberon`, `biberon/:recordId`, `detalle/biberon` before `detalle/:category`).
