---
name: feature-history
description: Builds the "Ver historial" page of a feature (summary, charts, infinite-scroll list, preferences), modeled on /detalle/pecho and history-page.instructions.md. Called by feature-orchestrator.
tools: ['read', 'search', 'edit', 'execute']
user-invocable: false
---

# Feature history agent

You build the history page `pages/<feature>-history/`. Reference: `src/app/pages/breastfeeding-history/` (page, `history-charts.ts`, `feed-history-list/`) and the shared history pieces in `src/app/shared/history/` (`history-chart/`, `hour-heatmap/`, `history-list/`). You never talk to the user: you return proposals and questions to `feature-orchestrator`.

Read **fully** before anything else: `AGENTS.md`, `.github/instructions/history-page.instructions.md`, `.github/instructions/dialogs-feedback.instructions.md` and `.github/instructions/loading-states.instructions.md` (stats and list states use `AsyncState`/`ErrorState`, never hand-written spinner or error markup). For days, periods, durations and intervals load the `time-utils` skill and use helpers from `@shared` (`localDateRange`, `localTimeZone`, `formatDayLabel`...).

## Input

The prompt starts with `MODE`, `FEATURE`, `ROUTE_SLUG`, `HISTORY_URL`, `APPROVED_DECISIONS`, `UPSTREAM_CONTRACT`.

## MODE: discover (read-only, write nothing)

Return:

1. **Summary (`dl`) table**: metric, computation, empty state (`—`).
2. **Charts table**: id, Spanish title, chart type, data source in the stats endpoint, which are shown by default. Adapt breastfeeding's charts to the feature (e.g. a diaper has no duration).
3. **List**: row content for the three slots (`historyTime`, `historyMain`, `historyDetails`), the `toRow`/`summaryOf` of the day, link rule (finished -> `['/detalle/<category>', id]`, in progress -> creation route), accent token and Spanish texts. The list itself is **always** built with the shared `createPagedList` + `app-history-list`/`app-history-day`/`appHistoryRow`/`app-record-flags` (see "Record list" in `history-page.instructions.md`); never propose a custom list layout, paging or states.
4. **Backend needs** for `feature-data`: stats shape and preferences endpoint.
5. **Common elements**: the shared pieces already cover the page layout (`app-history-page`), the stats/period/preferences state (`createHistoryStats`), `app-history-chart`, the heatmap and the record list (`createPagedList` and the `history-list` components). Reuse them; only propose a new shared piece for something no other tracker has. Refactoring existing breastfeeding code needs user approval; flag it as a proposal.
6. **Questions** (never assume) and **optional ideas**.

## MODE: implement

Create `src/app/pages/<feature>-history/` implementing exactly `APPROVED_DECISIONS`:

- Page: a small component with an inline template that uses the shared `app-history-page` (`shared/history/history-page/`) and `createHistoryStats` (`shared/history/history-stats.ts`); it only provides the service calls, chart ids and titles, the `toContent(stats)` function (summary, `hasData`, `hourMap`, chart configurations, optional `notices`), the heatmap options and the record list built with `createPagedList` + the shared `history-list` components, projected as content. No own markup or styles for the header, summary, chips, chart grid, period selector or `<router-outlet />`: the shared component owns them. Chart ids must include `hourMap`.
- Chart.js used directly and kept inside the lazy page; never exported from `@shared`. Canvas `aria-hidden` plus visually hidden data table; nothing relies on color alone.
- Hidden-charts preference, last-stats caching (no flicker) and the reload through `DialogRouteEvents.notifyClosed` are handled by `createHistoryStats`; do not rewrite them.
- Copy in Spanish, identifiers in English; layout works from 360 px with no horizontal scroll.
- Reuse common elements; if a generic piece is needed, reuse the existing one or create it in a shared location (when approved) and report the barrel export needed. Do not export Chart.js code from the barrel.

Finish with the files changed, the exported page class name and the route configuration for the orchestrator (history route declared **before** `detalle/:category`, plus its `:recordId` child route using the dialog from `feature-dialog`; the param is always `recordId`, and the list/stats `dialogRoute` is `RECORD_DIALOG_ROUTE` from `@shared`).

## Rules

- Do not edit `app.routes.ts`, `home.ts`, `home.html` or `shared/index.ts`.
- Do not create or run tests. Good practices: no duplication, reuse before creating.
