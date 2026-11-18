import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { BottleService } from '@app/features/bottle/bottle.service';
import { BottleFeed } from '@app/features/bottle/bottle.models';
import { BreastfeedingService } from '@app/features/breastfeeding/breastfeeding.service';
import { BreastfeedingSession } from '@app/features/breastfeeding/breastfeeding.models';
import {
  FeedingOverdueAlertSettings,
  FinishedFeeding,
  LastFeeding,
} from '@app/features/feeding/feeding.models';
import { babyUrl } from '@app/features/shared/tracker.api';

function fromBottle(feed: BottleFeed): FinishedFeeding {
  return { status: 'finished', endedAt: feed.fedAt, source: 'bottle', fingerprint: `bottle:${feed.id}` };
}

function fromBreastfeeding(session: BreastfeedingSession, endedAt: string): FinishedFeeding {
  return { status: 'finished', endedAt, source: 'breastfeeding', fingerprint: `breastfeeding:${session.id}` };
}

function mostRecent(a: FinishedFeeding, b: FinishedFeeding): FinishedFeeding {
  return Date.parse(b.endedAt) > Date.parse(a.endedAt) ? b : a;
}

/**
 * Combines the latest breastfeeding session and the latest bottle feed.
 * An open breastfeeding session wins over everything (the baby is being fed).
 */
function pickLastFeeding(session: BreastfeedingSession | null, bottle: BottleFeed | null): LastFeeding | null {
  const bottleFeeding = bottle === null ? null : fromBottle(bottle);
  if (session === null) {
    return bottleFeeding;
  }
  if (session.endTime === null) {
    return { status: 'in_progress' };
  }
  const breastfeeding = fromBreastfeeding(session, session.endTime);
  return bottleFeeding === null ? breastfeeding : mostRecent(breastfeeding, bottleFeeding);
}

@Service()
export class FeedingService {
  private readonly http = inject(HttpClient);
  private readonly breastfeedingService = inject(BreastfeedingService);
  private readonly bottleService = inject(BottleService);

  getOverdueAlertSettings(babyId: string): Observable<FeedingOverdueAlertSettings> {
    return this.http.get<FeedingOverdueAlertSettings>(this.overdueAlertUrl(babyId));
  }

  saveOverdueAlertSettings(
    babyId: string,
    settings: FeedingOverdueAlertSettings,
  ): Observable<FeedingOverdueAlertSettings> {
    return this.http.put<FeedingOverdueAlertSettings>(this.overdueAlertUrl(babyId), settings);
  }

  /**
   * Most recent feed of any kind: `in_progress` while a breastfeeding session is open,
   * otherwise the finished feed that ended last; null when the baby has never been fed.
   */
  getLastFeed(babyId: string): Observable<LastFeeding | null> {
    return forkJoin({
      session: this.breastfeedingService.getLatest(babyId),
      bottle: this.bottleService.getLatest(babyId),
    }).pipe(map(({ session, bottle }) => pickLastFeeding(session, bottle)));
  }

  private overdueAlertUrl(babyId: string): string {
    return `${babyUrl(babyId)}/preferences/feeding-overdue-alert`;
  }
}
