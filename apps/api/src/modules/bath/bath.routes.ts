import {
  BATH_ERROR_CODES,
  BabyParamsSchema,
  BathHistoryPreferencesSchema,
  BathOverdueAlertSettingsSchema,
  BathQuerySchema,
  BathSchema,
  BathStatsSchema,
  BathsPageSchema,
  CreateBathSchema,
  DEFAULT_BATH_OVERDUE_ALERT_SETTINGS,
  StatsQuerySchema,
  UpdateBathSchema,
} from '@baby-ricardito/contracts';
import type { ApiRouter } from '../../common/http/api-router';
import { registerCrudRoutes } from '../../common/http/crud-routes';
import type { AppContext } from '../../context';
import { registerPreferenceRoutes } from '../preferences/preference.routes';
import { BathRepository } from './bath.repository';
import { BathService } from './bath.service';

const TAG = 'Bath';

export function registerBathRoutes(api: ApiRouter, context: AppContext): void {
  const service = new BathService(new BathRepository(context.database), context.requireBaby);

  registerCrudRoutes(api, {
    tag: TAG,
    path: 'bath/baths',
    noun: 'bath',
    schemas: {
      record: BathSchema,
      create: CreateBathSchema,
      update: UpdateBathSchema,
      page: BathsPageSchema,
      query: BathQuerySchema,
    },
    errorCodes: BATH_ERROR_CODES,
    futureCode: 'BATHED_AT_IN_FUTURE',
    updateDescription:
      'Omitted fields keep their value; a null `reaction` and an empty or null `notes` clear them.',
    service,
  });

  api.route({
    method: 'get',
    path: '/babies/{babyId}/bath/stats',
    tag: TAG,
    summary: 'Bath statistics of a range of local days',
    description: 'Intervals are measured against the previous bath; the latest bath uses the whole history.',
    request: { params: BabyParamsSchema, query: StatsQuerySchema },
    responses: {
      200: { description: 'Statistics.', schema: BathStatsSchema },
      404: { description: 'The baby does not exist.' },
    },
    handler: async ({ params, query }) => ({ status: 200, body: await service.stats(params.babyId, query) }),
  });

  registerPreferenceRoutes(api, context, {
    tag: TAG,
    key: 'bath-history',
    summary: 'the bath history page preferences',
    schema: BathHistoryPreferencesSchema,
    defaultValue: { hiddenCharts: [] },
  });

  registerPreferenceRoutes(api, context, {
    tag: TAG,
    key: 'bath-overdue-alert',
    summary: 'the "bath overdue" alert settings',
    schema: BathOverdueAlertSettingsSchema,
    defaultValue: DEFAULT_BATH_OVERDUE_ALERT_SETTINGS,
  });
}
