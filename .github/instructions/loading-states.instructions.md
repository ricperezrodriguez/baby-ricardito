---
applyTo: "src/app/pages/**,src/app/shared/**"
---

# Loading, empty and error states

Whatever the screen (Home card, history page or list, modal), data that loads asynchronously always shows the **same** three states with the **same** shared components. Never write a spinner, an error message or a "Reintentar" button by hand in a template.

## Shared components (all in `@shared`, folder `src/app/shared/async-state/`)

| Piece | Use |
|---|---|
| `AsyncState` (`app-async-state`) | Wrapper for any piece of data. Inputs: `status` (`LoadStatus`), `loadingLabel`, `errorMessage`, optional `emptyMessage`; output `retry`. Shows the spinner, the empty message or the error and renders the projected content only when `status` is `loaded`. |
| `ErrorState` (`app-error-state`) | The error message with its **Reintentar** button (`retry` output). Used by `AsyncState`; use it directly only when there is no wrapper to put around the content (e.g. a failed "load more" at the end of a list: `<app-error-state (retry)="loadMore()" />`). |
| `LoadingSpinner` (`app-loading-spinner`) | The spinner, always with an accessible `label`. Used by `AsyncState`; use it directly only for loads that are not the main data (e.g. "Cargando más tomas"). |
| `LoadStatus` / `resourceStatus(value, error)` | `'loading' \| 'empty' \| 'loaded' \| 'error'`. `resourceStatus` maps a resource to it: a value that is already shown wins over a later error or reload. |

## Rules

- **Always an error state with retry.** Every load that can fail ends in `AsyncState`/`ErrorState` with `(retry)` wired to the real reload (`resource.reload()`, `reload()` of the card or list). Never leave the user with an error and no way out, and never show a bare error text.
- **Always a spinner with a label.** `loadingLabel` says what is loading (`Cargando estadísticas`, `Cargando el historial`). Do not use a spinner without `aria-label`.
- **Empty is not an error.** Use `status = 'empty'` with `emptyMessage` when the data loaded but there is nothing to show (`Todavía no hay tomas registradas.`). Empty states that depend on a filter or period inside already loaded content (e.g. "No hay tomas registradas en este periodo.") stay in the content as a normal `p.empty`.
- **Copy is Spanish and short.** Errors: `No se ha podido cargar ...` / `No se pudo cargar ...`. Do not duplicate the HTTP error snackbar's job: the interceptor already reports the failure, the state only gives the in-place retry.
- **Keep what is already shown.** When a reload fails or runs while data is on screen, keep the data (`linkedSignal` over the resource for stats, previous items for lists) and do not replace it by a spinner or an error.

## How to apply it

- **`rxResource` (stats, preferences):** keep the last value in a `linkedSignal` and derive `statsStatus = computed(() => resourceStatus(this.shownStats(), this.stats.error()))`. Template: `<app-async-state [status]="statsStatus()" loadingLabel="..." errorMessage="..." (retry)="stats.reload()">` with the content inside.
- **Paged list:** a `status = signal<LoadStatus>('loading')` set to `'loaded'` / `'empty'` / `'error'` after the first page; content (rows) inside `<app-async-state>`. Loading more: `app-loading-spinner` while loading and `<app-error-state (retry)="loadMore()" />` when it fails, **inside** the content.
- **Home cards:** `createLatestRecord` provides `state().status`; template `<app-async-state [status]="latestState().status" ... (retry)="reload()">`.
- **Modals:** the dialog loading a record shows `app-loading-spinner` with a label; if loading fails the dialog closes itself (the interceptor reports the error), so no inline error is needed there.

## Page structure

- The page (or list) component **orchestrates**: it owns the resource/status signals and the actions (`reload`, `loadMore`, period). Presentation pieces (charts, heatmap, rows) receive data through inputs and know nothing about loading.
- One `app-async-state` per independent data source, wrapping only the content that depends on it, so a failing source does not hide the others (e.g. stats and list of a history page fail and retry separately).
- Component styles must not restyle these states: any visual change is made in the shared component so every screen stays consistent.

## Intentional exceptions

These loads do **not** use `AsyncState` on purpose; do not "fix" them, and do not add new exceptions without agreeing it with the user:

- **Record modals** (`RecordDialogController.load`): they show a labelled `app-loading-spinner` and close themselves if the load fails (the interceptor reports it). `restoreActiveSession` of a creation modal falls back to an empty creation form.
- **Optional, non-critical UI** that is simply hidden while loading or failing: the `DiaperPoopAlert` banner on Home (see `alerts.instructions.md`; it only appears when it has data).
- **Preferences that have a safe default**: the hidden-charts preference (`createHiddenCharts`) falls back to "all charts visible" if it cannot be loaded.

## Adding a new load

1. Choose the status source (`resourceStatus`, a `LoadStatus` signal, or `createLatestRecord`).
2. Wrap the content in `app-async-state` with the three texts and `(retry)`.
3. Do not add the component's styles or markup again in the page; import `AsyncState` (and `ErrorState`/`LoadingSpinner` if used directly) from `@shared`.
