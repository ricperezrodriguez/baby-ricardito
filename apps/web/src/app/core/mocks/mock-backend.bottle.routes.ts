import { HttpRequest } from '@angular/common/http';
import { MockApiError, notFound } from '@app/core/mocks/mock-backend.errors';
import {
  MockReply,
  matchBabyRoute,
  parsePageParameter,
  parseRecordRoute,
} from '@app/core/mocks/mock-backend.routing';
import { parseStatsRequest } from '@app/core/mocks/mock-backend.time';
import { MockBottleStore } from '@app/core/mocks/mock-backend.bottle.store';
import { parseMilkTypeFilter } from '@app/core/mocks/mock-backend.bottle.validation';

const FEEDS_ROUTE_PATTERN = /^\/babies\/([^/]+)\/bottle\/feeds(?:\/([^/]+))?\/?$/;
const STATS_ROUTE_PATTERN = /^\/babies\/([^/]+)\/bottle\/stats\/?$/;
const HISTORY_PREFERENCES_ROUTE_PATTERN = /^\/babies\/([^/]+)\/preferences\/bottle-history\/?$/;

function routeNotFound(req: HttpRequest<unknown>): MockApiError {
  return notFound('ROUTE_NOT_FOUND', `No mocked route for ${req.method} ${req.url}.`);
}

function computePreferencesReply(req: HttpRequest<unknown>, store: MockBottleStore, babyId: string): MockReply {
  if (req.method === 'GET') {
    return { status: 200, body: store.getHistoryPreferences(babyId) };
  }
  if (req.method === 'PUT') {
    return { status: 200, body: store.saveHistoryPreferences(babyId, req.body) };
  }
  throw routeNotFound(req);
}

function computeFeedReply(req: HttpRequest<unknown>, store: MockBottleStore, babyId: string, feedId: string): MockReply {
  if (req.method === 'GET') {
    return { status: 200, body: store.getById(babyId, feedId) };
  }
  if (req.method === 'PATCH') {
    return { status: 200, body: store.update(babyId, feedId, req.body) };
  }
  if (req.method === 'DELETE') {
    store.remove(babyId, feedId);
    return { status: 204, body: null };
  }
  throw routeNotFound(req);
}

function computeCollectionReply(req: HttpRequest<unknown>, store: MockBottleStore, babyId: string): MockReply {
  if (req.method === 'POST') {
    return { status: 201, body: store.create(babyId, req.body) };
  }
  if (req.method === 'GET') {
    const limit = parsePageParameter(req.params.get('limit'), 'limit', 20, 1);
    const offset = parsePageParameter(req.params.get('offset'), 'offset', 0, 0);
    const milkTypes = parseMilkTypeFilter(req.params.getAll('milkType') ?? []);
    return { status: 200, body: store.list(babyId, limit, offset, milkTypes) };
  }
  throw routeNotFound(req);
}

/** Routes the bottle endpoints; returns null when the URL is not a bottle one. */
export function computeBottleReply(req: HttpRequest<unknown>, store: MockBottleStore): MockReply | null {
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
    return computePreferencesReply(req, store, historyBabyId);
  }

  const route = parseRecordRoute(req.url, FEEDS_ROUTE_PATTERN);
  if (route === null) {
    return null;
  }
  return route.recordId === null
    ? computeCollectionReply(req, store, route.babyId)
    : computeFeedReply(req, store, route.babyId, route.recordId);
}
