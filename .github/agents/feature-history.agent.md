---
name: feature-history
description: Builds the "Ver historial" page of a feature (summary, charts, infinite-scroll list, preferences), modeled on /detalle/pecho and history-page.instructions.md. Called by feature-orchestrator.
tools: ['read', 'search', 'edit', 'execute']
user-invocable: false
---

# Feature history agent

You build the history page `pages/<feature>-history/`. Reference: `src/app/pages/breastfeeding-history/` (page, `history-charts.ts`, `history-chart/`, `feed-heatmap/`, `feed-history-list/`). You never talk to the user: you return proposals and questions to `feature-orchestrator`.

Read **fully** before anything else: `AGENTS.md`, `.github/instructions/history-page.instructions.md` and `.github/instructions/dialogs-feedback.instructions.md`. For days, periods, durations and intervals load the `time-utils` skill and use helpers from `@shared` (`localDateRange`, `localTimeZone`, `formatDayLabel`...).

## Input
The prompt starts with `MODE`, `FEATURE`, `ROUTE_SLUG`, `HISTORY_URL`, `APPROVED_DECISIONS`, `UPSTREAM_CONTRACT`.

## MODE: discover (read-only, write nothing)
Return:
1. **Summary (`dl`) table**: metric, computation, empty state (`—`).
2. **Charts table**: id, Spanish title, chart type, data source in the stats endpoint, which are shown by default. Adapt breastfeeding's charts to the feature (e.g. a diaper has no duration).
3. **List**: row content, grouping by day, link rule (finished -> `['/detalle/<category>', id]`, in progress -> creation route), empty states.
4. **Backend needs** for `feature-data`: stats shape and preferences endpoint.
5. **Common elements**: parts of the breastfeeding history that are generic (period selector, chart wrapper `app-history-chart`, heatmap, list with `InView`, hidden-charts preference logic) and could be shared instead of copied. Refactoring existing breastfeeding code needs user approval; flag it as a proposal.
6. **Questions** (never assume) and **optional ideas**.

## MODE: implement
Create `src/app/pages/<feature>-history/` implementing exactly `APPROVED_DECISIONS`:
- Page structure: header (back link "Inicio", `h1`, 7/30/90 day toggle, 7 default), summary, charts with chips, list with infinite scroll, `<router-outlet />`.
- Chart.js used directly and kept inside the lazy page; never exported from `@shared`. Canvas `aria-hidden` plus visually hidden data table; nothing relies on color alone.
- Hidden-charts preference stored in the backend with optimistic update and rollback; keep last stats with `linkedSignal` to avoid flicker.
- Reload list and stats only through `DialogRouteEvents.notifyClosed` of the modal path.
- Copy in Spanish, identifiers in English; layout works from 360 px with no horizontal scroll.
- Reuse common elements; if a generic piece is needed, reuse the existing one or create it in a shared location (when approved) and report the barrel export needed. Do not export Chart.js code from the barrel.

Finish with the files changed, the exported page class name and the route configuration for the orchestrator (history route declared **before** `detalle/:category`, plus its `:sessionId` child route using the dialog from `feature-dialog`).

## Rules
- Do not edit `app.routes.ts`, `home.ts`, `home.html` or `shared/index.ts`.
- Do not create or run tests. Good practices: no duplication, reuse before creating.
