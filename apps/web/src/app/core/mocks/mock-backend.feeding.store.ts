import { Service } from '@angular/core';
import {
  DEFAULT_FEEDING_OVERDUE_ALERT_SETTINGS,
  FeedingOverdueAlertSettings,
} from '@app/features/feeding/feeding.models';
import { notFound } from '@app/core/mocks/mock-backend.errors';
import { SEED_BABY_ID } from '@app/core/mocks/mock-backend.seed-utils';
import { parseOverdueAlertBody } from '@app/core/mocks/mock-backend.feeding.validation';

/** In-memory feeding preferences store: lives as long as the app stays open. */
@Service()
export class MockFeedingStore {
  private readonly overdueAlertByBaby = new Map<string, FeedingOverdueAlertSettings>();

  getOverdueAlertSettings(babyId: string): FeedingOverdueAlertSettings {
    this.requireBaby(babyId);
    return this.overdueAlertByBaby.get(babyId) ?? { ...DEFAULT_FEEDING_OVERDUE_ALERT_SETTINGS };
  }

  saveOverdueAlertSettings(babyId: string, body: unknown): FeedingOverdueAlertSettings {
    this.requireBaby(babyId);
    const settings = parseOverdueAlertBody(body);
    this.overdueAlertByBaby.set(babyId, settings);
    return settings;
  }

  private requireBaby(babyId: string): void {
    if (babyId !== SEED_BABY_ID) {
      throw notFound('BABY_NOT_FOUND', `Baby "${babyId}" does not exist.`);
    }
  }
}
