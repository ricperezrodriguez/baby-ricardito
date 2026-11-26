import {
  BabyParamsSchema,
  CreateVitaminDDoseSchema,
  DEFAULT_VITAMIN_D_MISSED_ALERT_SETTINGS,
  StatsQuerySchema,
  UpdateVitaminDDoseSchema,
  VITAMIN_D_ERROR_CODES,
  VitaminDDoseSchema,
  VitaminDDosesPageSchema,
  VitaminDHistoryPreferencesSchema,
  VitaminDMissedAlertSettingsSchema,
  VitaminDQuerySchema,
  VitaminDStatsSchema,
} from '@baby-ricardito/contracts';
import type { ApiRouter } from '../../common/http/api-router';
import { registerCrudRoutes } from '../../common/http/crud-routes';
import type { AppContext } from '../../context';
import { registerPreferenceRoutes } from '../preferences/preference.routes';
import { VitaminDRepository } from './vitamin-d.repository';
import { VitaminDService } from './vitamin-d.service';

const TAG = 'Vitamin D';

export function registerVitaminDRoutes(api: ApiRouter, context: AppContext): void {
  const service = new VitaminDService(new VitaminDRepository(context.database), context.requireBaby);

  registerCrudRoutes(api, {
    tag: TAG,
    path: 'vitamin-d/doses',
    noun: 'vitamin D dose',
    schemas: {
      record: VitaminDDoseSchema,
      create: CreateVitaminDDoseSchema,
      update: UpdateVitaminDDoseSchema,
      page: VitaminDDosesPageSchema,
      query: VitaminDQuerySchema,
    },
    errorCodes: VITAMIN_D_ERROR_CODES,
    futureCode: 'GIVEN_AT_IN_FUTURE',
    updateDescription: 'Omitted fields keep their value; `drops: null` clears the drops.',
    service,
  });

  api.route({
    method: 'get',
    path: '/babies/{babyId}/vitamin-d/stats',
    tag: TAG,
    summary: 'Vitamin D statistics of a range of local days',
    description: 'The status of each day depends on the current moment; streaks and the last dose use the whole history.',
    request: { params: BabyParamsSchema, query: StatsQuerySchema },
    responses: {
      200: { description: 'Statistics.', schema: VitaminDStatsSchema },
      404: { description: 'The baby does not exist.' },
    },
    handler: async ({ params, query }) => ({ status: 200, body: await service.stats(params.babyId, query) }),
  });

  registerPreferenceRoutes(api, context, {
    tag: TAG,
    key: 'vitamin-d-history',
    summary: 'the vitamin D history page preferences',
    schema: VitaminDHistoryPreferencesSchema,
    defaultValue: { hiddenCharts: [] },
  });

  registerPreferenceRoutes(api, context, {
    tag: TAG,
    key: 'vitamin-d-missed-alert',
    summary: 'the "dose not given today" alert settings',
    schema: VitaminDMissedAlertSettingsSchema,
    defaultValue: DEFAULT_VITAMIN_D_MISSED_ALERT_SETTINGS,
  });
}
