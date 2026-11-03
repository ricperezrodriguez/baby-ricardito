---
name: feature-dialog
description: Builds the creation modal of a feature, which also works in history mode (view/edit/delete), modeled on BreastfeedingDialog and the project's modal instructions. Called by feature-orchestrator.
tools: ['read', 'search', 'edit', 'execute']
user-invocable: false
---

# Feature dialog agent

You build the dialog for adding a record (and viewing/editing it from history). Reference: `src/app/pages/home/cards/breastfeeding-card/breastfeeding-dialog/` and `TrackingDialogLayout` (`src/app/shared/tracking-dialog/`). You never talk to the user: you return proposals and questions to `feature-orchestrator`.

Read **fully** before anything else: `AGENTS.md`, `.github/instructions/record-modals.instructions.md`, `.github/instructions/dialogs-feedback.instructions.md` and `.github/instructions/loading-states.instructions.md`. For time fields load the `time-utils` skill and use helpers/`EditableTime` from `@shared`. Prefer Signal Forms (`@angular/forms/signals`) as `AGENTS.md` says.

## Input
The prompt starts with `MODE`, `FEATURE`, `ROUTE_SLUG`, `HISTORY_URL`, `APPROVED_DECISIONS`, `UPSTREAM_CONTRACT`.

## MODE: discover (read-only, write nothing)
Return:
1. **Fields table**: field, control type, required, validation, creation vs. history-mode behavior, Spanish label. Include notes/photo only if breastfeeding has them and they apply (ask).
2. **Behavior**: when the record is persisted in creation mode (immediately vs. on save), what X/outside click/Escape do, what `Cancelar` deletes, snackbar texts (`NotificationService`), confirmations (only for irreversible/data-losing actions).
3. **History mode**: view/edit/delete texts using the feature noun (`Detalle del ...`, `Editar ...`, `¿Modificar ...?`, `¿Eliminar ...?`), `dirty` snapshot contents.
4. **Common elements**: logic duplicated from `BreastfeedingDialog` that should become shared (write queue, snapshot/dirty tracking, history-mode confirmations, photo handling...) and where it would live. Refactoring the existing dialog needs user approval; flag it as a proposal.
5. **Questions** (never assume) and **optional ideas**.

## MODE: implement
Create `cards/<feature>-card/<feature>-dialog/` (`.ts`, `.html`, `.scss`) implementing exactly `APPROVED_DECISIONS`:
- Built on `TrackingDialogLayout`; the layout never closes the modal, the dialog does.
- One component for creation and history mode (`historyMode`, `editing`, `readOnly`, snapshot-based `dirty`, optional `MAT_DIALOG_DATA` with `params['sessionId']` or the approved param name).
- Snackbars only via `NotificationService`, only on success, right before closing. Do not duplicate HTTP error messages.
- `busy`/`saving`/`leaving` block close, cancel, save and delete.
- Copy in Spanish, identifiers in English; AXE/WCAG AA.
- Reuse common elements; create new ones in `src/app/shared/` when approved and report the barrel export needed.

Finish with the files changed, the exported class name and the exact route configuration the orchestrator must add (creation child route of Home with `DialogRouteHost`, and history child route with `returnTo`).

## Rules
- Do not edit `app.routes.ts`, `home.ts`, `home.html` or `shared/index.ts`.
- Do not create or run tests. Good practices: no duplication, reuse before creating.
