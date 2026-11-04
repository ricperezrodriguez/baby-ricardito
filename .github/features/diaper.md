# Diaper feature (`diaper`)

Decision record of the diaper tracker. Read it before touching any diaper code and update it in the same change whenever the user changes, confirms or discards a decision (see `AGENTS.md`).

- English identifier: `diaper`. Creation modal route: `/panal`. History: `/detalle/panal`. History row modal: `/detalle/panal/:changeId`.
- User-facing copy says "pañal" (not "cambio"): "Pañal guardado", "Detalle del pañal", "¿Eliminar pañal?". The types are "Pis", "Caca" and "Mixto".
- Status: implemented, `npm run build` passes. Not yet validated by the user in the browser.

## Approved decisions

### Data model

- A `DiaperChange` is a single instant, not a span: `changedAt` (ISO, never in the future: 422 `CHANGED_AT_IN_FUTURE`), `type`, `stoolColor`, `stoolConsistency`, `hasRash`, optional `notes` (max 500) and optional `photoUrl`.
- `type` is `wet` (Pis), `dirty` (Caca) or `both` (Mixto). They are exclusive and have no default in the creation modal.
- `stoolColor` (yellow, green, brown, black, red, white) and `stoolConsistency` (liquid, soft, mucous = "con moco", firm) are optional and only valid for `dirty` and `both`. The backend rejects them with `wet` (422 `STOOL_DETAILS_NOT_ALLOWED`) and never clears them silently: the client sends explicit `null` when the type changes to `wet`.
- `hasRash` is a boolean, labelled "Irritación en la piel". No severity.
- Photo is included (same 5 MB limit and `PUT`/`DELETE .../photo` endpoints as breastfeeding).
- A "poop" is a change of type `dirty` or `both`; this is what "last poop" means everywhere.

### Stats

- Every change counts (there is no state). Per day, `wet`, `dirty` and `both` are exclusive buckets (`wet + dirty + both = changes`), with zeros for days without changes.
- The interval is start to start from the previous change, assigned to the later change's day.
- `averageChangesPerDay` has 1 decimal and is `null` when the range has no changes.
- `totals.stoolColors` counts stool changes per colour plus `unspecified` for stool changes without colour.
- `hourMap` is changes per weekday (Monday = 0) and hour.
- **Inclusive counts are derived on the client**: "Con pis" = wet + both, "Con caca" = dirty + both, "Mixtos" = both. Their sum can exceed the total. Charts always use the exclusive buckets so nothing is counted twice.

### Home card (`pages/home/cards/diaper-card/`)

- Title is the elapsed time since the last change ("Hace X"), with its type icon and label on the side.
- Secondary lines: "Hoy: N cambios" (device time zone; no midnight rollover, it corrects on the next reload) and the time since the last poop, or "Sin cacas registradas".
- Not shown on purpose: exact time, today's breakdown, rash badge, average interval.
- States through `app-async-state`: loading, empty ("Todavía no hay cambios de pañal registrados."), error ("No se pudo cargar el último pañal."). If only the stats fail, the rest of the card stays. It reloads only on the `closed` event of the tracking card.
- The breastfeeding card was migrated to the same shared elements and now also shows its error message.

### Creation modal (`diaper-card/diaper-dialog/`)

- Type is a group of exclusive icon buttons (radiogroup with text). Colour uses coloured swatches and consistency uses icons; both always carry a visible text label and appear only for Caca or Mixto, each with "Sin indicar" (`null`).
- "Irritación en la piel" toggle, "Fecha y hora" (`EditableTime`, starts at now, editable, `max` = now), notes with a counter (500) and an optional photo.
- Nothing is stored on open. "Guardar" is disabled until a type is chosen and creates the record with one call (then uploads the photo). If the photo upload fails, the next "Guardar" updates the already created record instead of duplicating it.
- X, backdrop, Escape and "Cancelar" close silently unless something was entered, in which case they ask "¿Descartar cambios?".
- History mode (`:changeId`): view, edit (one `PATCH` after "¿Modificar pañal?") and delete with confirmations.
- Creation title is "Añadir pañal" (chosen by the agent, not explicitly approved).

### History page (`pages/diaper-history/`)

- Summary (7/30/90 days, default 7): changes, average per day, average interval, "Con pis", "Con caca", "Mixtos", "Con rojeces".
- Charts (all visible by default, hideable): changes per day (stacked Pis/Caca/Mixto), type split (doughnut), average interval (line, hours), stool colours (horizontal bars with the real colour, a text label and a "Sin indicar" bar), hour heatmap. No consistency or rash charts.
- List: grouped by day ("N cambios · X con pis · Y con caca"), rows with HH:mm, type, stool colour and consistency, "Rojeces" badge, notes and photo flags. No "en curso" state.

### Poop alert on Home

- `diaper-poop-alert` (above the cards, only on Home) uses the shared `AlertBanner`: "Han pasado X sin hacer caca.", with a close button.
- Shown only when enabled, a poop exists, and the elapsed time reaches the threshold. Without any poop registered it is not shown.
- Default: enabled, 48 h. Allowed thresholds 12, 24, 36, 48, 72 h, labelled "12 h", "24 h", "36 h", "2 días", "3 días" in the notifications modal (bell), "Pañal" section, saved per baby through `/preferences/diaper-poop-alert`.
- Dismissal is kept per device (`localStorage` through `createAlertDismissal`): hidden for the rest of that local day, or until a new poop is registered.
- It reloads by itself when the `panal` or `notificaciones` modal closes.
- The text uses `formatElapsedHoursOrDays`: hours up to 47 h and whole days from 48 h, so the default alert reads "2 días". The user asked for this cutoff (it was 72 h before); the sleep alerts share the helper and are unaffected because their thresholds are 2-6 h.

### Shared elements created for this feature

- `shared/history/` (`HistoryChart`, `HourHeatmap` with `color`/`caption`/`unit` inputs, `createHiddenCharts`, chart helpers, `HistoryPage` layout and `createHistoryStats`). Imported by path, never from the `@shared` barrel (Chart.js). The "Sin heces registradas" text of the stool chart is a `notices` entry of `HistoryPageContent`.
- `shared/record-dialog/` (`RecordDialogController`, `createRecordTexts`, `RecordPhoto`, `RecordPhotoField`, SCSS mixins). `BreastfeedingDialog` was migrated to it.
- `shared/last-record-summary/`, `shared/latest-record/`, `shared/async-state/` for the card states. `BreastfeedingCard` was migrated.
- `shared/diaper-type-icon/` (`app-diaper-type-icon`), used by the card, the dialog and the history list.
- `shared/utils/local-storage.ts`, `formatElapsedHoursOrDays` in `time.utils.ts`.
- `features/shared/tracker.models.ts` (`Page`, `PageRequest`, `StatsRequest`, `HourMap`, photo limits).
- Mock helpers shared in `core/mocks/` (`mock-backend.routing|parsing|time|photos|seed-utils.ts`).
- `BreastfeedingService` and `DiaperService` use `@Service`.

## Declined or deferred

- One-tap quick add of Pis/Caca/Mixto from the card: not included (it breaks the route-driven modal pattern).
- Pediatrician hints for red, black or white stool: not included (medical content).
- Filter of the history list by type: not included.
- Rash-per-day chart, changes per part of the day chart, consistency chart: not included.
- Export for the pediatrician: not included.
- Exact time, today's breakdown and rash badge on the card: not included.
- Midnight rollover of "Hoy" on the card: declined.
- Silent clearing of stool fields by the backend: declined.

## Open points

- The initial bundle is over budget (686 kB vs 500 kB at the time); the diaper mock backend ships in the main bundle.
- The Material Symbols names of the consistency icons (`water`, `cloud`, `bubble_chart`, `square`) were not checked in the browser.
- The notifications modal disables the threshold select while the toggle is off (added by the agent, not an explicit decision).
- Confirm the breastfeeding flows (create, view, edit, delete, discard) and `/detalle/pecho` visually after the refactors.
- Pending: confirm the poop alert keeps `role="status"` working for screen readers when it appears (the container is created with the `@if`).

## Map

- Data: `features/diaper/` (`diaper.models.ts`, `diaper.service.ts`, `diaper.labels.ts`).
- Mocks: `core/mocks/mock-backend.diaper.*.ts`, wired in `mock-backend.interceptor.ts`. Seed: about 60 days, deterministic, with a recent poop so the alert does not fire by default.
- Endpoints: `/babies/:babyId/diaper/changes` (list, create, read, update, delete, `/photo`), `/diaper/stats`, `/preferences/diaper-history`, `/preferences/diaper-poop-alert`.
- UI: `pages/home/cards/diaper-card/` (card and `diaper-dialog/`), `pages/diaper-history/`, `pages/home/diaper-poop-alert/`, `shared/notifications-dialog/`, `shared/diaper-type-icon/`.
