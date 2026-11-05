---
applyTo: 'src/app/pages/*-history/**,src/app/shared/history/**,src/app/shared/in-view/**,src/app/features/**,src/app/core/mocks/**,src/app/app.routes.ts'
---

# History page ("Ver historial")

Every tracking card has a "Ver historial" link that opens a detail page with the whole history of that tracker. The reference implementation is the breastfeeding one: route `/detalle/pecho`, code in `src/app/pages/breastfeeding-history/` (`BreastfeedingHistory`). Other trackers (bottle, diaper, sleep, and any future card) must reproduce the same behavior in their own `detalle/<category>` page (`src/app/pages/<tracker>-history/`), replacing the `PendingHistory` placeholder (`detalle/:category`). Keep the specific `detalle/<category>` route declared **before** the `detalle/:category` fallback in `src/app/app.routes.ts`.

The modal that opens from a row is described in `.github/instructions/dialogs-feedback.instructions.md`.

## Shared page pieces

The layout and the stats state are common to every tracker; a tracker page (`pages/<tracker>-history/<tracker>-history.ts`, inline template) only provides what is specific. **Never copy the markup, styles or stats logic into a tracker page.**

| Piece                                                                        | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createHistoryStats<Stats, Id>(options)` (`shared/history/history-stats.ts`) | Data side. Options: `chartIds`, `getStats(request)` (service call with the baby bound), `getPreferences`, `savePreferences` and `dialogRoute` (the `:recordId` path, `RECORD_DIALOG_ROUTE` from `@shared`, whose modal closing reloads the stats). Returns period state, `shownStats` (last stats kept while reloading), `status`, hidden/visible charts, `preferencesReady`, `selectPeriod`, `setChartVisible` and `reload`. Call it in a field initializer.                     |
| `app-history-page` (`HistoryPage`, `shared/history/history-page/`)           | Layout and styles of the page: header, period toggle, summary, chips, chart grid (cards, hide buttons, heatmap), states and the `<router-outlet />`. Inputs: `history` (the object above), `content` (`HistoryPageContent`: `summary`, `hasData`, `hourMap`, `charts`, optional `notices` for a chart card that shows a text instead), `heading`, `recordsTitle`, `emptyMessage`, `chartTitles`, `heatmap` (`color`, `caption`, `unit`). The record list is projected as content. |

A tracker page only defines: chart titles, heatmap options, `toContent(stats)` (summary and chart configurations from `history-charts.ts`) and the list. Chart ids must include `hourMap`. Not exported from `@shared` (Chart.js).

The sections below describe the behavior these pieces implement.

## Page structure (top to bottom)

1. **Header:** back link to Home ("Inicio"), `h1` ("Historial de lactancia") and a period selector (`mat-button-toggle-group`: 7 / 30 / 90 days, **7 by default**).
2. **Summary** (`dl`): number of feeds, total time, average duration, average interval for the selected period. `—` when there is no data.
3. **Charts** section: title, a `mat-chip-listbox` (multiple) with one chip per chart (selected = visible), and the grid of chart cards.
4. **Records** section: the list grouped by day with infinite scroll (see "Record list": shared `createPagedList` + `app-history-list`).
5. `<router-outlet />` for the record modal (child route `:recordId`).

All visible copy is in Spanish. Design tokens come from `src/styles.scss` (`--app-*`); chart colors in `history-charts.ts` mirror them (left `#99620d`, right `#285c8c`, lines `#155f56`). Layout must work from 360 px wide with no horizontal scroll.

## Charts

All six charts are shown by default; each can be hidden individually.

| Id (`HISTORY_CHART_IDS`) | Title                       | Type                                        |
| ------------------------ | --------------------------- | ------------------------------------------- |
| `feedsPerDay`            | Tomas por día               | Bar                                         |
| `minutesPerDay`          | Minutos totales por día     | Stacked bar (left / right, in minutes)      |
| `breastSplit`            | Reparto izquierdo / derecho | Doughnut (tooltip: time and percentage)     |
| `averageDuration`        | Duración media por toma     | Line (minutes, gaps for days without feeds) |
| `averageInterval`        | Intervalo medio entre tomas | Line (hours, gaps for days without feeds)   |
| `hourMap`                | Mapa de horas del día       | Heatmap (own HTML table, full width)        |

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

## Record list

The list of records (grouped by day, infinite scroll) is the same for **every** tracker, so its layout, styles, states and paging logic live only in shared code (`src/app/shared/history/history-list/`, exported from `@shared`). A tracker's list component (`pages/<tracker>-history/<tracker>-history-list/`) only provides what is specific: how a record becomes a row, the day summary and the content of the row. **Never copy markup, styles or paging code from another tracker's list.**

| Piece                                 | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createPagedList<Item, Row>(options)` | Data side. Options: `load({ limit, offset })` (the service `getPage`), `toRow` (record -> row, `null` skips it), `timeOf` (instant used to group by local day), `summaryOf(rows)` (text of the day heading) and `dialogRoute` (the `:recordId` path, `RECORD_DIALOG_ROUTE`, whose modal closing reloads the list). Returns `groups` (`DayGroup<Row>[]`), `status`, `loadingMore`, `moreFailed`, `hasMore`, `reload()` and `loadMore()`. Does pages of 20, grouping by `localDateKey`, hiding the summary of the last day while more pages remain, the retry after a failed page, and the reload in one request (`limit = max(20, loaded)`, `offset = 0`) when the modal closes. Call it in a field initializer. |
| `app-history-list` (`HistoryList`)    | Frame. Inputs: `list` (the object returned above), `accent` (`var(--app-card-<tracker>)`), `timeWidth` (width of the first column; default `3.5rem`, widen it for ranges such as `7rem`) and the Spanish texts `loadingLabel`, `emptyMessage`, `errorMessage`, `loadingMoreLabel`. Renders the states (`app-async-state`), the retry of a failed "load more", the spinner and the `InView` sentinel.                                                                                                                                                                                                                                                                                                            |
| `app-history-day` (`HistoryDay`)      | One day: sticky heading (`Hoy`, `Ayer`, `Sábado, 31 de octubre`) with its summary and the framed `ul`. Inputs `key`, `heading`, `summary` from the group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `li[appHistoryRow]` (`HistoryRow`)    | One row: full-width link with hover, visible focus outline, chevron and the responsive grid. Inputs `link` and `inProgress` (tints the time). Content goes in three slots: `historyTime`, `historyMain` and `historyDetails`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `app-record-flags` (`RecordFlags`)    | The notes / photo icons with hidden text for screen readers. Use it in every row's `historyDetails`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

Template of a tracker list (the whole file, apart from the row content):

```html
<app-history-list
  [list]="list"
  accent="var(--app-card-bottle)"
  loadingLabel="Cargando el historial"
  emptyMessage="Todavía no hay biberones registrados."
  errorMessage="No se ha podido cargar el historial."
  loadingMoreLabel="Cargando más biberones"
>
  @for (group of list.groups(); track group.key) {
  <app-history-day [key]="group.key" [heading]="group.heading" [summary]="group.summary">
    @for (row of group.rows; track row.id) {
    <li appHistoryRow [link]="row.link">
      <span historyTime>{{ row.startMs | date: 'HH:mm' }}</span>
      <span historyMain>...</span>
      <span historyDetails
        >... <app-record-flags [hasNotes]="row.hasNotes" [hasPhoto]="row.hasPhoto"
      /></span>
    </li>
    }
  </app-history-day>
  }
</app-history-list>
```

Rules:

- **Styles:** the tracker's `.scss` contains **only** styles of its own row content (a type label, a warning, a muted duration). Do not restyle `.history-row`, `.day-*`, the grid, the chevron or the sentinel; if the common layout needs a change, change the shared component so every tracker stays identical. Do not use `::ng-deep`.
- **Row:** a running record links to its creation route (`/lactancia`) and passes `inProgress`; a finished one links to `['/detalle/<category>', id]`, which opens the record modal. Rows keep the link, hover and keyboard focus from `HistoryRow`; do not wrap them in another link or button.
- **Counts and time in the day summary** use `@shared` helpers (`formatDurationText`...) and the correct singular/plural noun (`1 toma`, `2 tomas`). The day summary is computed from the rows, so keep whatever it needs (e.g. seconds) in the row.
- **States:** loading, empty and error come from `app-history-list` (see `.github/instructions/loading-states.instructions.md`); never add them by hand.
- **Refresh:** `createPagedList` reloads by itself when `dialogRoute` is notified (see "Refresh"); the list never subscribes by hand.

## Refresh

`DialogRouteHost` emits `DialogRouteEvents.notifyClosed(':recordId')` when the record modal closes (saved, deleted or just closed). Both the page (stats) and the list (`createPagedList`, through `dialogRoute`) subscribe to that path. Do not refresh by other means. The card on Home refreshes by itself when Home is shown again.

## Rules for the code

- Time logic only through `@shared` helpers (`localDateRange`, `localDateKey`, `localTimeZone`, `formatDayHeading`, `formatDayLabel`, `formatDurationText`, `parseTimestamp`, ...); load the `time-utils` skill first. Use `createClock(60_000)` for "now" in this page: a one-second tick is not needed and would recompute the groups constantly. A computed that feeds a resource must be stable (`equal` on `from`/`to`) so the tick does not refetch.
- State with signals; data with `rxResource` (`params`/`stream`); `linkedSignal` for state derived from a resource.
- Keep component styles under the `anyComponentStyle` budget (4 kB warning / 8 kB error): split into small components (`<tracker>-history-list`, heatmap, `history-chart`) instead of growing one stylesheet.
- Build with `npm run build` and watch the initial bundle budget (500 kB warning): everything heavy (Chart.js, chips, button toggle) must stay in the lazy page chunk.

## Adding the history page for another tracker

1. Add the models and service calls for its stats and preferences (same contract, different path segment and charts) and the mock implementation. The service needs `getPage({ limit, offset })` returning `{ items, total }`.
2. Create `src/app/pages/<tracker>-history/` (English name, e.g. `bottle-history`) reusing the shared pieces: `createHistoryStats` + `app-history-page` (see "Shared page pieces"; `shared/history/`, never through the `@shared` barrel because of Chart.js) and, for the list **`createPagedList` + `app-history-list`/`app-history-day`/`appHistoryRow`/`app-record-flags`** as described in "Record list". Do not write the list paging, states or row layout again.
3. Declare `detalle/<category>` with its `:recordId` child route (see the modal file) before `detalle/:category`.
4. Point the card's `link` to that route.
