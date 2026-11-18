import { HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { environment } from '@environments/environment';
import { Observable, from, switchMap } from 'rxjs';

function isApiUrl(url: string): boolean {
  if (!url.startsWith(environment.apiUrl)) {
    return false;
  }
  const next = url.charAt(environment.apiUrl.length);
  return next === '' || next === '/' || next === '?';
}

/**
 * Serves API requests from the mock backend when `environment.useMock` is on. The backend itself
 * (`mock-backend.handler.ts`, stores and seeds) is loaded on the first API request, outside the initial bundle.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (
  req,
  next,
): Observable<HttpEvent<unknown>> => {
  if (!environment.useMock || !isApiUrl(req.url)) {
    return next(req);
  }

  const injector = inject(Injector);
  return from(import('@app/core/mocks/mock-backend.handler')).pipe(
    switchMap(({ handleMockRequest }) => handleMockRequest(req, injector)),
  );
};
