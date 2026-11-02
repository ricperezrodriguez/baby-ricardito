---
applyTo: "src/app/pages/*-history/**,src/app/shared/in-view/**,src/app/features/**,src/app/core/mocks/**,src/app/app.routes.ts"
---

# History page ("Ver historial")

Every tracking card has a "Ver historial" link that opens a detail page with the whole history of that tracker. The reference implementation is the breastfeeding one: route `/detalle/pecho`, code in `src/app/pages/breastfeeding-history/` (`BreastfeedingHistory`). Other trackers (bottle, diaper, sleep, and any future card) must reproduce the same behavior in their own `detalle/<category>` page (`src/app/pages/<tracker>-history/`), replacing the `PendingHistory` placeholder (`detalle/:category`). Keep the specific `detalle/<category>` route declared **before** the `detalle/:category` fallback in `src/app/app.routes.ts`.

The modal that opens from a row is described in `.github/instructions/dialogs-feedback.instructions.md`.

## Page structure (top to bottom)

1. **Header:** back link to Home ("Inicio"), `h1` ("Historial de lactancia") and a period selector (`mat-button-toggle-group`: 7 / 30 / 90 days, **7 by default**).
2. **Summary** (`dl`): number of feeds, total time, average duration, average interval for the selected period. `—` when there is no data.
3. **Charts** section: title, a `mat-chip-listbox` (multiple) with one chip per chart (selected = visible), and the grid of chart cards.
4. **Feeds** section: the list grouped by day with infinite scroll.
5. `<router-outlet />` for the record modal (child route `:sessionId`).

All visible copy is in Spanish. Design tokens come from `src/styles.scss` (`--app-*`); chart colors in `history-charts.ts` mirror them (left `#99620d`, right `#285c8c`, lines `#155f56`). Layout must work from 360 px wide with no horizontal scroll.

## Charts

All six charts are shown by default; each can be hidden individually.

| Id (`HISTORY_CHART_IDS`) | Title | Type |
|---|---|---|
| `feedsPerDay` | Tomas por día | Bar |
| `minutesPerDay` | Minutos totales por día | Stacked bar (left / right, in minutes) |
| `breastSplit` | Reparto izquierdo / derecho | Doughnut (tooltip: time and percentage) |
| `averageDuration` | Duración media por toma | Line (minutes, gaps for days without feeds) |
| `averageInterval` | Intervalo medio entre tomas | Line (hours, gaps for days without feeds) |
| `hourMap` | Mapa de horas del día | Heatmap (own HTML table, full width) |

- **Library:** Chart.js used directly (no wrapper). Register only the controllers/elements/scales that are used, in `history-chart.ts`. The module has side effects, so it must stay inside the lazy page and **never** be exported from the `@shared` barrel (it would end up in the initial bundle).
- **Wrapper:** `app-history-chart` receives a `ChartConfiguration` and a caption; it creates the chart once and updates `data`/`options` afterwards, and destroys it on destroy. Chart configurations are pure functions in `history-charts.ts` (animations off, `maintainAspectRatio: false`). Day labels use `formatDayLabel`.
- **Heatmap:** `app-feed-heatmap` is a real `<table>` (rows = weekdays Monday to Sunday, columns = hours 0-23), cell intensity = `color-mix` of the card color proportional to the feeds started in that slot. It has no Chart.js dependency.
- **Accessibility:** the canvas is `aria-hidden`; the same data is exposed as a visually hidden table (`.visually-hidden` is a global class in `styles.scss`). The heatmap cells carry the count as hidden text and a `title`. Nothing may rely on color alone (legends, labels, tooltips).
- **Hide / show:** each card has an icon button (`Ocultar <title>`), and the chips bring the chart back. If every chart is hidden show an explanatory message; if the period has no feeds show "No hay tomas registradas en este periodo." instead of empty charts.
- **No flicker:** keep the last received stats (`linkedSignal`) while newer ones load, so the charts are not destroyed on reload.

## Hidden-charts preference (stored in the backend)

Which charts are hidden is saved **per baby in the backend**, not in local storage.

- `GET /babies/:babyId/preferences/breastfeeding-history` returns `{ hiddenCharts: HistoryChartId[] }` (empty by default).
- `PUT` the same path with the same body replaces it; an unknown chart id is a `400 INVALID_PREFERENCES`.
- The page updates the UI optimistically and rolls back if the request fails. The HTTP error interceptor already shows the error snackbar, so do not add another one.
- Show the chips only after the preference has loaded, so they do not flash the wrong state.

## Stats endpoint (aggregated by the backend)

The charts cannot depend on the paginated list, so the backend aggregates the data: `GET /babies/:babyId/breastfeeding/stats?from=yyyy-MM-dd&to=yyyy-MM-dd&tz=<IANA zone>`.

- `from`/`to` are local days, inclusive; the front computes them with `localDateRange(now, days)` and sends `localTimeZone()`. The backend uses `tz` to split feeds into days and hours. Max 366 days; invalid input is a `400`.
- Only **finished** feeds count.
- Response (`BreastfeedingStats`): `days` (one entry per local day of the range, zeros included: `feeds`, `totalSeconds`, `leftSeconds`, `rightSeconds`, `averageDurationSeconds`, `averageIntervalSeconds`), `totals` (same fields for the whole range) and `hourMap` (`number[7][24]`, feeds started per weekday, **Monday = 0**, and hour).
- Averages are `null` when there is no data. The interval is measured start-to-start against the previous feed, even if it was on the previous day, and is assigned to the day of the later feed.
- The mock implementation is `src/app/core/mocks/mock-backend.stats.ts` (routing in `mock-backend.interceptor.ts`, state in `mock-backend.store.ts`). The mock seed generates ~60 days of feeds so the charts have content; keep it deterministic.
- Reload the stats (and the list) when the record modal closes (see "Refresh").

## Feed list

- **Grouping:** by local day (`localDateKey`), newest first, in a `section` with an `h3` heading and a `ul`. The day heading is **sticky**, reads `Hoy`, `Ayer` or `Sábado, 31 de octubre` (`formatDayHeading`) and shows `N tomas · <total time>` (`formatDurationText`).
- **Day totals** of the last loaded day are hidden while more pages remain, because that day may continue in the next page.
- **Row:** a full-width link with start - end time (`HH:mm`), total duration, the time per side (`I` left / `D` right, only the sides actually used, with hidden full text for screen readers) and small icons when the feed has notes or a photo. A feed in progress shows "En curso" and links to the creation route (`/lactancia`); a finished one links to `['/detalle/pecho', id]`, which opens the record modal. Rows must be keyboard-focusable with a visible focus outline.
- **Infinite scroll:** pages of 20 through `getPage(limit, offset)`. A sentinel element with the shared `InView` directive (`IntersectionObserver`, 300 px margin) loads the next page. The sentinel is rendered only when `hasMore && !loadingMore && !moreFailed`, so that after each load it is re-created and fires again if it is still visible.
- **States:** spinner while loading the first page, "Reintentar" on first-page error, empty message "Todavía no hay tomas registradas.", spinner while loading more, and a "Reintentar" button if loading a later page fails (automatic loading stops until the user retries).
- **Refresh:** when the modal closes, the list reloads in a single request with `limit = max(20, loaded count)` and `offset = 0`, so the user keeps the scroll position and the loaded rows.

## Refresh

`DialogRouteHost` emits `DialogRouteEvents.notifyClosed(':sessionId')` when the record modal closes (saved, deleted or just closed). Both the page (stats) and the list subscribe to that path with `takeUntilDestroyed`. Do not refresh by other means. The card on Home refreshes by itself when Home is shown again.

## Rules for the code

- Time logic only through `@shared` helpers (`localDateRange`, `localDateKey`, `localTimeZone`, `formatDayHeading`, `formatDayLabel`, `formatDurationText`, `parseTimestamp`, ...); load the `time-utils` skill first. Use `createClock(60_000)` for "now" in this page: a one-second tick is not needed and would recompute the groups constantly. A computed that feeds a resource must be stable (`equal` on `from`/`to`) so the tick does not refetch.
- State with signals; data with `rxResource` (`params`/`stream`); `linkedSignal` for state derived from a resource.
- Keep component styles under the `anyComponentStyle` budget (4 kB warning / 8 kB error): split into small components (`feed-history-list`, `feed-heatmap`, `history-chart`) instead of growing one stylesheet.
- Build with `npm run build` and watch the initial bundle budget (500 kB warning): everything heavy (Chart.js, chips, button toggle) must stay in the lazy page chunk.

## Adding the history page for another tracker

1. Add the models and service calls for its stats and preferences (same contract, different path segment and charts) and the mock implementation.
2. Create `src/app/pages/<tracker>-history/` (English name, e.g. `bottle-history`) reusing `InView`, `app-history-chart`-style wrapper and the heatmap where it applies; extract them to a shared lazy location when a second tracker needs them (never through the `@shared` barrel if they import Chart.js).
3. Declare `detalle/<category>` with its `:sessionId` child route (see the modal file) before `detalle/:category`.
4. Point the card's `link` to that route.
