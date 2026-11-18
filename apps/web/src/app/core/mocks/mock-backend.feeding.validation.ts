import { badRequest } from '@app/core/mocks/mock-backend.errors';
import { isRecord } from '@app/core/mocks/mock-backend.parsing';
import {
  FEEDING_OVERDUE_ALERT_THRESHOLDS,
  FeedingOverdueAlertSettings,
} from '@app/features/feeding/feeding.models';

/** Validates the body of the overdue-feed alert update. */
export function parseOverdueAlertBody(body: unknown): FeedingOverdueAlertSettings {
  const enabled = isRecord(body) ? body['enabled'] : null;
  const thresholdHours = isRecord(body) ? body['thresholdHours'] : null;
  const threshold = FEEDING_OVERDUE_ALERT_THRESHOLDS.find((allowed) => allowed === thresholdHours);
  if (typeof enabled !== 'boolean' || threshold === undefined) {
    throw badRequest(
      'INVALID_PREFERENCES',
      `"enabled" must be a boolean and "thresholdHours" one of: ${FEEDING_OVERDUE_ALERT_THRESHOLDS.join(', ')}.`,
    );
  }
  return { enabled, thresholdHours: threshold };
}
