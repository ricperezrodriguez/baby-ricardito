// tracker.api.ts: URL and query helpers shared by the HTTP services of the tracker features

import { HttpParams } from '@angular/common/http';
import { environment } from '@environments/environment';
import { StatsRequest } from '@app/features/shared/tracker.models';

/** Base URL of a baby: `<api>/babies/:babyId` */
export function babyUrl(babyId: string): string {
  return `${environment.apiUrl}/babies/${encodeURIComponent(babyId)}`;
}

/** Query string of a stats endpoint: `from`, `to` and `tz` */
export function statsParams(request: StatsRequest): HttpParams {
  return new HttpParams().set('from', request.from).set('to', request.to).set('tz', request.timeZone);
}
