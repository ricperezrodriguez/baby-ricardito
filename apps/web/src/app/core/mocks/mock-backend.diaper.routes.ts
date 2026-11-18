import { HttpRequest } from '@angular/common/http';
import { MockApiError, notFound } from '@app/core/mocks/mock-backend.errors';
import {
  MockReply,
  matchBabyRoute,
  parsePageParameter,
  parseRecordRoute,
} from '@app/core/mocks/mock-backend.routing';
import { parseStatsRequest } from '@app/core/mocks/mock-backend.time';
import { MockDiaperStore } from '@app/core/mocks/mock-backend.diaper.store';
import { parseTypeFilter } from '@app/core/mocks/mock-backend.diaper.validation';

const CHANGES_ROUTE_PATTERN = /^\/babies\/([^/]+)\/diaper\/changes(?:\/([^/]+)(\/photo)?)?\/?$/;
const STATS_ROUTE_PATTERN = /^\/babies\/([^/]+)\/diaper\/stats\/?$/;
const HISTORY_PREFERENCES_ROUTE_PATTERN = /^\/babies\/([^/]+)\/preferences\/diaper-history\/?$/;
const POOP_ALERT_ROUTE_PATTERN = /^\/babies\/([^/]+)\/preferences\/diaper-poop-alert\/?$/;

function routeNotFound(req: HttpRequest<unknown>): MockApiError {
  return notFound('ROUTE_NOT_FOUND', `No mocked route for ${req.method} ${req.url}.`);
}

function computePreferencesReply(
  req: HttpRequest<unknown>,
  store: MockDiaperStore,
  babyId: string,
  kind: 'history' | 'poopAlert',
): MockReply {
  const isHistory = kind === 'history';
  if (req.method === 'GET') {
    return { status: 200, body: isHistory ? store.getHistoryPreferences(babyId) : store.getPoopAlertSettings(babyId) };
  }
  if (req.method === 'PUT') {
    const body = isHistory
      ? store.saveHistoryPreferences(babyId, req.body)
      : store.savePoopAlertSettings(babyId, req.body);
    return { status: 200, body };
  }
  throw routeNotFound(req);
}

function computeChangeReply(
  req: HttpRequest<unknown>,
  store: MockDiaperStore,
  babyId: string,
  changeId: string,
  photo: boolean,
): MockReply {
  if (photo) {
    if (req.method === 'PUT') {
      return { status: 200, body: store.setPhoto(babyId, changeId, req.body) };
    }
    if (req.method === 'DELETE') {
      return { status: 200, body: store.removePhoto(babyId, changeId) };
    }
  } else if (req.method === 'GET') {
    return { status: 200, body: store.getById(babyId, changeId) };
  } else if (req.method === 'PATCH') {
    return { status: 200, body: store.update(babyId, changeId, req.body) };
  } else if (req.method === 'DELETE') {
    store.remove(babyId, changeId);
    return { status: 204, body: null };
  }
  throw routeNotFound(req);
}

function computeCollectionReply(req: HttpRequest<unknown>, store: MockDiaperStore, babyId: string): MockReply {
  if (req.method === 'POST') {
    return { status: 201, body: store.create(babyId, req.body) };
  }
  if (req.method === 'GET') {
    const limit = parsePageParameter(req.params.get('limit'), 'limit', 20, 1);
    const offset = parsePageParameter(req.params.get('offset'), 'offset', 0, 0);
    const types = parseTypeFilter(req.params.getAll('type') ?? []);
    return { status: 200, body: store.list(babyId, limit, offset, types) };
  }
  throw routeNotFound(req);
}

/** Routes the diaper endpoints; returns null when the URL is not a diaper one. */
export function computeDiaperReply(req: HttpRequest<unknown>, store: MockDiaperStore): MockReply | null {
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
    return computePreferencesReply(req, store, historyBabyId, 'history');
  }

  const poopAlertBabyId = matchBabyRoute(req.url, POOP_ALERT_ROUTE_PATTERN);
  if (poopAlertBabyId !== null) {
    return computePreferencesReply(req, store, poopAlertBabyId, 'poopAlert');
  }

  const route = parseRecordRoute(req.url, CHANGES_ROUTE_PATTERN);
  if (route === null) {
    return null;
  }
  return route.recordId === null
    ? computeCollectionReply(req, store, route.babyId)
    : computeChangeReply(req, store, route.babyId, route.recordId, route.photo);
}
