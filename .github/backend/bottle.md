# Bottle module (`apps/api/src/modules/bottle`) and combined feeding alert

Decision record of the backend side of the bottle tracker and of the `feeding-overdue-alert` preference. It mirrors the front's `.github/features/bottle.md`. Read it before touching them and update it in the same change whenever a decision changes (see `AGENTS.md`).

- Status: implemented and verified by calling every endpoint (see "Verified"). Not yet used end to end from the browser by the user (`npm run start:local-api`).
- It is the **template** for the rest of the trackers: copy its shape (`contracts/src/<tracker>.ts` + `modules/<tracker>/{routes,service,repository,stats}`), do not invent a new one.

## Endpoints (all under `/api/babies/{babyId}`)

| Method and path | Notes |
|---|---|
| `POST /bottle/feeds` | 201. 422 `FED_AT_IN_FUTURE`. `babyId` in the body is ignored (the URL wins). |
| `GET /bottle/feeds` | `limit` (default 20, min 1), `offset` (default 0), repeatable `milkType`. Newest first, ties by id. |
| `GET /bottle/feeds/{recordId}` | 404 `FEED_NOT_FOUND` also for ids that are not UUIDs. |
| `PATCH /bottle/feeds/{recordId}` | Omitted fields keep their value; an empty `notes` clears them (stored as `null`, returned without the key). |
| `DELETE /bottle/feeds/{recordId}` | 204. |
| `GET /bottle/stats?from&to&tz` | Same calculation as the mock (`bottle.stats.ts`). |
| `GET/PUT /preferences/bottle-history` | `{ hiddenCharts }`, duplicates removed, default `[]`. |
| `GET/PUT /preferences/feeding-overdue-alert` | `{ enabled, thresholdHours }`, thresholds 1, 1.5, 2, 2.5, 3, 3.5, 4; default enabled, 3 h. |

Error codes (same as the mock): `INVALID_DATE_FORMAT`, `INVALID_AMOUNT`, `INVALID_MILK_TYPE`, `INVALID_NOTES`, `INVALID_PAGINATION`, `INVALID_RANGE`, `INVALID_TIME_ZONE`, `INVALID_PREFERENCES`, `INVALID_BODY`, `BABY_NOT_FOUND`, `FEED_NOT_FOUND`, `FED_AT_IN_FUTURE`.

## Approved decisions

- Stats load **every feed of the baby** (only `fedAt`, `amountMl`, `milkType`) because an interval can reach back before the range. Revisit with a time window plus the previous feed only if a baby ever has tens of thousands of feeds.
- The `feeding-overdue-alert` only stores the settings; the front computes the alert from the latest feeds (as with the mock), so this phase does not need breastfeeding. The "last feed across breastfeeding and bottle" is still done in the front.
- A missing or wrong-typed field uses the same code as an invalid value (`{}` -> `INVALID_DATE_FORMAT`), like the mock. A stats request without `from`/`to` answers `INVALID_QUERY` (the mock answered `INVALID_DATE_FORMAT`; the front does not depend on it).
- Seeds with demo data are not written yet (phase 6 of the plan); the database starts without feeds.

## Declined or deferred

- Filtering stats by milk type, a feed photo, optional duration, leftover/goal: same as the front record (not included).
- A time window for the stats query: deferred (see above).

## Verified

All endpoints above were called against Postgres: create/list/filter/paginate/get/patch/delete, every error code, stats (counts, totals, intervals, hour map), both preferences (default, save, dedupe, invalid) and `BABY_NOT_FOUND`. The front dev server with the `local-api` configuration proxies `/api` to the API.

## File map

- Contracts: `packages/contracts/src/{common,bottle,feeding}.ts`.
- API: `apps/api/src/modules/bottle/{bottle.routes,bottle.service,bottle.repository,bottle.stats}.ts`, `modules/feeding/feeding.routes.ts`, `modules/preferences/{preference.repository,preference.routes}.ts`, `modules/babies/require-baby.ts`, `common/{ids,baby-guard}.ts`, `context.ts`, `app.ts`.
- Front: `apps/web/angular.json` (`local-api` configuration), `apps/web/proxy.conf.json`.
