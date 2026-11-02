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

## Project Architecture

- Pages live in `src/app/pages/` and are lazy-loaded in `src/app/app.routes.ts` with `loadComponent`; use `RouterLink` for navigation.
- The persistent shell (Material nav + `RouterOutlet`) is in `src/app/shell/`; shell-specific styles go in `shell/app.scss`. Global Material 3 theme is in `src/styles.scss`.
- Page titles, visible copy and detail route names are in Spanish; keep that language.
- Time logic (start/end, durations, gaps, countdowns, elapsed text, clocks, day grouping) must use the helpers in `src/app/shared/utils/` imported from `@shared`; never re-implement them or use ad-hoc `interval`/`Date.now()` in components. Load the `time-utils` skill (`.agents/skills/time-utils/SKILL.md`) first.

## Modals and history pages

Details live in `.github/instructions/` (they load automatically for matching files; read them before touching this area):

- `record-modals.instructions.md`: creation modals (route-driven, `DialogRouteHost`), closing/cancel rules, snackbars (`NotificationService`).
- `dialogs-feedback.instructions.md`: view/edit record modal opened from a history row (same for every tracker).
- `history-page.instructions.md`: "Ver historial" pages (`detalle/<category>`), charts, stats and infinite-scroll list. Reference: `/detalle/pecho`.

Always: confirm only irreversible or data-losing actions; report non-obvious results with `NotificationService`, never `MatSnackBar` directly.

## Build and Test

From the repo root: `npm run start` (dev server), `npm run build` (production build). There is no lint script.
Do NOT run tests or create/extend specs (including the scaffolded `src/app/app.spec.ts`); this project does not maintain them.
