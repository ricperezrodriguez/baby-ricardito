# Diaper module (`apps/api/src/modules/diaper`)

Backend side of the diaper tracker; mirrors the front's `.github/features/diaper.md`. Update it in the same change whenever a decision changes. Same shape as `bottle.md`; photos are in `photos.md`.

- Status: implemented and verified by calling every endpoint, including photos.

## Endpoints (under `/api/babies/{babyId}`)

- `POST/GET /diaper/changes` (repeatable `type` filter), `GET/PATCH/DELETE /diaper/changes/{recordId}` (`registerCrudRoutes`).
- `PUT/DELETE /diaper/changes/{recordId}/photo` (`registerPhotoRoutes`).
- `GET /diaper/stats?from&to&tz`.
- `GET/PUT /preferences/diaper-history` (charts `changesPerDay`, `typeSplit`, `averageInterval`, `stoolColors`, `hourMap`).
- `GET/PUT /preferences/diaper-poop-alert`: `{ enabled, thresholdHours }`, thresholds 12, 24, 36, 48, 72, default enabled at 48.

Error codes (same as the mock): `INVALID_DATE_FORMAT`, `INVALID_DIAPER_TYPE`, `INVALID_STOOL_COLOR`, `INVALID_STOOL_CONSISTENCY`, `INVALID_HAS_RASH`, `INVALID_NOTES`, `CHANGED_AT_IN_FUTURE` and `STOOL_DETAILS_NOT_ALLOWED` (422), `CHANGE_NOT_FOUND`, plus the shared ones.

## Approved decisions

- `stoolColor`/`stoolConsistency` are always present in the response (`null` for `wet`); stool details with a `wet` diaper are rejected on the **merged** record, so switching to `wet` requires sending both as `null` (also enforced by a `CHECK` in the database).
- `hasRash` defaults to `false`; an empty `notes` clears them; `photoUrl` is absent when there is no photo.
- Stats count `unspecified` for dirty/both changes without color; intervals reach back before the range.
- Deleting the record deletes its photo file.

## File map

`packages/contracts/src/diaper.ts`, `apps/api/src/modules/diaper/{routes,service,repository,stats}`.
