import {
  BabyParamsSchema,
  CreateSleepSessionSchema,
  DEFAULT_SLEEP_AWAKE_ALERT_SETTINGS,
  DEFAULT_SLEEP_LONG_NAP_ALERT_SETTINGS,
  SLEEP_ERROR_CODES,
  SleepAwakeAlertSettingsSchema,
  SleepHistoryPreferencesSchema,
  SleepLongNapAlertSettingsSchema,
  SleepQuerySchema,
  SleepSessionSchema,
  SleepSessionsPageSchema,
  SleepStatsSchema,
  StatsQuerySchema,
  UpdateSleepSessionSchema,
} from '@baby-ricardito/contracts';
import type { ApiRouter } from '../../common/http/api-router';
import { registerCrudRoutes } from '../../common/http/crud-routes';
import type { AppContext } from '../../context';
import { registerPreferenceRoutes } from '../preferences/preference.routes';
import { SleepRepository } from './sleep.repository';
import { SleepService } from './sleep.service';

const TAG = 'Sleep';

export function registerSleepRoutes(api: ApiRouter, context: AppContext): void {
  const service = new SleepService(new SleepRepository(context.database), context.requireBaby);

  registerCrudRoutes(api, {
    tag: TAG,
    path: 'sleep/sessions',
    noun: 'sleep session',
    schemas: {
      record: SleepSessionSchema,
      create: CreateSleepSessionSchema,
      update: UpdateSleepSessionSchema,
      page: SleepSessionsPageSchema,
      query: SleepQuerySchema,
    },
    errorCodes: SLEEP_ERROR_CODES,
    futureCode: 'START_IN_FUTURE',
    unprocessableDescription:
      '`START_IN_FUTURE`, `END_IN_FUTURE` or `END_BEFORE_START` (`endTime` must be later than `startTime`).',
    conflictDescription:
      '`SLEEP_IN_PROGRESS` (another sleep is ongoing) or `SLEEP_OVERLAP` (it overlaps another sleep of the baby).',
    updateDescription:
      'Omitted fields keep their value. Waking up the baby is a PATCH with `endTime`; `endTime: null` reopens the sleep.',
    service,
  });

  api.route({
    method: 'get',
    path: '/babies/{babyId}/sleep/stats',
    tag: TAG,
    summary: 'Sleep statistics of a range of local days',
    description:
      'Only finished sleeps count. Time asleep is split at local midnight; awake time uses the previous sleep even from before the range.',
    request: { params: BabyParamsSchema, query: StatsQuerySchema },
    responses: {
      200: { description: 'Statistics.', schema: SleepStatsSchema },
      404: { description: 'The baby does not exist.' },
    },
    handler: async ({ params, query }) => ({ status: 200, body: await service.stats(params.babyId, query) }),
  });

  registerPreferenceRoutes(api, context, {
    tag: TAG,
    key: 'sleep-history',
    summary: 'the sleep history page preferences',
    schema: SleepHistoryPreferencesSchema,
    defaultValue: { hiddenCharts: [] },
  });

  registerPreferenceRoutes(api, context, {
    tag: TAG,
    key: 'sleep-awake-alert',
    summary: 'the "awake for too long" alert settings',
    schema: SleepAwakeAlertSettingsSchema,
    defaultValue: DEFAULT_SLEEP_AWAKE_ALERT_SETTINGS,
  });

  registerPreferenceRoutes(api, context, {
    tag: TAG,
    key: 'sleep-long-nap-alert',
    summary: 'the "long nap" alert settings',
    schema: SleepLongNapAlertSettingsSchema,
    defaultValue: DEFAULT_SLEEP_LONG_NAP_ALERT_SETTINGS,
  });
}
