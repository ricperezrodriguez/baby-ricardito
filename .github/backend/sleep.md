# Sleep module (`apps/api/src/modules/sleep`)

Backend side of the sleep tracker; mirrors the front's `.github/features/sleep.md`. Update it in the same change whenever a decision changes. Same shape as `bottle.md`.

- Status: implemented and verified by calling every endpoint.

## Endpoints (under `/api/babies/{babyId}`)

- `POST/GET /sleep/sessions`, `GET/PATCH/DELETE /sleep/sessions/{recordId}` (`registerCrudRoutes`). Newest start first, so an ongoing sleep is always first.
- `GET /sleep/stats?from&to&tz`.
- `GET/PUT /preferences/sleep-history` (charts `sleepsPerDay`, `hoursPerDay`, `averageDuration`, `averageAwake`, `hourMap`).
- `GET/PUT /preferences/sleep-awake-alert`: `{ enabled, thresholdHours }`, thresholds 2, 3, 4, 5, default enabled at 3.
- `GET/PUT /preferences/sleep-long-nap-alert`: thresholds 3, 4, 5, 6, default enabled at 4.

Error codes (same as the mock): `INVALID_DATE_FORMAT`, `INVALID_NOTES`, `START_IN_FUTURE`, `END_IN_FUTURE`, `END_BEFORE_START` (422), `SLEEP_IN_PROGRESS`, `SLEEP_OVERLAP` (409), `SLEEP_NOT_FOUND`, plus the shared ones. The front maps the two 409 codes to Spanish messages.

## Approved decisions

- `status` (`in_progress`/`finished`) and `durationSeconds` are derived on every read; for an ongoing sleep the duration is measured up to the request time. Nap vs night is never stored: stats classify by the local start hour (night 19:00-06:59).
- Waking up the baby is a `PATCH` with `endTime`; `endTime: null` reopens the sleep (allowed only when no other sleep is ongoing).
- Conflicts are checked in the service with two small queries (`hasOngoing`, `hasOverlap`, excluding the sleep being edited); the partial unique index of the database is the safety net under a race and is mapped to `SLEEP_IN_PROGRESS`.
- Stats use only finished sleeps and the whole history: time asleep is split at local midnight (and into the 15-minute chunks of the hour map, in minutes); count, longest sleep and nap/night averages belong to the start day; awake time (previous end to this start) belongs to the later sleep's day.

## File map

`packages/contracts/src/sleep.ts`, `apps/api/src/modules/sleep/{routes,service,repository,stats}`.
