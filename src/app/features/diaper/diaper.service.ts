import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@environments/environment';
import {
  CreateDiaperChangeDto,
  DiaperChange,
  DiaperChangesPage,
  DiaperChangesPageRequest,
  DiaperHistoryPreferences,
  DiaperPoopAlertSettings,
  DiaperStats,
  DiaperStatsRequest,
  DiaperType,
  STOOL_DIAPER_TYPES,
  UpdateDiaperChangeDto,
} from '@app/features/diaper/diaper.models';
import { PHOTO_UPLOAD_FIELD } from '@app/features/shared/tracker.models';

@Service()
export class DiaperService {
  private readonly http = inject(HttpClient);

  create(dto: CreateDiaperChangeDto): Observable<DiaperChange> {
    return this.http.post<DiaperChange>(this.changesUrl(dto.babyId), dto);
  }

  /** Newest first; `request.types` filters by diaper type. */
  getPage(babyId: string, request: DiaperChangesPageRequest): Observable<DiaperChangesPage> {
    let params = new HttpParams().set('limit', request.limit).set('offset', request.offset);
    for (const type of request.types ?? []) {
      params = params.append('type', type);
    }
    return this.http.get<DiaperChangesPage>(this.changesUrl(babyId), { params });
  }

  /** Most recent change (optionally only of the given types); null when there is none. */
  getLatest(babyId: string, types?: readonly DiaperType[]): Observable<DiaperChange | null> {
    return this.getPage(babyId, { limit: 1, offset: 0, types }).pipe(map(({ items }) => items[0] ?? null));
  }

  /** Most recent change with poop (`dirty` or `both`); null when there is none. */
  getLatestStool(babyId: string): Observable<DiaperChange | null> {
    return this.getLatest(babyId, STOOL_DIAPER_TYPES);
  }

  getById(babyId: string, changeId: string): Observable<DiaperChange> {
    return this.http.get<DiaperChange>(this.changeUrl(babyId, changeId));
  }

  update(babyId: string, changeId: string, dto: UpdateDiaperChangeDto): Observable<DiaperChange> {
    return this.http.patch<DiaperChange>(this.changeUrl(babyId, changeId), dto);
  }

  delete(babyId: string, changeId: string): Observable<void> {
    return this.http.delete<void>(this.changeUrl(babyId, changeId));
  }

  /** Uploads (or replaces) the photo of a change as multipart/form-data. */
  uploadPhoto(babyId: string, changeId: string, photo: File): Observable<DiaperChange> {
    const body = new FormData();
    body.append(PHOTO_UPLOAD_FIELD, photo, photo.name);
    return this.http.put<DiaperChange>(this.photoUrl(babyId, changeId), body);
  }

  deletePhoto(babyId: string, changeId: string): Observable<DiaperChange> {
    return this.http.delete<DiaperChange>(this.photoUrl(babyId, changeId));
  }

  getStats(babyId: string, request: DiaperStatsRequest): Observable<DiaperStats> {
    const params = new HttpParams()
      .set('from', request.from)
      .set('to', request.to)
      .set('tz', request.timeZone);
    return this.http.get<DiaperStats>(`${this.babyUrl(babyId)}/diaper/stats`, { params });
  }

  getHistoryPreferences(babyId: string): Observable<DiaperHistoryPreferences> {
    return this.http.get<DiaperHistoryPreferences>(this.historyPreferencesUrl(babyId));
  }

  saveHistoryPreferences(babyId: string, preferences: DiaperHistoryPreferences): Observable<DiaperHistoryPreferences> {
    return this.http.put<DiaperHistoryPreferences>(this.historyPreferencesUrl(babyId), preferences);
  }

  getPoopAlertSettings(babyId: string): Observable<DiaperPoopAlertSettings> {
    return this.http.get<DiaperPoopAlertSettings>(this.poopAlertUrl(babyId));
  }

  savePoopAlertSettings(babyId: string, settings: DiaperPoopAlertSettings): Observable<DiaperPoopAlertSettings> {
    return this.http.put<DiaperPoopAlertSettings>(this.poopAlertUrl(babyId), settings);
  }

  private babyUrl(babyId: string): string {
    return `${environment.apiUrl}/babies/${encodeURIComponent(babyId)}`;
  }

  private changesUrl(babyId: string): string {
    return `${this.babyUrl(babyId)}/diaper/changes`;
  }

  private changeUrl(babyId: string, changeId: string): string {
    return `${this.changesUrl(babyId)}/${encodeURIComponent(changeId)}`;
  }

  private photoUrl(babyId: string, changeId: string): string {
    return `${this.changeUrl(babyId, changeId)}/photo`;
  }

  private historyPreferencesUrl(babyId: string): string {
    return `${this.babyUrl(babyId)}/preferences/diaper-history`;
  }

  private poopAlertUrl(babyId: string): string {
    return `${this.babyUrl(babyId)}/preferences/diaper-poop-alert`;
  }
}
