import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, Subject, map, tap } from 'rxjs';
import { environment } from '@environments/environment';
import {
  BREASTFEEDING_PHOTO_FIELD,
  BreastfeedingHistoryPreferences,
  BreastfeedingSession,
  BreastfeedingSessionsPage,
  BreastfeedingSessionsPageRequest,
  BreastfeedingStats,
  BreastfeedingStatsRequest,
  CreateBreastfeedingSessionDto,
  UpdateBreastfeedingSessionDto,
} from '@app/features/breastfeeding/breastfeeding.models';

/** Where a stored change was made: inside the app or from the system notification of the running feed. */
export type BreastfeedingChangeOrigin = 'app' | 'notification';

export interface BreastfeedingSessionChange {
  readonly origin: BreastfeedingChangeOrigin;
  /** Stored session after the change; `null` when it was deleted. */
  readonly session: BreastfeedingSession | null;
}

@Service()
export class BreastfeedingService {
  private readonly http = inject(HttpClient);
  private readonly changesSubject = new Subject<BreastfeedingSessionChange>();

  /** Every session created, updated or deleted, so the views showing the running feed stay in sync. */
  readonly changes = this.changesSubject.asObservable();

  create(dto: CreateBreastfeedingSessionDto): Observable<BreastfeedingSession> {
    return this.http
      .post<BreastfeedingSession>(this.sessionsUrl(dto.babyId), dto)
      .pipe(tap((session) => this.emitChange('app', session)));
  }

  getPage(babyId: string, request: BreastfeedingSessionsPageRequest): Observable<BreastfeedingSessionsPage> {
    const params = new HttpParams().set('limit', request.limit).set('offset', request.offset);
    return this.http.get<BreastfeedingSessionsPage>(this.sessionsUrl(babyId), { params });
  }

  getLatest(babyId: string): Observable<BreastfeedingSession | null> {
    return this.getPage(babyId, { limit: 1, offset: 0 }).pipe(map(({ items }) => items[0] ?? null));
  }

  getById(babyId: string, sessionId: string): Observable<BreastfeedingSession> {
    return this.http.get<BreastfeedingSession>(this.sessionUrl(babyId, sessionId));
  }

  getStats(babyId: string, request: BreastfeedingStatsRequest): Observable<BreastfeedingStats> {
    const params = new HttpParams()
      .set('from', request.from)
      .set('to', request.to)
      .set('tz', request.timeZone);
    return this.http.get<BreastfeedingStats>(`${this.babyUrl(babyId)}/breastfeeding/stats`, { params });
  }

  getHistoryPreferences(babyId: string): Observable<BreastfeedingHistoryPreferences> {
    return this.http.get<BreastfeedingHistoryPreferences>(this.historyPreferencesUrl(babyId));
  }

  saveHistoryPreferences(
    babyId: string,
    preferences: BreastfeedingHistoryPreferences,
  ): Observable<BreastfeedingHistoryPreferences> {
    return this.http.put<BreastfeedingHistoryPreferences>(this.historyPreferencesUrl(babyId), preferences);
  }

  update(
    babyId: string,
    sessionId: string,
    dto: UpdateBreastfeedingSessionDto,
    origin: BreastfeedingChangeOrigin = 'app',
  ): Observable<BreastfeedingSession> {
    return this.http
      .patch<BreastfeedingSession>(this.sessionUrl(babyId, sessionId), dto)
      .pipe(tap((session) => this.emitChange(origin, session)));
  }

  delete(babyId: string, sessionId: string): Observable<void> {
    return this.http
      .delete<void>(this.sessionUrl(babyId, sessionId))
      .pipe(tap(() => this.emitChange('app', null)));
  }

  /** Uploads (or replaces) the photo of a session as multipart/form-data. */
  uploadPhoto(babyId: string, sessionId: string, photo: File): Observable<BreastfeedingSession> {
    const body = new FormData();
    body.append(BREASTFEEDING_PHOTO_FIELD, photo, photo.name);
    return this.http.put<BreastfeedingSession>(this.photoUrl(babyId, sessionId), body);
  }

  deletePhoto(babyId: string, sessionId: string): Observable<BreastfeedingSession> {
    return this.http.delete<BreastfeedingSession>(this.photoUrl(babyId, sessionId));
  }

  private emitChange(origin: BreastfeedingChangeOrigin, session: BreastfeedingSession | null): void {
    this.changesSubject.next({ origin, session });
  }

  private photoUrl(babyId: string, sessionId: string): string {
    return `${this.sessionUrl(babyId, sessionId)}/photo`;
  }

  private sessionsUrl(babyId: string): string {
    return `${this.babyUrl(babyId)}/breastfeeding/sessions`;
  }

  private babyUrl(babyId: string): string {
    return `${environment.apiUrl}/babies/${encodeURIComponent(babyId)}`;
  }

  private historyPreferencesUrl(babyId: string): string {
    return `${this.babyUrl(babyId)}/preferences/breastfeeding-history`;
  }

  private sessionUrl(babyId: string, sessionId: string): string {
    return `${this.sessionsUrl(babyId)}/${encodeURIComponent(sessionId)}`;
  }
}
