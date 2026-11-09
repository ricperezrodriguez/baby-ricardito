import { HttpRequest } from '@angular/common/http';
import { MockApiError, notFound } from '@app/core/mocks/mock-backend.errors';
import { MockNailTrimmingStore } from '@app/core/mocks/mock-backend.nail-trimming.store';
import {
  MockReply,
  matchBabyRoute,
  parsePageParameter,
  parseRecordRoute,
} from '@app/core/mocks/mock-backend.routing';
import { parseStatsRequest } from '@app/core/mocks/mock-backend.time';

const TRIMS_ROUTE_PATTERN = /^\/babies\/([^/]+)\/nail-trimming\/trims(?:\/([^/]+))?\/?$/;
const STATS_ROUTE_PATTERN = /^\/babies\/([^/]+)\/nail-trimming\/stats\/?$/;
const HISTORY_PREFERENCES_ROUTE_PATTERN =
  /^\/babies\/([^/]+)\/preferences\/nail-trimming-history\/?$/;
const OVERDUE_ALERT_ROUTE_PATTERN =
  /^\/babies\/([^/]+)\/preferences\/nail-trimming-overdue-alert\/?$/;

function routeNotFound(req: HttpRequest<unknown>): MockApiError {
  return notFound('ROUTE_NOT_FOUND', `No mocked route for ${req.method} ${req.url}.`);
}

function computeHistoryPreferencesReply(
  req: HttpRequest<unknown>,
  store: MockNailTrimmingStore,
  babyId: string,
): MockReply {
  if (req.method === 'GET') {
    return { status: 200, body: store.getHistoryPreferences(babyId) };
  }
  if (req.method === 'PUT') {
    return { status: 200, body: store.saveHistoryPreferences(babyId, req.body) };
  }
  throw routeNotFound(req);
}

function computeOverdueAlertReply(
  req: HttpRequest<unknown>,
  store: MockNailTrimmingStore,
  babyId: string,
): MockReply {
  if (req.method === 'GET') {
    return { status: 200, body: store.getOverdueAlertSettings(babyId) };
  }
  if (req.method === 'PUT') {
    return { status: 200, body: store.saveOverdueAlertSettings(babyId, req.body) };
  }
  throw routeNotFound(req);
}

function computeTrimReply(
  req: HttpRequest<unknown>,
  store: MockNailTrimmingStore,
  babyId: string,
  trimId: string,
): MockReply {
  if (req.method === 'GET') {
    return { status: 200, body: store.getById(babyId, trimId) };
  }
  if (req.method === 'PATCH') {
    return { status: 200, body: store.update(babyId, trimId, req.body) };
  }
  if (req.method === 'DELETE') {
    store.remove(babyId, trimId);
    return { status: 204, body: null };
  }
  throw routeNotFound(req);
}

function computeCollectionReply(
  req: HttpRequest<unknown>,
  store: MockNailTrimmingStore,
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

/** Routes the nail trimming endpoints; returns null when the URL is not a nail trimming one. */
export function computeNailTrimmingReply(
  req: HttpRequest<unknown>,
  store: MockNailTrimmingStore,
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
    return computeHistoryPreferencesReply(req, store, historyBabyId);
  }

  const alertBabyId = matchBabyRoute(req.url, OVERDUE_ALERT_ROUTE_PATTERN);
  if (alertBabyId !== null) {
    return computeOverdueAlertReply(req, store, alertBabyId);
  }

  const route = parseRecordRoute(req.url, TRIMS_ROUTE_PATTERN);
  if (route === null) {
    return null;
  }
  return route.recordId === null
    ? computeCollectionReply(req, store, route.babyId)
    : computeTrimReply(req, store, route.babyId, route.recordId);
}
