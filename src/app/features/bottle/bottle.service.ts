import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  BottleFeed,
  BottleFeedsPage,
  BottleFeedsPageRequest,
  BottleHistoryPreferences,
  BottleStats,
  BottleStatsRequest,
  CreateBottleFeedDto,
  UpdateBottleFeedDto,
} from '@app/features/bottle/bottle.models';
import { babyUrl, statsParams } from '@app/features/shared/tracker.api';

@Service()
export class BottleService {
  private readonly http = inject(HttpClient);

  create(dto: CreateBottleFeedDto): Observable<BottleFeed> {
    return this.http.post<BottleFeed>(this.feedsUrl(dto.babyId), dto);
  }

  /** Newest first; `request.milkTypes` filters by milk type. */
  getPage(babyId: string, request: BottleFeedsPageRequest): Observable<BottleFeedsPage> {
    let params = new HttpParams().set('limit', request.limit).set('offset', request.offset);
    for (const milkType of request.milkTypes ?? []) {
      params = params.append('milkType', milkType);
    }
    return this.http.get<BottleFeedsPage>(this.feedsUrl(babyId), { params });
  }

  /** Most recent feed; null when there is none. */
  getLatest(babyId: string): Observable<BottleFeed | null> {
    return this.getPage(babyId, { limit: 1, offset: 0 }).pipe(map(({ items }) => items[0] ?? null));
  }

  getById(babyId: string, feedId: string): Observable<BottleFeed> {
    return this.http.get<BottleFeed>(this.feedUrl(babyId, feedId));
  }

  update(babyId: string, feedId: string, dto: UpdateBottleFeedDto): Observable<BottleFeed> {
    return this.http.patch<BottleFeed>(this.feedUrl(babyId, feedId), dto);
  }

  delete(babyId: string, feedId: string): Observable<void> {
    return this.http.delete<void>(this.feedUrl(babyId, feedId));
  }

  getStats(babyId: string, request: BottleStatsRequest): Observable<BottleStats> {
    return this.http.get<BottleStats>(`${babyUrl(babyId)}/bottle/stats`, { params: statsParams(request) });
  }

  getHistoryPreferences(babyId: string): Observable<BottleHistoryPreferences> {
    return this.http.get<BottleHistoryPreferences>(this.historyPreferencesUrl(babyId));
  }

  saveHistoryPreferences(babyId: string, preferences: BottleHistoryPreferences): Observable<BottleHistoryPreferences> {
    return this.http.put<BottleHistoryPreferences>(this.historyPreferencesUrl(babyId), preferences);
  }

  private feedsUrl(babyId: string): string {
    return `${babyUrl(babyId)}/bottle/feeds`;
  }

  private feedUrl(babyId: string, feedId: string): string {
    return `${this.feedsUrl(babyId)}/${encodeURIComponent(feedId)}`;
  }

  private historyPreferencesUrl(babyId: string): string {
    return `${babyUrl(babyId)}/preferences/bottle-history`;
  }
}
