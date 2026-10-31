import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@environments/environment';
import {
  BREASTFEEDING_PHOTO_FIELD,
  BreastfeedingSession,
  BreastfeedingSessionsPage,
  BreastfeedingSessionsPageRequest,
  CreateBreastfeedingSessionDto,
  UpdateBreastfeedingSessionDto,
} from '@app/features/breastfeeding/breastfeeding.models';

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

  /** Uploads (or replaces) the photo of a session as multipart/form-data. */
  uploadPhoto(babyId: string, sessionId: string, photo: File): Observable<BreastfeedingSession> {
    const body = new FormData();
    body.append(BREASTFEEDING_PHOTO_FIELD, photo, photo.name);
    return this.http.put<BreastfeedingSession>(this.photoUrl(babyId, sessionId), body);
  }

  deletePhoto(babyId: string, sessionId: string): Observable<BreastfeedingSession> {
    return this.http.delete<BreastfeedingSession>(this.photoUrl(babyId, sessionId));
  }

  private photoUrl(babyId: string, sessionId: string): string {
    return `${this.sessionUrl(babyId, sessionId)}/photo`;
  }

  private sessionsUrl(babyId: string): string {
    return `${environment.apiUrl}/babies/${encodeURIComponent(babyId)}/breastfeeding/sessions`;
  }

  private sessionUrl(babyId: string, sessionId: string): string {
    return `${this.sessionsUrl(babyId)}/${encodeURIComponent(sessionId)}`;
  }
}
