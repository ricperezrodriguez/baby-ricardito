import {
  BabyParamsSchema,
  CreateNailTrimSchema,
  DEFAULT_NAIL_TRIM_OVERDUE_ALERT_SETTINGS,
  NAIL_TRIM_ERROR_CODES,
  NailTrimOverdueAlertSettingsSchema,
  NailTrimQuerySchema,
  NailTrimSchema,
  NailTrimmingHistoryPreferencesSchema,
  NailTrimmingStatsSchema,
  NailTrimsPageSchema,
  StatsQuerySchema,
  UpdateNailTrimSchema,
} from '@baby-ricardito/contracts';
import type { ApiRouter } from '../../common/http/api-router';
import { registerCrudRoutes } from '../../common/http/crud-routes';
import type { AppContext } from '../../context';
import { registerPreferenceRoutes } from '../preferences/preference.routes';
import { NailTrimmingRepository } from './nail-trimming.repository';
import { NailTrimmingService } from './nail-trimming.service';

const TAG = 'Nail trimming';

export function registerNailTrimmingRoutes(api: ApiRouter, context: AppContext): void {
  const service = new NailTrimmingService(new NailTrimmingRepository(context.database), context.requireBaby);

  registerCrudRoutes(api, {
    tag: TAG,
    path: 'nail-trimming/trims',
    noun: 'nail trim',
    schemas: {
      record: NailTrimSchema,
      create: CreateNailTrimSchema,
      update: UpdateNailTrimSchema,
      page: NailTrimsPageSchema,
      query: NailTrimQuerySchema,
    },
    errorCodes: NAIL_TRIM_ERROR_CODES,
    futureCode: 'TRIMMED_AT_IN_FUTURE',
    updateDescription:
      'Omitted fields keep their value; `areas` replaces the whole list; an empty or null `notes` clears them.',
    service,
  });

  api.route({
    method: 'get',
    path: '/babies/{babyId}/nail-trimming/stats',
    tag: TAG,
    summary: 'Nail trimming statistics of a range of local days',
    description: 'Intervals are measured per zone; the last trim of each zone uses the whole history.',
    request: { params: BabyParamsSchema, query: StatsQuerySchema },
    responses: {
      200: { description: 'Statistics.', schema: NailTrimmingStatsSchema },
      404: { description: 'The baby does not exist.' },
    },
    handler: async ({ params, query }) => ({ status: 200, body: await service.stats(params.babyId, query) }),
  });

  registerPreferenceRoutes(api, context, {
    tag: TAG,
    key: 'nail-trimming-history',
    summary: 'the nail trimming history page preferences',
    schema: NailTrimmingHistoryPreferencesSchema,
    defaultValue: { hiddenCharts: [] },
  });

  registerPreferenceRoutes(api, context, {
    tag: TAG,
    key: 'nail-trimming-overdue-alert',
    summary: 'the "nails overdue" alert settings',
    schema: NailTrimOverdueAlertSettingsSchema,
    defaultValue: DEFAULT_NAIL_TRIM_OVERDUE_ALERT_SETTINGS,
  });
}
