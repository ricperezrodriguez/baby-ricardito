# Bath feature (`bath`)

Decision record of the bath tracker and its "overdue" alert. Read it before touching any bath code and update it in the same change whenever the user changes, confirms or discards a decision (see `AGENTS.md`).

- English identifier: `bath`. Creation modal route: `/bano`. History: `/detalle/bano`. Modal of a record: `/bano/:recordId` (over Home) and `/detalle/bano/:recordId` (over history, `returnTo`).
- Creation title: "Añadir baño". Snackbars: "Baño guardado", "Baño modificado", "Baño eliminado".
- Status: implemented, `npm run build` passes. Not yet validated by the user in the browser.

## Approved decisions

### Data model

- A `Bath` is a single instant (no timer, no duration, no kind, no photo): `bathedAt` (ISO, never in the future: 422 `BATHED_AT_IN_FUTURE`), `hairWashed` (boolean, required on create, 400 `INVALID_HAIR_WASHED`), optional `notes` (max 500, `''`/`null` in a PATCH clears them).
- Several baths per day are allowed (no 409). The modal only shows a non-blocking hint.
- Optional `reaction` (`BATH_REACTIONS`: `happy` / `neutral` / `sad`, 400 `INVALID_REACTION`); `null` in a PATCH clears it. Stats ignore it. Accessible labels "Contento" / "Neutro" / "Triste" (`formatBathReaction`), icons in `BATH_REACTION_ICONS`, shown with the shared `BathReactionIcon` (`features/bath/bath-reaction-icon.ts`, icon only, coloured green / muted / coral). Seed: latest bath happy, about 1 in 6 older baths without reaction (own random sequence, other seeded fields unchanged).
- API segment `bath`, collection `baths`; preferences endpoints `/preferences/bath-history` and `/preferences/bath-overdue-alert`.

### Stats

- Per day: `baths`, `hairWashes` (every local day of the range, zeros included).
- Intervals: whole local days between consecutive baths, assigned to the later bath's date; the first bath of the range is measured against the previous one even outside the range; two baths on the same day produce no interval.
- Totals: `baths`, `daysWithBath`, `daysInRange`, `hairWashes`, `averageIntervalDays` (one decimal), `longestIntervalDays`, `lastBathAt`, `lastHairWashAt` (the last two from the whole history). No `hourMap`.

### Home card (`pages/home/cards/bath-card/`)

- Title "Baño", placeholder SVG kept (stroke 1.6). Summary title "Hace X" since the latest bath.
- Aside: `shower` icon + "Con pelo" / "Sin pelo" of the latest bath (icon muted when not washed; the text carries the meaning).
- Secondary lines: "‹día› · HH:mm" of the latest bath, "Pelo · Hace X" ("Pelo · Sin registros" when never), "Media: cada N d" (stats of the last 30 days, hidden when `null`). If only the stats fail, the last two lines are hidden.
- States through `app-async-state`. Reloads only on the `closed` event. Tapping the content opens the latest bath.

### Creation modal (`bath-card/bath-dialog/`)

- Section "Datos del baño". Fields: date and time (`EditableTime`, starts now, `max` = now), "Lavado de pelo" icon toggle (`shower`, `aria-pressed`, **unchecked by default**, part of the baseline), notes (`RecordNotesField`, 500).
- Non-blocking `RecordTodayHint` "Hoy ya se registró un baño a las HH:mm." (creation only).
- Nothing is stored on open; one `POST` on save. History mode: view ("Lavado de pelo: Sí/No"), edit (one `PATCH`) and delete with confirmations.

### History page (`pages/bath-history/`)

- Title "Historial de baños". Periods 30 / 90 / 180 days, default 30. No hour map.
- Summary: Baños, Días con baño ("N de M"), Lavados de pelo, Intervalo medio, Intervalo más largo, Último baño, Último lavado de pelo.
- Charts (all visible by default, hideable, in this order): "Calendario de baños" (`app-day-calendar`), "Días entre baños" (bars), "Con / sin lavado de pelo" (donut).
- List grouped by day ("N baños"); rows with HH:mm, "Baño", `shower` icon + "Con pelo" when washed, and a notes flag.

### "Overdue" alert on Home (`pages/home/bath-overdue-alert/`)

- Shared `AlertBanner`: "Han pasado N días desde el último baño.", close button "Cerrar aviso de baño".
- Rule: enabled and whole local days since the latest bath >= `thresholdDays`. Not shown without any bath. 60 s clock. Hidden while loading, on failure or when disabled.
- Settings per baby in the backend, section "Baño" of the notifications modal. Thresholds 2 / 3 / 4 / 7 days, default enabled, 3.
- Dismissal per device (`createAlertDismissal('bath-overdue', ...)`), rest of the local day. Reloads when the `bano` or `notificaciones` modal closes.

### Shared elements created or changed (approved "do everything")

- Mocks: `wholeDaysBetween`, `averageDays`, `DayInterval` and `listDayIntervals` in `core/mocks/mock-backend.time.ts`; `parseDaysThresholdBody` in `mock-backend.parsing.ts`. Nail trimming migrated to them.
- `RecordTodayHint` + `createTodayRecordHint` (`shared/record-dialog/record-today-hint.ts`): used by bath, vitamin D and nail trimming.
- `RecordDeleteButton` (`shared/record-dialog/record-delete-button.ts`): used by every record dialog; the `delete-button` SCSS mixin was removed.
- All exported from `shared/index.ts`.

## Declined or deferred

- Bath kind (full / sponge), duration, photo, water temperature, products: not included (the baby's reaction was later approved, see Data model).
- A second "overdue" alert for hair washing: not included.
- "Últimos 7 días · N baños" card line: not included.
- Calendar distinguishing days with/without hair wash: not included.

## Open points

- Not validated in the browser yet.
- Wording of the hair state differs: card/list "Con pelo"/"Sin pelo", modal "Lavado de pelo: Sí/No", chart "Con/Sin lavado de pelo".
- `formatBathIntervalDays` duplicates the private interval formatter of the nail-trimming history page; the card has its own short "N d" formatter.
- The aside layout (`.hair-status`) repeats the vitamin D / nail trimming aside CSS (a shared aside mixin was proposed, not agreed).
- The toggle icon uses Material's button icon size, smaller than `app-choice-group` icons.
- Chart colors are copied from the diaper palette.
- Seed: latest bath yesterday, so the alert is not visible by default (3 days).

## File map

- Data: `features/bath/` (`bath.models.ts`, `bath.labels.ts`, `bath.service.ts`).
- Mocks: `core/mocks/mock-backend.bath.{store,routes,validation,stats,seed}.ts`, `mock-backend.interceptor.ts`.
- Card: `pages/home/cards/bath-card/`. Modal: `pages/home/cards/bath-card/bath-dialog/`.
- History: `pages/bath-history/` (`bath-history.ts`, `bath-history-charts.ts`, `bath-history-list/`).
- Alert: `pages/home/bath-overdue-alert/`; settings section in `shared/notifications-dialog/`.
- Routes: `app.routes.ts` (`bano`, `bano/:recordId`, `detalle/bano` before `detalle/:category`).
