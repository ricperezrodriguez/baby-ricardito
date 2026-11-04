import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  CreateSleepSessionDto,
  SleepAwakeAlertSettings,
  SleepHistoryPreferences,
  SleepLongNapAlertSettings,
  SleepSession,
  SleepSessionsPage,
  SleepSessionsPageRequest,
  SleepStats,
  SleepStatsRequest,
  UpdateSleepSessionDto,
} from '@app/features/sleep/sleep.models';
import { babyUrl, statsParams } from '@app/features/shared/tracker.api';

@Service()
export class SleepService {
  private readonly http = inject(HttpClient);

  create(dto: CreateSleepSessionDto): Observable<SleepSession> {
    return this.http.post<SleepSession>(this.sessionsUrl(dto.babyId), dto);
  }

  /** Newest start first (an ongoing sleep is always the first one). */
  getPage(babyId: string, request: SleepSessionsPageRequest): Observable<SleepSessionsPage> {
    const params = new HttpParams().set('limit', request.limit).set('offset', request.offset);
    return this.http.get<SleepSessionsPage>(this.sessionsUrl(babyId), { params });
  }

  /** Session with the latest start (the ongoing one when there is one); null when there is none. */
  getLatest(babyId: string): Observable<SleepSession | null> {
    return this.getPage(babyId, { limit: 1, offset: 0 }).pipe(map(({ items }) => items[0] ?? null));
  }

  getById(babyId: string, sessionId: string): Observable<SleepSession> {
    return this.http.get<SleepSession>(this.sessionUrl(babyId, sessionId));
  }

  /** Waking up the baby is `update(..., { endTime })`. */
  update(babyId: string, sessionId: string, dto: UpdateSleepSessionDto): Observable<SleepSession> {
    return this.http.patch<SleepSession>(this.sessionUrl(babyId, sessionId), dto);
  }

  delete(babyId: string, sessionId: string): Observable<void> {
    return this.http.delete<void>(this.sessionUrl(babyId, sessionId));
  }

  getStats(babyId: string, request: SleepStatsRequest): Observable<SleepStats> {
    return this.http.get<SleepStats>(`${babyUrl(babyId)}/sleep/stats`, { params: statsParams(request) });
  }

  getHistoryPreferences(babyId: string): Observable<SleepHistoryPreferences> {
    return this.http.get<SleepHistoryPreferences>(this.preferencesUrl(babyId, 'sleep-history'));
  }

  saveHistoryPreferences(babyId: string, preferences: SleepHistoryPreferences): Observable<SleepHistoryPreferences> {
    return this.http.put<SleepHistoryPreferences>(this.preferencesUrl(babyId, 'sleep-history'), preferences);
  }

  getAwakeAlertSettings(babyId: string): Observable<SleepAwakeAlertSettings> {
    return this.http.get<SleepAwakeAlertSettings>(this.preferencesUrl(babyId, 'sleep-awake-alert'));
  }

  saveAwakeAlertSettings(babyId: string, settings: SleepAwakeAlertSettings): Observable<SleepAwakeAlertSettings> {
    return this.http.put<SleepAwakeAlertSettings>(this.preferencesUrl(babyId, 'sleep-awake-alert'), settings);
  }

  getLongNapAlertSettings(babyId: string): Observable<SleepLongNapAlertSettings> {
    return this.http.get<SleepLongNapAlertSettings>(this.preferencesUrl(babyId, 'sleep-long-nap-alert'));
  }

  saveLongNapAlertSettings(babyId: string, settings: SleepLongNapAlertSettings): Observable<SleepLongNapAlertSettings> {
    return this.http.put<SleepLongNapAlertSettings>(this.preferencesUrl(babyId, 'sleep-long-nap-alert'), settings);
  }

  private sessionsUrl(babyId: string): string {
    return `${babyUrl(babyId)}/sleep/sessions`;
  }

  private sessionUrl(babyId: string, sessionId: string): string {
    return `${this.sessionsUrl(babyId)}/${encodeURIComponent(sessionId)}`;
  }

  private preferencesUrl(babyId: string, name: string): string {
    return `${babyUrl(babyId)}/preferences/${name}`;
  }
}
