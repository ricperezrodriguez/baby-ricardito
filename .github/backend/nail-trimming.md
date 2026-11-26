# Nail trimming module (`apps/api/src/modules/nail-trimming`)

Backend side of the nail trimming tracker; mirrors the front's `.github/features/nail-trimming.md`. Update it in the same change whenever a decision changes. Same shape as `bottle.md`.

- Status: implemented and verified by calling every endpoint.

## Endpoints (under `/api/babies/{babyId}`)

- `POST/GET /nail-trimming/trims`, `GET/PATCH/DELETE /nail-trimming/trims/{recordId}` (registered with `registerCrudRoutes`).
- `GET /nail-trimming/stats?from&to&tz`.
- `GET/PUT /preferences/nail-trimming-history` (charts `calendar`, `intervals`, `areaSplit`).
- `GET/PUT /preferences/nail-trimming-overdue-alert`: `{ enabled, thresholdDays }`, thresholds 5, 7, 10, 14, default enabled at 7.

Error codes (same as the mock): `INVALID_DATE_FORMAT`, `INVALID_AREAS`, `INVALID_NOTES`, `TRIMMED_AT_IN_FUTURE` (422), `NAIL_TRIM_NOT_FOUND`, plus the shared ones.

## Approved decisions

- `areas` is non-empty, without duplicates and always returned in `hands`, `feet` order (normalized on input; stored as a Postgres enum array with a `CHECK` against empty arrays). `PATCH` replaces the whole list.
- An empty or `null` `notes` clears them.
- Intervals are per zone against the previous trim of that zone, even before the range; a hands+feet trim takes part in both zones. `lastHandsAt`/`lastFeetAt` use the whole history.

## File map

`packages/contracts/src/nail-trimming.ts`, `apps/api/src/modules/nail-trimming/{routes,service,repository,stats}`.
