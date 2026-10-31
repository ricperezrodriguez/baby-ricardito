---
applyTo: "src/app/**/*dialog*/**,src/app/shared/confirmation-dialog/**,src/app/core/notification.service.ts"
---

# Modales, confirmaciones y feedback al usuario

## Cierre y cancelación de modales de registro

Los modales de registro usan `TrackingDialogLayout` (`src/app/shared/tracking-dialog/tracking-dialog-layout.ts`). El layout no cierra el modal: emite eventos y el modal que lo usa decide qué hacer y lo cierra.

- **Cerrar (X, clic fuera, Escape)** emite `dismiss`. Es no destructivo: conserva el registro (guarda lo pendiente y cierra). **No pide confirmación.**
- **Cancelar** emite `discard` solo tras confirmar en `ConfirmationDialog` (`¿Cancelar registro?`). Es destructivo: borra el registro.
- Regla general: se pide confirmación solo para acciones irreversibles o que pierden datos. Las reversibles no la piden.
- Si no hay nada que perder (el registro aún no tiene datos), cerrar no debe mostrar confirmación ni aviso.
- Mientras el modal está guardando, cargando o cerrándose (`busy`/`saving`), cerrar, cancelar y guardar quedan bloqueados.

## Snackbar informativo

Toda acción cuyo resultado no sea evidente a la vista debe comunicarse con un snackbar, para que el usuario nunca dude de qué ha pasado con sus datos.

- Usa `NotificationService` (`src/app/core/notification.service.ts`): `success()` para confirmaciones e informaciones, `error()` para fallos. No uses `MatSnackBar` directamente.
- Ejemplos: `Toma guardada` al guardar; `Toma en curso. Puedes continuarla desde la tarjeta.` al cerrar con la X una toma que sigue en marcha.
- Muestra el snackbar solo cuando la operación ha tenido éxito, justo antes de cerrar el modal. Los errores HTTP ya los notifica `http-error-snackbar.interceptor.ts`; no los dupliques.
- Los textos son breves, en español y en tono neutro.
