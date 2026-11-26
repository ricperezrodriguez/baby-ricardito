import {
    DEFAULT_FEEDING_OVERDUE_ALERT_SETTINGS,
    FeedingOverdueAlertSettingsSchema,
} from '@baby-ricardito/contracts';
import type { ApiRouter } from '../../common/http/api-router';
import type { AppContext } from '../../context';
import { registerPreferenceRoutes } from '../preferences/preference.routes';

/** Settings shared by breastfeeding and bottle: the combined "too long since the last feed" alert. */
export function registerFeedingRoutes(api: ApiRouter, context: AppContext): void {
  registerPreferenceRoutes(api, context, {
    tag: 'Feeding',
    key: 'feeding-overdue-alert',
    summary: 'the overdue-feed alert settings',
    schema: FeedingOverdueAlertSettingsSchema,
    defaultValue: DEFAULT_FEEDING_OVERDUE_ALERT_SETTINGS,
  });
}
