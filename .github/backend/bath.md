# Bath module (`apps/api/src/modules/bath`)

Backend side of the bath tracker; mirrors the front's `.github/features/bath.md`. Update it in the same change whenever a decision changes. Same shape as `bottle.md`.

- Status: implemented and verified by calling every endpoint.

## Endpoints (under `/api/babies/{babyId}`)

- `POST/GET /bath/baths`, `GET/PATCH/DELETE /bath/baths/{recordId}` (registered with `registerCrudRoutes`).
- `GET /bath/stats?from&to&tz`.
- `GET/PUT /preferences/bath-history` (charts `calendar`, `intervals`, `hairSplit`).
- `GET/PUT /preferences/bath-overdue-alert`: `{ enabled, thresholdDays }`, thresholds 2, 3, 4, 7, default enabled at 3.

Error codes (same as the mock): `INVALID_DATE_FORMAT`, `INVALID_HAIR_WASHED`, `INVALID_REACTION`, `INVALID_NOTES`, `BATHED_AT_IN_FUTURE` (422), `BATH_NOT_FOUND`, plus the shared ones.

## Approved decisions

- `hairWashed` is required on create; `reaction` (`happy`, `neutral`, `sad`) is optional and returned without the key when not recorded. On `PATCH` a `null` `reaction` and an empty or `null` `notes` clear them.
- Intervals are against the previous bath, even before the range; `lastBathAt` and `lastHairWashAt` use the whole history.

## File map

`packages/contracts/src/bath.ts`, `apps/api/src/modules/bath/{routes,service,repository,stats}`.
