import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  CreateVitaminDDoseDto,
  UpdateVitaminDDoseDto,
  VitaminDDose,
  VitaminDDosesPage,
  VitaminDDosesPageRequest,
  VitaminDHistoryPreferences,
  VitaminDMissedAlertSettings,
  VitaminDStats,
  VitaminDStatsRequest,
} from '@app/features/vitamin-d/vitamin-d.models';
import { babyUrl, statsParams } from '@app/features/shared/tracker.api';

@Service()
export class VitaminDService {
  private readonly http = inject(HttpClient);

  create(dto: CreateVitaminDDoseDto): Observable<VitaminDDose> {
    return this.http.post<VitaminDDose>(this.dosesUrl(dto.babyId), dto);
  }

  /** Newest first. */
  getPage(babyId: string, request: VitaminDDosesPageRequest): Observable<VitaminDDosesPage> {
    const params = new HttpParams().set('limit', request.limit).set('offset', request.offset);
    return this.http.get<VitaminDDosesPage>(this.dosesUrl(babyId), { params });
  }

  /** Most recent dose; null when there is none. */
  getLatest(babyId: string): Observable<VitaminDDose | null> {
    return this.getPage(babyId, { limit: 1, offset: 0 }).pipe(map(({ items }) => items[0] ?? null));
  }

  getById(babyId: string, doseId: string): Observable<VitaminDDose> {
    return this.http.get<VitaminDDose>(this.doseUrl(babyId, doseId));
  }

  update(babyId: string, doseId: string, dto: UpdateVitaminDDoseDto): Observable<VitaminDDose> {
    return this.http.patch<VitaminDDose>(this.doseUrl(babyId, doseId), dto);
  }

  delete(babyId: string, doseId: string): Observable<void> {
    return this.http.delete<void>(this.doseUrl(babyId, doseId));
  }

  getStats(babyId: string, request: VitaminDStatsRequest): Observable<VitaminDStats> {
    return this.http.get<VitaminDStats>(`${babyUrl(babyId)}/vitamin-d/stats`, { params: statsParams(request) });
  }

  getHistoryPreferences(babyId: string): Observable<VitaminDHistoryPreferences> {
    return this.http.get<VitaminDHistoryPreferences>(this.historyPreferencesUrl(babyId));
  }

  saveHistoryPreferences(
    babyId: string,
    preferences: VitaminDHistoryPreferences,
  ): Observable<VitaminDHistoryPreferences> {
    return this.http.put<VitaminDHistoryPreferences>(this.historyPreferencesUrl(babyId), preferences);
  }

  getMissedAlertSettings(babyId: string): Observable<VitaminDMissedAlertSettings> {
    return this.http.get<VitaminDMissedAlertSettings>(this.missedAlertUrl(babyId));
  }

  saveMissedAlertSettings(
    babyId: string,
    settings: VitaminDMissedAlertSettings,
  ): Observable<VitaminDMissedAlertSettings> {
    return this.http.put<VitaminDMissedAlertSettings>(this.missedAlertUrl(babyId), settings);
  }

  private dosesUrl(babyId: string): string {
    return `${babyUrl(babyId)}/vitamin-d/doses`;
  }

  private doseUrl(babyId: string, doseId: string): string {
    return `${this.dosesUrl(babyId)}/${encodeURIComponent(doseId)}`;
  }

  private historyPreferencesUrl(babyId: string): string {
    return `${babyUrl(babyId)}/preferences/vitamin-d-history`;
  }

  private missedAlertUrl(babyId: string): string {
    return `${babyUrl(babyId)}/preferences/vitamin-d-missed-alert`;
  }
}
