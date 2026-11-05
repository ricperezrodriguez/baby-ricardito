# Sleep feature (`sleep`)

Decision record of the sleep tracker. Read it before touching any sleep code and update it in the same change whenever the user changes, confirms or discards a decision (see `AGENTS.md`).

- English identifier: `sleep`. Creation modal route: `/sueno`. History: `/detalle/sueno`. History row modal: `/detalle/sueno/:recordId`.
- User-facing copy says "sueño" (the Home card used to be called "Descanso").
- Status: implemented, `npm run build` passes. Not yet validated by the user in the browser.

## Approved decisions

### Data model

- A `SleepSession` has `startTime`, `endTime` (`null` while ongoing), `status` (`in_progress` | `finished`, derived from `endTime`), `durationSeconds` and optional `notes` (max 500). No photo, no location, no quality.
- **No stored nap/night field.** Nap vs night is derived only where needed, from the local start hour: night is 19:00-06:59, otherwise nap (`isNightSleepStart` in `features/sleep/sleep.span.ts`). Reason: the user wants sleep time counted regardless of the hour, except for the two-line average duration chart and the long-nap alert.
- Only one ongoing sleep at a time (409 `SLEEP_IN_PROGRESS`).
- Overlaps are rejected (409 `SLEEP_OVERLAP`) so time is never counted twice. Sessions that only touch (end = start) are allowed.
- Retroactive entries (start and end given) are allowed. No maximum duration.
- Waking up is a `PATCH` of `endTime`; there is no finish endpoint. The API accepts `endTime: null` (reopen), but the UI never reopens a finished sleep.
- Friendly error texts live in `http-error-snackbar.interceptor.ts` (by error code): "Ya hay un sueño registrado en esas horas." and "Ya hay un sueño en curso.". Dialogs and cards must not add a second error snackbar.

### Stats

- Only finished sessions count.
- A sleep crossing local midnight is split between both local days for `totalSeconds` and `hourMap`. `sleeps` and `longestSleepSeconds` belong to the start day.
- Awake window = previous wake-up to next fall-asleep, assigned to the day of the later sleep.
- `averageDailySeconds` divides by all days of the range (zeros included); `null` without sleeps.
- `hourMap` is minutes asleep per weekday and hour.
- Per-day and total stats include `napAverageDurationSeconds` and `nightAverageDurationSeconds` (nullable).

### Home card (`pages/home/cards/sleep-card/`)

- Sleeping: title "Durmiendo", live clock, "En curso" badge, one-tap "Despertar" button that ends the sleep without opening the modal. Tapping the card content opens `/sueno`.
- Awake: title "Despierto hace X", "Último sueño: X".
- Both: "Hoy: X dormido" (finished sleeps only, never adds the ongoing one). Omitted if the stats request fails or the total is 0.
- Awake: tapping the card content opens the latest sleep in history mode over Home (`/sueno/:recordId`, `recordRoute`).

### Creation modal (`sleep-dialog`)

- No sleep in progress: "Añadir sueño" with Inicio (now by default), toggle "Ya se ha despertado" (reveals Fin; not persisted) and Notas. Buttons "Empezar sueño" or "Guardar". Nothing is stored until the button is pressed. After "Empezar sueño" the modal closes.
- Sleep in progress: "Sueño en curso" with a live clock and "Despertar". Start edits are persisted immediately through the shared write queue; a rejected write reverts the field to the last stored value.
- History mode: view, edit (one `PATCH` after confirmation) and delete with confirmations. A finished record always keeps its end.
- The user said they would confirm this flow after trying it.

### History page (`pages/sleep-history/`)

- Summary (7/30/90 days, default 7): sleeps, total asleep, daily average, longest, average duration, average awake window.
- Charts (all visible by default, hideable): sleeps per day, hours of sleep per day, average duration per sleep (ONE chart, two lines: naps and night), average awake window, hour heatmap (minutes asleep).
- List rows: "HH:mm – HH:mm" with a "(+1)" marker when the end falls on another day; ongoing rows say "En curso" and link to `/sueno`.

### Home alerts and notification settings

- Two dismissible alerts on Home, each with its own component and its own settings section in the notifications modal (same pattern as the diaper poop alert):
  - Awake too long (`sleep-awake-alert`): thresholds 2/3/4/5 h, default 3 h, enabled by default. Only when the last sleep is finished.
  - Nap too long (`sleep-long-nap-alert`): thresholds 3/4/5/6 h, default 4 h, enabled by default. Only for an ongoing sleep that started between 07:00 and 18:59; a night sleep never triggers it.

### Shared elements created for this feature

- `AlertSettingsSection` (notifications modal; the poop section now uses it).
- `createWriteQueue` (breastfeeding refactored to use it, same behavior).
- `localHour` in `shared/utils/time.utils.ts`.
- `record.over-limit` SCSS mixin (diaper and sleep dialogs).
- `features/shared/tracker.api.ts` (`babyUrl`, `statsParams`), used only by `SleepService`.

## Declined or deferred

- Stored nap/night field: declined.
- Quick end-time buttons in manual entry ("Ahora", "Hace 15 min"): not included.
- Comparing the current period with the previous one: not included.
- Photo, location, quality on a sleep: not included.

## Open points

- "Hoy: X dormido" is omitted at 0 instead of showing "0 min". Decide if it should show.
- The card's "Despertar" button has the accessible name "Despertar"; "Despertar al bebé" was proposed.
- The two-line chart legend tells the lines apart by name and point shape but does not show the dashed line.
- No visual divider between the three sections of the notifications modal. Compare the poop section visually with the previous version.
- The initial bundle is over budget (941 kB vs 500 kB); the sleep mock backend ships in the main bundle.

## Map

- Data: `features/sleep/` (`sleep.models.ts`, `sleep.service.ts`, `sleep.span.ts`).
- Mocks: `core/mocks/mock-backend.sleep.*.ts`, wired in `mock-backend.interceptor.ts`. Seed: about 60 days, deterministic, no ongoing sleep.
- Endpoints: `/babies/:babyId/sleep/sessions`, `/sleep/stats`, `/preferences/sleep-history`, `/preferences/sleep-awake-alert`, `/preferences/sleep-long-nap-alert`.
- UI: `pages/home/cards/sleep-card/` (card and `sleep-dialog/`), `pages/sleep-history/`, `pages/home/sleep-awake-alert/`, `pages/home/sleep-long-nap-alert/`, `shared/alert-settings-section/`, `shared/notifications-dialog/`.
