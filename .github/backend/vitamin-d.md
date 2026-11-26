# Vitamin D module (`apps/api/src/modules/vitamin-d`)

Backend side of the vitamin D tracker; mirrors the front's `.github/features/vitamin-d.md`. Update it in the same change whenever a decision changes. Same shape as `bottle.md`.

- Status: implemented and verified by calling every endpoint.

## Endpoints (under `/api/babies/{babyId}`)

- `POST/GET /vitamin-d/doses`, `GET/PATCH/DELETE /vitamin-d/doses/{recordId}` (registered with `registerCrudRoutes`).
- `GET /vitamin-d/stats?from&to&tz`.
- `GET/PUT /preferences/vitamin-d-history` (charts `calendar`, `dosesPerDay`, `dropsPerDay`, `hourMap`).
- `GET/PUT /preferences/vitamin-d-missed-alert`: `{ enabled, thresholdHours }`, thresholds are **clock hours** 12 to 22, default enabled at 18.

Error codes (same as the mock): `INVALID_DATE_FORMAT`, `INVALID_DROPS`, `INVALID_NOTES`, `GIVEN_AT_IN_FUTURE` (422), `DOSE_NOT_FOUND`, plus the shared ones (`BABY_NOT_FOUND`, `INVALID_PAGINATION`, `INVALID_PREFERENCES`, stats codes).

## Approved decisions

- `drops` is optional (1 to 10): a missing or `null` value on create means "not recorded" (stored as `null`, returned without the key); `drops: null` on `PATCH` clears it.
- Empty `notes` clear them (stored as `null`, returned without the key).
- Stats use the **whole history**: the status of a day (`given`, `missed`, `pending`, `notStarted`) depends on the current moment and on the first dose ever recorded; `currentStreakDays` and `lastGivenAt` also use the whole history, the rest only the range. `now` is the server clock.

## File map

`packages/contracts/src/vitamin-d.ts`, `apps/api/src/modules/vitamin-d/{routes,service,repository,stats}`.
