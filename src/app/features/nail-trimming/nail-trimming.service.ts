import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import {
  CreateNailTrimDto,
  NailTrim,
  NailTrimOverdueAlertSettings,
  NailTrimmingHistoryPreferences,
  NailTrimmingStats,
  NailTrimmingStatsRequest,
  NailTrimsPage,
  NailTrimsPageRequest,
  UpdateNailTrimDto,
} from '@app/features/nail-trimming/nail-trimming.models';
import { babyUrl, statsParams } from '@app/features/shared/tracker.api';
import { Observable, map } from 'rxjs';

@Service()
export class NailTrimmingService {
  private readonly http = inject(HttpClient);

  create(dto: CreateNailTrimDto): Observable<NailTrim> {
    return this.http.post<NailTrim>(this.trimsUrl(dto.babyId), dto);
  }

  /** Newest first. */
  getPage(babyId: string, request: NailTrimsPageRequest): Observable<NailTrimsPage> {
    const params = new HttpParams().set('limit', request.limit).set('offset', request.offset);
    return this.http.get<NailTrimsPage>(this.trimsUrl(babyId), { params });
  }

  /** Most recent trim; null when there is none. */
  getLatest(babyId: string): Observable<NailTrim | null> {
    return this.getPage(babyId, { limit: 1, offset: 0 }).pipe(map(({ items }) => items[0] ?? null));
  }

  getById(babyId: string, trimId: string): Observable<NailTrim> {
    return this.http.get<NailTrim>(this.trimUrl(babyId, trimId));
  }

  update(babyId: string, trimId: string, dto: UpdateNailTrimDto): Observable<NailTrim> {
    return this.http.patch<NailTrim>(this.trimUrl(babyId, trimId), dto);
  }

  delete(babyId: string, trimId: string): Observable<void> {
    return this.http.delete<void>(this.trimUrl(babyId, trimId));
  }

  getStats(babyId: string, request: NailTrimmingStatsRequest): Observable<NailTrimmingStats> {
    return this.http.get<NailTrimmingStats>(`${babyUrl(babyId)}/nail-trimming/stats`, {
      params: statsParams(request),
    });
  }

  getHistoryPreferences(babyId: string): Observable<NailTrimmingHistoryPreferences> {
    return this.http.get<NailTrimmingHistoryPreferences>(this.historyPreferencesUrl(babyId));
  }

  saveHistoryPreferences(
    babyId: string,
    preferences: NailTrimmingHistoryPreferences,
  ): Observable<NailTrimmingHistoryPreferences> {
    return this.http.put<NailTrimmingHistoryPreferences>(
      this.historyPreferencesUrl(babyId),
      preferences,
    );
  }

  getOverdueAlertSettings(babyId: string): Observable<NailTrimOverdueAlertSettings> {
    return this.http.get<NailTrimOverdueAlertSettings>(this.overdueAlertUrl(babyId));
  }

  saveOverdueAlertSettings(
    babyId: string,
    settings: NailTrimOverdueAlertSettings,
  ): Observable<NailTrimOverdueAlertSettings> {
    return this.http.put<NailTrimOverdueAlertSettings>(this.overdueAlertUrl(babyId), settings);
  }

  private trimsUrl(babyId: string): string {
    return `${babyUrl(babyId)}/nail-trimming/trims`;
  }

  private trimUrl(babyId: string, trimId: string): string {
    return `${this.trimsUrl(babyId)}/${encodeURIComponent(trimId)}`;
  }

  private historyPreferencesUrl(babyId: string): string {
    return `${babyUrl(babyId)}/preferences/nail-trimming-history`;
  }

  private overdueAlertUrl(babyId: string): string {
    return `${babyUrl(babyId)}/preferences/nail-trimming-overdue-alert`;
  }
}
