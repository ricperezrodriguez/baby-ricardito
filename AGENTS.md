You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript

- Strict typing; prefer inference when obvious; no `any` (use `unknown`).

## Angular

- Standalone components only. Do NOT set `standalone: true` (default in v20+) or `changeDetection: OnPush` (default in v22+).
- Signals for state; `linkedSignal()` for state derived from several sources; never `mutate` (use `update`/`set`); `model()` for two-way bindings.
- No `@HostBinding`/`@HostListener`: use the `host` object of the decorator.
- Do NOT use `ngClass`, `ngStyle` (use `class`/`style` bindings) or `CommonModule` (import only the needed pipes/directives).
- Use `NgOptimizedImage` for static images (not for inline base64).
- Prefer Signal Forms (`@angular/forms/signals`): data in a `signal` model, `form(model)`, `[formField]="form.field"`, validation in the `form()` schema (e.g. `maxLength(path.notes, 500)`). Do NOT sync values manually with `[value]` + `(input)` or `event.target` casts. Otherwise use Reactive forms.
- Prefer inline templates for small components; external templates/styles use paths relative to the component file.
- Prefer `@Service` over `@Injectable({providedIn: 'root'})` for new singleton services (v22+).

## Accessibility

- MUST pass all AXE checks and WCAG AA (focus management, color contrast, ARIA).

## Language

- **Code is in English:** file and folder names, components, classes, services, variables, route params (`:sessionId`, `:category`), CSS classes, selectors, comments and docs under `.github/` (e.g. `Home`, `BreastfeedingHistory`, `pages/home/`).
- **The application is in Spanish** (the audience is Spanish): visible copy, page titles, `aria-label`s, snackbar and dialog texts, and **URL paths** (`/lactancia`, `/detalle/pecho`, `/detalle/panal`; lowercase, no accents or `ñ`).
- Keep the two apart: a Spanish URL segment or UI string never leaks into identifiers, and English never leaks into visible copy or URLs.
- `README.md` stays in Spanish.
- If unsure which language to use for something new, ask the user instead of guessing.
- The assistant always replies to the user in Spanish.

## Project Architecture

- Pages live in `src/app/pages/` (English folder names, e.g. `home`, `breastfeeding-history`) and are lazy-loaded in `src/app/app.routes.ts` with `loadComponent`; use `RouterLink` for navigation.
- The persistent shell (Material nav + `RouterOutlet`) is in `src/app/shell/`; shell-specific styles go in `shell/app.scss`. Global Material 3 theme is in `src/styles.scss`.
- Page titles and visible copy are in Spanish, as are the URL paths (see Language); component and file names are English.
- Time logic (start/end, durations, gaps, countdowns, elapsed text, clocks, day grouping) must use the helpers in `src/app/shared/utils/` imported from `@shared`; never re-implement them or use ad-hoc `interval`/`Date.now()` in components. Load the `time-utils` skill (`.agents/skills/time-utils/SKILL.md`) first.

## Modals and history pages

Details live in `.github/instructions/` (they load automatically for matching files; read them before touching this area):

- `record-modals.instructions.md`: creation modals (route-driven, `DialogRouteHost`), closing/cancel rules, snackbars (`NotificationService`).
- `dialogs-feedback.instructions.md`: view/edit record modal opened from a history row (same for every tracker).
- `history-page.instructions.md`: "Ver historial" pages (`detalle/<category>` URLs, code in `pages/<tracker>-history/`), charts, stats and the record list (shared `createPagedList` + `app-history-list`, never copied per tracker). Reference: `/detalle/pecho`.
- `loading-states.instructions.md`: loading, empty and error states of any data (`AsyncState`, `ErrorState`, `LoadingSpinner`): always the shared spinner and an error with "Reintentar", never hand-written.
- `alerts.instructions.md`: dismissible alerts on Home (`AlertBanner`, `createAlertDismissal`): one small component per alert with its own rule, never copying the markup or the `localStorage` code.

Always: confirm only irreversible or data-losing actions; report non-obvious results with `NotificationService`, never `MatSnackBar` directly.

## Code quality and common elements

- Follow good programming practices: small single-purpose units, no duplication, clear names, strict typing.
- Whenever something can be shared (component, util, type, SCSS mixin, service helper), reuse the existing common element or create one in `src/app/shared/` (or shared domain code under `src/app/features/`) instead of copying code between features. Refactoring existing features into a common element must be agreed with the user first.

## Agents

New tracking features (card, creation/edit modal, history page, services and mocks) are built with the orchestrator in `.github/agents/`:

- `feature-orchestrator` (invoke it with the feature to build, e.g. "biberón"): asks the user, plans and only implements after explicit approval.
- Subagents (not user-invocable): `feature-data`, `feature-card`, `feature-dialog`, `feature-history`, `feature-style-harmonizer`. Each one has a `discover` (read-only) and an `implement` mode. Only the orchestrator edits the shared files `app.routes.ts`, `home.ts`/`home.html` and `shared/index.ts`.

## Feature decision records

Each tracking feature has a decision record in `.github/features/<feature>.md` (approved decisions, declined/deferred ideas, open points, file map). Before touching a feature, read its record. Whenever the user changes, confirms or discards a decision about a feature, update its record in the same change.

## Build and Test

From the repo root: `npm run start` (dev server), `npm run build` (production build). There is no lint script.
Do NOT run tests or create/extend specs (including the scaffolded `src/app/app.spec.ts`); this project does not maintain them.
