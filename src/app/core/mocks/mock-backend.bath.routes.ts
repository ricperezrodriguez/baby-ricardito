import { HttpRequest } from '@angular/common/http';
import { MockBathStore } from '@app/core/mocks/mock-backend.bath.store';
import { MockApiError, notFound } from '@app/core/mocks/mock-backend.errors';
import {
  MockReply,
  matchBabyRoute,
  parsePageParameter,
  parseRecordRoute,
} from '@app/core/mocks/mock-backend.routing';
import { parseStatsRequest } from '@app/core/mocks/mock-backend.time';

const BATHS_ROUTE_PATTERN = /^\/babies\/([^/]+)\/bath\/baths(?:\/([^/]+))?\/?$/;
const STATS_ROUTE_PATTERN = /^\/babies\/([^/]+)\/bath\/stats\/?$/;
const HISTORY_PREFERENCES_ROUTE_PATTERN = /^\/babies\/([^/]+)\/preferences\/bath-history\/?$/;
const OVERDUE_ALERT_ROUTE_PATTERN = /^\/babies\/([^/]+)\/preferences\/bath-overdue-alert\/?$/;

function routeNotFound(req: HttpRequest<unknown>): MockApiError {
  return notFound('ROUTE_NOT_FOUND', `No mocked route for ${req.method} ${req.url}.`);
}

/** GET reads and PUT saves one preferences document of the baby. */
function computePreferencesReply<T>(
  req: HttpRequest<unknown>,
  read: () => T,
  save: (body: unknown) => T,
): MockReply {
  if (req.method === 'GET') {
    return { status: 200, body: read() };
  }
  if (req.method === 'PUT') {
    return { status: 200, body: save(req.body) };
  }
  throw routeNotFound(req);
}

function computeSingleBathReply(
  req: HttpRequest<unknown>,
  store: MockBathStore,
  babyId: string,
  bathId: string,
): MockReply {
  if (req.method === 'GET') {
    return { status: 200, body: store.getById(babyId, bathId) };
  }
  if (req.method === 'PATCH') {
    return { status: 200, body: store.update(babyId, bathId, req.body) };
  }
  if (req.method === 'DELETE') {
    store.remove(babyId, bathId);
    return { status: 204, body: null };
  }
  throw routeNotFound(req);
}

function computeCollectionReply(
  req: HttpRequest<unknown>,
  store: MockBathStore,
  babyId: string,
): MockReply {
  if (req.method === 'POST') {
    return { status: 201, body: store.create(babyId, req.body) };
  }
  if (req.method === 'GET') {
    const limit = parsePageParameter(req.params.get('limit'), 'limit', 20, 1);
    const offset = parsePageParameter(req.params.get('offset'), 'offset', 0, 0);
    return { status: 200, body: store.list(babyId, limit, offset) };
  }
  throw routeNotFound(req);
}

/** Routes the bath endpoints; returns null when the URL is not a bath one. */
export function computeBathReply(
  req: HttpRequest<unknown>,
  store: MockBathStore,
): MockReply | null {
  const statsBabyId = matchBabyRoute(req.url, STATS_ROUTE_PATTERN);
  if (statsBabyId !== null) {
    if (req.method !== 'GET') {
      throw routeNotFound(req);
    }
    const request = parseStatsRequest({
      from: req.params.get('from'),
      to: req.params.get('to'),
      timeZone: req.params.get('tz'),
    });
    return { status: 200, body: store.stats(statsBabyId, request) };
  }

  const historyBabyId = matchBabyRoute(req.url, HISTORY_PREFERENCES_ROUTE_PATTERN);
  if (historyBabyId !== null) {
    return computePreferencesReply(
      req,
      () => store.getHistoryPreferences(historyBabyId),
      (body) => store.saveHistoryPreferences(historyBabyId, body),
    );
  }

  const alertBabyId = matchBabyRoute(req.url, OVERDUE_ALERT_ROUTE_PATTERN);
  if (alertBabyId !== null) {
    return computePreferencesReply(
      req,
      () => store.getOverdueAlertSettings(alertBabyId),
      (body) => store.saveOverdueAlertSettings(alertBabyId, body),
    );
  }

  const route = parseRecordRoute(req.url, BATHS_ROUTE_PATTERN);
  if (route === null) {
    return null;
  }
  return route.recordId === null
    ? computeCollectionReply(req, store, route.babyId)
    : computeSingleBathReply(req, store, route.babyId, route.recordId);
}
