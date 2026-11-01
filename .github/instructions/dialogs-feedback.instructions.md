---
applyTo: "src/app/**/*dialog*/**,src/app/shared/confirmation-dialog/**,src/app/shared/tracking-card/**,src/app/app.routes.ts,src/app/core/notification.service.ts"
---

# Modales, confirmaciones y feedback al usuario

## Modales con ruta (enlazables)

Los modales de registro se abren desde una ruta hija de Inicio, de modo que la URL es la fuente de verdad: el modal está abierto si y solo si la URL lo indica. Así un enlace directo (p. ej. `/lactancia`) abre la app con Inicio detrás y el modal encima.

- **Ruta:** en `src/app/app.routes.ts`, `''` (Inicio) tiene una ruta hija por modal con `component: DialogRouteHost` y `data: { dialog: () => import(...).then(m => m.XDialog) } satisfies DialogRouteData`. El diálogo se carga de forma diferida. `dialogData` (opcional) aporta `title`/`message` al modal genérico `TrackingDialog`.
- **Host:** `DialogRouteHost` (`src/app/shared/dialog-route/dialog-route.ts`) no tiene vista. Al activarse abre el modal con `MatDialog` (`closeOnNavigation: false`, porque el cierre lo gobierna la ruta); al cerrarse navega a `/`; si la ruta se abandona (botón «atrás») cierra el modal.
- **Tarjeta:** `TrackingCard` recibe `dialogRoute="lactancia"`. Con ese input, el botón «+» y el contenido accionable navegan a `/lactancia` en lugar de abrir el diálogo directamente. Sin él, abre `dialogComponent` como antes (comportamiento de las tarjetas aún sin ruta).
- **Refresco de la tarjeta:** `DialogRouteHost` avisa con `DialogRouteEvents.notifyClosed(path)` y la `TrackingCard` cuyo `dialogRoute` coincide emite `closed`, que dispara su recarga. No refresques la tarjeta de otra forma.
- **Inicio** debe contener `<router-outlet />` para que las rutas hijas se activen. `Inicio` no se recrea al abrir o cerrar el modal.
- **Alta de un modal nuevo:** (1) crear el componente de diálogo con `TrackingDialogLayout`; (2) añadir su ruta hija; (3) poner `dialogRoute` en su tarjeta. Las rutas son en español y sin tildes (`lactancia`, `biberon`, `panal`, `sueno`). Una URL desconocida cae en `**` y redirige a Inicio.
- **Excepciones:** `ConfirmationDialog` no tiene ruta (es efímero y depende del estado del modal que lo abre). Un modal de edición de un registro concreto (`/lactancia/:id`) requeriría que `DialogRouteHost` pasara el `id` al diálogo; hoy no existe ninguno.

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
