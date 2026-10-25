import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BreastfeedingSession,
  BreastfeedingSessionsPage,
  BreastfeedingSessionsPageRequest,
  CreateBreastfeedingSessionDto,
  UpdateBreastfeedingSessionDto,
} from './breastfeeding.models';

@Injectable({ providedIn: 'root' })
export class BreastfeedingService {
  private readonly http = inject(HttpClient);

  create(dto: CreateBreastfeedingSessionDto): Observable<BreastfeedingSession> {
    return this.http.post<BreastfeedingSession>(this.sessionsUrl(dto.babyId), dto);
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

  update(babyId: string, sessionId: string, dto: UpdateBreastfeedingSessionDto): Observable<BreastfeedingSession> {
    return this.http.patch<BreastfeedingSession>(this.sessionUrl(babyId, sessionId), dto);
  }

  delete(babyId: string, sessionId: string): Observable<void> {
    return this.http.delete<void>(this.sessionUrl(babyId, sessionId));
  }

  private sessionsUrl(babyId: string): string {
    return `${environment.apiUrl}/babies/${encodeURIComponent(babyId)}/breastfeeding/sessions`;
  }

  private sessionUrl(babyId: string, sessionId: string): string {
    return `${this.sessionsUrl(babyId)}/${encodeURIComponent(sessionId)}`;
  }
}
