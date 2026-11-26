# Breastfeeding module (`apps/api/src/modules/breastfeeding`)

Backend side of the breastfeeding tracker; mirrors the front's `.github/features/breastfeeding.md`. Update it in the same change whenever a decision changes. Same shape as `bottle.md`; photos are in `photos.md`.

- Status: implemented and verified by calling every endpoint, including photos.

## Endpoints (under `/api/babies/{babyId}`)

- `POST/GET /breastfeeding/sessions`, `GET/PATCH/DELETE /breastfeeding/sessions/{recordId}` (`registerCrudRoutes`). Newest start first, so an open session is always first.
- `PUT/DELETE /breastfeeding/sessions/{recordId}/photo` (`registerPhotoRoutes`).
- `GET /breastfeeding/stats?from&to&tz`.
- `GET/PUT /preferences/breastfeeding-history` (charts `feedsPerDay`, `minutesPerDay`, `breastSplit`, `averageDuration`, `averageInterval`, `hourMap`).
- The combined overdue alert is `feeding-overdue-alert` (see `bottle.md`).

Error codes (same as the mock): `INVALID_DATE_FORMAT`, `INVALID_BREAST`, `INVALID_SEGMENTS`, `INVALID_NOTES`, `END_BEFORE_START` and `SEGMENT_END_BEFORE_START` (422), `SESSION_IN_PROGRESS` (409), `SESSION_NOT_FOUND`, plus the shared ones. Segment fields are mapped with path keys in `BREASTFEEDING_ERROR_CODES` (`segments.breast`, `segments.startTime`...); a non-object segment answers `INVALID_SEGMENTS` (the mock said `INVALID_SEGMENT`).

## Approved decisions

- A session has an open/finished state derived from `endTime` (`in_progress` or `finished`; the front type also lists `paused`, which neither the mock nor the API ever emits). Totals, per-breast durations and `firstBreast` are derived on every read (`breastfeeding.metrics.ts`): open sessions and open segments are measured up to the request time, a finished session closes its open segments with its `endTime`, and without segments the total is the session span.
- **Segments** live in their own table and are returned ordered by start time (the mock kept the order of the request; every real client sends them chronologically). `PATCH` with `segments` replaces the whole list in one nested write (`deleteMany` + `create`); omitting it keeps them.
- **One open session per baby:** checked in the service (409 `SESSION_IN_PROGRESS`, excluding the session being edited) and by the partial unique index of the database as the safety net under a race. `endTime: null` reopens a session.
- No "in the future" rule and no length limit on `notes` (as in the mock); an empty `notes` clears them.
- Stats count **finished** sessions only (an open one is excluded), with intervals start to start against the previous finished feed, even from the day before, and the hour map counts feeds started.
- Deleting the record deletes its photo file.

## File map

`packages/contracts/src/breastfeeding.ts`, `apps/api/src/modules/breastfeeding/{routes,service,repository,metrics,stats}`, `apps/api/src/common/prisma-errors.ts`.
