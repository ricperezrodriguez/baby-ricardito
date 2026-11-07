import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, defer, delay, mergeMap, of, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { MockApiError, notFound } from '@app/core/mocks/mock-backend.errors';
import { MockBackendStore } from '@app/core/mocks/mock-backend.store';
import { parseStatsRequest } from '@app/core/mocks/mock-backend.time';
import {
  MockReply,
  STATUS_TEXTS,
  matchBabyRoute,
  parsePageParameter,
  parseRecordRoute,
} from '@app/core/mocks/mock-backend.routing';
import { MockDiaperStore } from '@app/core/mocks/mock-backend.diaper.store';
import { computeDiaperReply } from '@app/core/mocks/mock-backend.diaper.routes';
import { MockSleepStore } from '@app/core/mocks/mock-backend.sleep.store';
import { computeSleepReply } from '@app/core/mocks/mock-backend.sleep.routes';
import { MockBottleStore } from '@app/core/mocks/mock-backend.bottle.store';
import { computeBottleReply } from '@app/core/mocks/mock-backend.bottle.routes';
import { MockFeedingStore } from '@app/core/mocks/mock-backend.feeding.store';
import { computeFeedingReply } from '@app/core/mocks/mock-backend.feeding.routes';
import { MockVitaminDStore } from '@app/core/mocks/mock-backend.vitamin-d.store';
import { computeVitaminDReply } from '@app/core/mocks/mock-backend.vitamin-d.routes';

/** Every in-memory store of the mock backend. */
interface MockStores {
  breastfeeding: MockBackendStore;
  diaper: MockDiaperStore;
  sleep: MockSleepStore;
  bottle: MockBottleStore;
  feeding: MockFeedingStore;
  vitaminD: MockVitaminDStore;
}

const SESSIONS_ROUTE_PATTERN = /^\/babies\/([^/]+)\/breastfeeding\/sessions(?:\/([^/]+)(\/photo)?)?\/?$/;
const STATS_ROUTE_PATTERN = /^\/babies\/([^/]+)\/breastfeeding\/stats\/?$/;
const HISTORY_PREFERENCES_ROUTE_PATTERN = /^\/babies\/([^/]+)\/preferences\/breastfeeding-history\/?$/;

function isApiUrl(url: string): boolean {
  if (!url.startsWith(environment.apiUrl)) {
    return false;
  }
  const next = url.charAt(environment.apiUrl.length);
  return next === '' || next === '/' || next === '?';
}

function computeReply(req: HttpRequest<unknown>, stores: MockStores): MockReply {
  const { breastfeeding: store } = stores;
  const diaperReply = computeDiaperReply(req, stores.diaper);
  if (diaperReply !== null) {
    return diaperReply;
  }

  const sleepReply = computeSleepReply(req, stores.sleep);
  if (sleepReply !== null) {
    return sleepReply;
  }

  const bottleReply = computeBottleReply(req, stores.bottle);
  if (bottleReply !== null) {
    return bottleReply;
  }

  const feedingReply = computeFeedingReply(req, stores.feeding);
  if (feedingReply !== null) {
    return feedingReply;
  }

  const vitaminDReply = computeVitaminDReply(req, stores.vitaminD);
  if (vitaminDReply !== null) {
    return vitaminDReply;
  }

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

  const route = parseRecordRoute(req.url, SESSIONS_ROUTE_PATTERN);
  if (route === null) {
    throw notFound('ROUTE_NOT_FOUND', `No mocked route for ${req.method} ${req.url}.`);
  }
  const { babyId, recordId: sessionId, photo } = route;

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

function resolveOutcome(req: HttpRequest<unknown>, stores: MockStores): HttpEvent<unknown> | HttpErrorResponse {
  try {
    const reply = computeReply(req, stores);
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

  const stores: MockStores = {
    breastfeeding: inject(MockBackendStore),
    diaper: inject(MockDiaperStore),
    sleep: inject(MockSleepStore),
    bottle: inject(MockBottleStore),
    feeding: inject(MockFeedingStore),
    vitaminD: inject(MockVitaminDStore),
  };

  // The delay is applied to errors too, so they are materialized as values first.
  return defer(() => of(resolveOutcome(req, stores))).pipe(
    delay(randomDelayMs()),
    mergeMap((outcome) => (outcome instanceof HttpErrorResponse ? throwError(() => outcome) : of(outcome))),
  );
};
