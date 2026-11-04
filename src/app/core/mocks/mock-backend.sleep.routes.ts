import { HttpRequest } from '@angular/common/http';
import { MockApiError, notFound } from '@app/core/mocks/mock-backend.errors';
import {
  MockReply,
  matchBabyRoute,
  parsePageParameter,
  parseRecordRoute,
} from '@app/core/mocks/mock-backend.routing';
import { parseStatsRequest } from '@app/core/mocks/mock-backend.time';
import { MockSleepStore } from '@app/core/mocks/mock-backend.sleep.store';

const SESSIONS_ROUTE_PATTERN = /^\/babies\/([^/]+)\/sleep\/sessions(?:\/([^/]+))?\/?$/;
const STATS_ROUTE_PATTERN = /^\/babies\/([^/]+)\/sleep\/stats\/?$/;

/** Preference endpoints: URL pattern plus the store methods that read and write each one. */
const PREFERENCE_ROUTES: {
  pattern: RegExp;
  read: (store: MockSleepStore, babyId: string) => unknown;
  write: (store: MockSleepStore, babyId: string, body: unknown) => unknown;
}[] = [
  {
    pattern: /^\/babies\/([^/]+)\/preferences\/sleep-history\/?$/,
    read: (store, babyId) => store.getHistoryPreferences(babyId),
    write: (store, babyId, body) => store.saveHistoryPreferences(babyId, body),
  },
  {
    pattern: /^\/babies\/([^/]+)\/preferences\/sleep-awake-alert\/?$/,
    read: (store, babyId) => store.getAwakeAlertSettings(babyId),
    write: (store, babyId, body) => store.saveAwakeAlertSettings(babyId, body),
  },
  {
    pattern: /^\/babies\/([^/]+)\/preferences\/sleep-long-nap-alert\/?$/,
    read: (store, babyId) => store.getLongNapAlertSettings(babyId),
    write: (store, babyId, body) => store.saveLongNapAlertSettings(babyId, body),
  },
];

function routeNotFound(req: HttpRequest<unknown>): MockApiError {
  return notFound('ROUTE_NOT_FOUND', `No mocked route for ${req.method} ${req.url}.`);
}

function computeSessionReply(
  req: HttpRequest<unknown>,
  store: MockSleepStore,
  babyId: string,
  sessionId: string,
): MockReply {
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
  throw routeNotFound(req);
}

function computeCollectionReply(req: HttpRequest<unknown>, store: MockSleepStore, babyId: string): MockReply {
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

function computePreferencesReply(req: HttpRequest<unknown>, store: MockSleepStore): MockReply | null {
  for (const { pattern, read, write } of PREFERENCE_ROUTES) {
    const babyId = matchBabyRoute(req.url, pattern);
    if (babyId === null) {
      continue;
    }
    if (req.method === 'GET') {
      return { status: 200, body: read(store, babyId) };
    }
    if (req.method === 'PUT') {
      return { status: 200, body: write(store, babyId, req.body) };
    }
    throw routeNotFound(req);
  }
  return null;
}

/** Routes the sleep endpoints; returns null when the URL is not a sleep one. */
export function computeSleepReply(req: HttpRequest<unknown>, store: MockSleepStore): MockReply | null {
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

  const preferencesReply = computePreferencesReply(req, store);
  if (preferencesReply !== null) {
    return preferencesReply;
  }

  const route = parseRecordRoute(req.url, SESSIONS_ROUTE_PATTERN);
  if (route === null) {
    return null;
  }
  return route.recordId === null
    ? computeCollectionReply(req, store, route.babyId)
    : computeSessionReply(req, store, route.babyId, route.recordId);
}
