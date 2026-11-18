import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '@app/core/notification.service';

/** Friendly messages for specific API error codes; they take precedence over the generic status messages. */
const ERROR_MESSAGES_BY_CODE: ReadonlyMap<string, string> = new Map([
  ['SLEEP_OVERLAP', 'Ya hay un sueño registrado en esas horas.'],
  ['SLEEP_IN_PROGRESS', 'Ya hay un sueño en curso.'],
]);

function getErrorCode(error: HttpErrorResponse): string | null {
  const body: unknown = error.error;
  if (typeof body !== 'object' || body === null || !('code' in body)) {
    return null;
  }
  return typeof body.code === 'string' ? body.code : null;
}

function getErrorMessage(error: HttpErrorResponse): string {
  const code = getErrorCode(error);
  return (code === null ? undefined : ERROR_MESSAGES_BY_CODE.get(code)) ?? getStatusMessage(error.status);
}

function getStatusMessage(status: number): string {
  if (status === 0) {
    return 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
  }
  if (status === 400 || status === 422) {
    return 'No se pudo procesar la solicitud. Revisa los datos e inténtalo de nuevo.';
  }
  if (status === 401 || status === 403) {
    return 'No tienes permiso para realizar esta acción.';
  }
  if (status === 404) {
    return 'No se encontró la información solicitada.';
  }
  if (status === 409) {
    return 'La operación entra en conflicto con el estado actual.';
  }
  if (status >= 500) {
    return 'Ha ocurrido un error en el servidor. Inténtalo de nuevo.';
  }
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}

export const httpErrorSnackbarInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        notifications.error(getErrorMessage(error));
      }
      return throwError(() => error);
    }),
  );
};
