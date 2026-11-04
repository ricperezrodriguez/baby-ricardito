---
name: time-utils
description: Project time-helper rules and catalog. Use whenever writing or modifying code that calculates, formats, or measures time—start/end times, durations, gaps between spans, countdowns, elapsed time ("Hace 5 min"), ticking clocks, or ISO date parsing—in components, services, timers, or mocks.
---

# Time Utilities

All time calculations live in `src/app/shared/utils/` and are imported from `@shared`. Do not reimplement them or improvise time logic in components or services.

## Rules

1. Before writing time logic, check the catalog below. If a helper exists, use it.
2. Do not use `Date.now()`, `new Date()`, `Date.parse()`, `setInterval`, or `interval()` in components or services. These are allowed only inside `shared/utils/`.
3. If a calculation does not exist and could be reused by another feature, add it to `time.utils.ts` and export it from `src/app/shared/index.ts`. Do not keep it local to a component.
4. Always import from `@shared`, never from an internal file path.
5. Work with epoch milliseconds (`number`) and convert to ISO only at boundaries (API or storage) using `toIsoString` and `parseTimestamp`.
6. Helpers are pure: pass `now` as an argument. Do not read it inside the function.

## Catalog (`time.utils.ts`)

| Helper | Purpose |
|---|---|
| `formatDuration(ms)` | Formats milliseconds as `mm:ss` (or `h:mm:ss` from 1 hour onward). Never negative. |
| `spanDuration(span, now)` | Milliseconds in a `TimeSpan`. If `end` is `null`, measures up to `now`. |
| `totalGaps(spans)` | Milliseconds of gaps between consecutive spans sorted by start time. Open spans do not contribute a gap. |
| `remainingTime(start, durationMs, now)` | Milliseconds remaining in a countdown. Never negative. |
| `isTimerFinished(start, durationMs, now)` | Whether the countdown has finished. |
| `parseTimestamp(iso)` | Converts ISO to epoch milliseconds, or returns `null` if invalid. |
| `toIsoString(ms)` | Converts epoch milliseconds to ISO. |
| `parseDuration(text)` | Converts `m:ss` or `h:mm:ss` to milliseconds (the inverse of `formatDuration`), or returns `null` if invalid. |
| `toDateTimeLocal(ms)` | Converts epoch milliseconds to local `yyyy-MM-ddTHH:mm:ss`, the value for an `<input type="datetime-local">`. |
| `parseDateTimeLocal(text)` | Converts a local `datetime-local` value to epoch milliseconds, or returns `null` if empty or invalid. |
| `formatElapsedSince(iso, now)` | Spanish text, such as "Hace 5 min", "Hace 2 h 10 min", or "Hace menos de 1 min". |
| `formatElapsedHoursOrDays(ms)` | Whole hours ("53 h"), or whole days from 72 h on ("3 días"). Never negative. |
| `formatDurationText(ms)` | Short Spanish duration such as "45 s", "8 min" or "1 h 05 min". Never negative. |
| `localDateKey(ms)` | Local calendar day of an instant as `yyyy-MM-dd` (grouping by day). |
| `localHour(ms)` | Local hour of the day (0-23) of an instant. |
| `localDateRange(now, days)` | Inclusive local-day range `{ from, to }` of `days` days ending on the day of `now`. |
| `localTimeZone()` | IANA time zone of the device (e.g. `Europe/Madrid`). |
| `formatDayHeading(dayKey, now)` | Spanish day heading: "Hoy", "Ayer" or "Lunes, 2 de noviembre". |
| `formatDayLabel(dayKey)` | Short day label for chart axes, such as "2 nov". |

Type: `TimeSpan { start: number; end: number | null }` (`end: null` = still in progress).

## Clock (`clock.ts`)

`createClock(tickMs = 1_000)` returns a `Clock` with:

- `now`: A read-only signal containing the current instant, updated on every tick.
- `refresh()`: Immediately updates `now` and returns its value. Use it to get "the current time" when performing an action (for example, when a button is pressed) instead of `Date.now()`.

It must be called in an injection context (a class field or constructor). The interval is automatically canceled when the component is destroyed.

## Usage Pattern

```ts
import { createClock, formatDuration, spanDuration } from '@shared';

export class Example {
  private readonly clock = createClock();

  protected readonly elapsed = computed(() =>
    formatDuration(spanDuration(this.span(), this.clock.now())),
  );

  protected onPress(): void {
    const timestamp = this.clock.refresh();
    // use timestamp instead of Date.now()
  }
}
```

Incorrect:

```ts
const elapsed = Date.now() - start;            // use spanDuration + clock
timer(0, 1000).subscribe(() => { ... });       // use createClock
const label = `${m}:${String(s).padStart(2, '0')}`; // use formatDuration
```

## How to Add a New Helper

1. Add the pure function to `time.utils.ts` with a one-line comment explaining its contract (for example, "never negative").
2. Export it (and its type, if any) from `src/app/shared/index.ts`.
3. Add it to this file's table.
