# Breastfeeding Decisions

## Approved

- Finished feeds remain read-only until the user selects `Editar`.
- In edit mode, show the same per-breast play/stop controls as in creation mode so the user can continue the same feed from the current instant, preserving previous segments.
- History-mode timer changes remain local until the user confirms `Modificar`. Cancelling or dismissing follows the existing unsaved-change discard confirmation.
- Confirming with a running segment reopens the feed (`endTime: null`); confirming with all segments stopped keeps it finished.
- Manual per-breast duration editing is disabled while a segment is running.

## File Map

- `src/app/pages/home/cards/breastfeeding-card/breastfeeding-dialog/breastfeeding-dialog.ts`: timer state, local edits and persistence.
- `src/app/pages/home/cards/breastfeeding-card/breastfeeding-dialog/breastfeeding-dialog.html`: view/edit controls.
- `src/app/features/breastfeeding/breastfeeding-timer.ts`: segment transitions and duration calculations.
