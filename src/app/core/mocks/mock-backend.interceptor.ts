import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, defer, delay, mergeMap, of, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { MockApiError, badRequest, notFound } from '@app/core/mocks/mock-backend.errors';
import { MockBackendStore } from '@app/core/mocks/mock-backend.store';
import { parseStatsRequest } from '@app/core/mocks/mock-backend.stats';

interface MockReply {
  status: number;
  body: unknown;
}

interface SessionsRoute {
  babyId: string;
  sessionId: string | null;
  photo: boolean;
}

const SESSIONS_ROUTE_PATTERN = /^\/babies\/([^/]+)\/breastfeeding\/sessions(?:\/([^/]+)(\/photo)?)?\/?$/;
const STATS_ROUTE_PATTERN = /^\/babies\/([^/]+)\/breastfeeding\/stats\/?$/;
const HISTORY_PREFERENCES_ROUTE_PATTERN = /^\/babies\/([^/]+)\/preferences\/breastfeeding-history\/?$/;

const STATUS_TEXTS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
};

function isApiUrl(url: string): boolean {
  if (!url.startsWith(environment.apiUrl)) {
    return false;
  }
  const next = url.charAt(environment.apiUrl.length);
  return next === '' || next === '/' || next === '?';
}

function parseSessionsRoute(url: string): SessionsRoute | null {
  const path = url.slice(environment.apiUrl.length).split('?')[0];
  const match = SESSIONS_ROUTE_PATTERN.exec(path);
  if (match === null) {
    return null;
  }
  return {
    babyId: decodeURIComponent(match[1]),
    sessionId: match[2] === undefined ? null : decodeURIComponent(match[2]),
    photo: match[3] !== undefined,
  };
}

function parsePageParameter(value: string | null, name: string, defaultValue: number, minimum: number): number {
  if (value === null) {
    return defaultValue;
  }
  if (!/^\d+$/.test(value)) {
    throw badRequest('INVALID_PAGINATION', `"${name}" must be an integer greater than or equal to ${minimum}.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw badRequest('INVALID_PAGINATION', `"${name}" must be an integer greater than or equal to ${minimum}.`);
  }
  return parsed;
}

function matchBabyRoute(url: string, pattern: RegExp): string | null {
  const match = pattern.exec(url.slice(environment.apiUrl.length).split('?')[0]);
  return match === null ? null : decodeURIComponent(match[1]);
}

function computeReply(req: HttpRequest<unknown>, store: MockBackendStore): MockReply {
  const statsBabyId = matchBabyRoute(req.url, STATS_ROUTE_PATTERN);
  if (statsBabyId !== null && req.method === 'GET') {
    const request = parseStatsRequest({
      from: req.params.get('from'),
      to: req.params.get('to'),
      timeZone: req.params.get('tz'),
    });
    return { status: 200, body: store.stats(statsBabyId, request) };
  }

  const preferencesBabyId = matchBabyRoute(req.url, HISTORY_PREFERENCES_ROUTE_PATTERN);
  if (preferencesBabyId !== null) {
    if (req.method === 'GET') {
      return { status: 200, body: store.getHistoryPreferences(preferencesBabyId) };
    }
    if (req.method === 'PUT') {
      return { status: 200, body: store.saveHistoryPreferences(preferencesBabyId, req.body) };
    }
  }

  const route = parseSessionsRoute(req.url);
  if (route === null) {
    throw notFound('ROUTE_NOT_FOUND', `No mocked route for ${req.method} ${req.url}.`);
  }
  const { babyId, sessionId, photo } = route;

  if (sessionId !== null && photo) {
    if (req.method === 'PUT') {
      return { status: 200, body: store.setPhoto(babyId, sessionId, req.body) };
    }
    if (req.method === 'DELETE') {
      return { status: 200, body: store.removePhoto(babyId, sessionId) };
    }
  } else if (sessionId === null) {
    if (req.method === 'POST') {
      return { status: 201, body: store.create(babyId, req.body) };
    }
    if (req.method === 'GET') {
      const limit = parsePageParameter(req.params.get('limit'), 'limit', 20, 1);
      const offset = parsePageParameter(req.params.get('offset'), 'offset', 0, 0);
      return { status: 200, body: store.list(babyId, limit, offset) };
    }
  } else {
    if (req.method === 'GET') {
      return { status: 200, body: store.getById(babyId, sessionId) };
    }
    if (req.method === 'PATCH') {
      return { status: 200, body: store.update(babyId, sessionId, req.body) };
    }
    if (req.method === 'DELETE') {
      store.remove(babyId, sessionId);
      return { status: 204, body: null };
    }
  }
  throw notFound('ROUTE_NOT_FOUND', `No mocked route for ${req.method} ${req.url}.`);
}

function toError(error: unknown): MockApiError {
  if (error instanceof MockApiError) {
    return error;
  }
  throw error;
}

function logMock(req: HttpRequest<unknown>, status: number, detail: unknown): void {
  console.log(`[MOCK] ${req.method} ${req.urlWithParams} -> ${status}`, { requestBody: req.body, response: detail });
}

function resolveOutcome(req: HttpRequest<unknown>, store: MockBackendStore): HttpEvent<unknown> | HttpErrorResponse {
  try {
    const reply = computeReply(req, store);
    logMock(req, reply.status, reply.body);
    return new HttpResponse({
      status: reply.status,
      statusText: STATUS_TEXTS[reply.status],
      body: reply.body,
      url: req.urlWithParams,
    });
  } catch (caught) {
    const error = toError(caught);
    logMock(req, error.status, error.toBody());
    return new HttpErrorResponse({
      status: error.status,
      statusText: STATUS_TEXTS[error.status],
      error: error.toBody(),
      url: req.urlWithParams,
    });
  }
}

function randomDelayMs(): number {
  const { min, max } = environment.mockDelayMs;
  return Math.round(min + Math.random() * Math.max(0, max - min));
}

export const mockBackendInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  if (!environment.useMock || !isApiUrl(req.url)) {
    return next(req);
  }

  const store = inject(MockBackendStore);

  // The delay is applied to errors too, so they are materialized as values first.
  return defer(() => of(resolveOutcome(req, store))).pipe(
    delay(randomDelayMs()),
    mergeMap((outcome) => (outcome instanceof HttpErrorResponse ? throwError(() => outcome) : of(outcome))),
  );
};
