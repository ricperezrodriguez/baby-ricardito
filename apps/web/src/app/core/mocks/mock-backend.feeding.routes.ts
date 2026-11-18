import { HttpRequest } from '@angular/common/http';
import { notFound } from '@app/core/mocks/mock-backend.errors';
import { MockReply, matchBabyRoute } from '@app/core/mocks/mock-backend.routing';
import { MockFeedingStore } from '@app/core/mocks/mock-backend.feeding.store';

const OVERDUE_ALERT_ROUTE_PATTERN = /^\/babies\/([^/]+)\/preferences\/feeding-overdue-alert\/?$/;

/** Routes the feeding preferences endpoints; returns null when the URL is not a feeding one. */
export function computeFeedingReply(req: HttpRequest<unknown>, store: MockFeedingStore): MockReply | null {
  const babyId = matchBabyRoute(req.url, OVERDUE_ALERT_ROUTE_PATTERN);
  if (babyId === null) {
    return null;
  }
  if (req.method === 'GET') {
    return { status: 200, body: store.getOverdueAlertSettings(babyId) };
  }
  if (req.method === 'PUT') {
    return { status: 200, body: store.saveOverdueAlertSettings(babyId, req.body) };
  }
  throw notFound('ROUTE_NOT_FOUND', `No mocked route for ${req.method} ${req.url}.`);
}
