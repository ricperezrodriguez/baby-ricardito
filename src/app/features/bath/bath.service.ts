import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import {
  Bath,
  BathHistoryPreferences,
  BathOverdueAlertSettings,
  BathStats,
  BathStatsRequest,
  BathsPage,
  BathsPageRequest,
  CreateBathDto,
  UpdateBathDto,
} from '@app/features/bath/bath.models';
import { babyUrl, statsParams } from '@app/features/shared/tracker.api';
import { Observable, map } from 'rxjs';

@Service()
export class BathService {
  private readonly http = inject(HttpClient);

  create(dto: CreateBathDto): Observable<Bath> {
    return this.http.post<Bath>(this.bathsUrl(dto.babyId), dto);
  }

  /** Newest first. */
  getPage(babyId: string, request: BathsPageRequest): Observable<BathsPage> {
    const params = new HttpParams().set('limit', request.limit).set('offset', request.offset);
    return this.http.get<BathsPage>(this.bathsUrl(babyId), { params });
  }

  /** Most recent bath; null when there is none. */
  getLatest(babyId: string): Observable<Bath | null> {
    return this.getPage(babyId, { limit: 1, offset: 0 }).pipe(map(({ items }) => items[0] ?? null));
  }

  getById(babyId: string, bathId: string): Observable<Bath> {
    return this.http.get<Bath>(this.bathUrl(babyId, bathId));
  }

  update(babyId: string, bathId: string, dto: UpdateBathDto): Observable<Bath> {
    return this.http.patch<Bath>(this.bathUrl(babyId, bathId), dto);
  }

  delete(babyId: string, bathId: string): Observable<void> {
    return this.http.delete<void>(this.bathUrl(babyId, bathId));
  }

  getStats(babyId: string, request: BathStatsRequest): Observable<BathStats> {
    return this.http.get<BathStats>(`${babyUrl(babyId)}/bath/stats`, {
      params: statsParams(request),
    });
  }

  getHistoryPreferences(babyId: string): Observable<BathHistoryPreferences> {
    return this.http.get<BathHistoryPreferences>(this.historyPreferencesUrl(babyId));
  }

  saveHistoryPreferences(
    babyId: string,
    preferences: BathHistoryPreferences,
  ): Observable<BathHistoryPreferences> {
    return this.http.put<BathHistoryPreferences>(this.historyPreferencesUrl(babyId), preferences);
  }

  getOverdueAlertSettings(babyId: string): Observable<BathOverdueAlertSettings> {
    return this.http.get<BathOverdueAlertSettings>(this.overdueAlertUrl(babyId));
  }

  saveOverdueAlertSettings(
    babyId: string,
    settings: BathOverdueAlertSettings,
  ): Observable<BathOverdueAlertSettings> {
    return this.http.put<BathOverdueAlertSettings>(this.overdueAlertUrl(babyId), settings);
  }

  private bathsUrl(babyId: string): string {
    return `${babyUrl(babyId)}/bath/baths`;
  }

  private bathUrl(babyId: string, bathId: string): string {
    return `${this.bathsUrl(babyId)}/${encodeURIComponent(bathId)}`;
  }

  private historyPreferencesUrl(babyId: string): string {
    return `${babyUrl(babyId)}/preferences/bath-history`;
  }

  private overdueAlertUrl(babyId: string): string {
    return `${babyUrl(babyId)}/preferences/bath-overdue-alert`;
  }
}
