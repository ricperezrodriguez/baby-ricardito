import {
  BOTTLE_ERROR_CODES,
  BabyParamsSchema,
  BottleFeedSchema,
  BottleFeedsPageSchema,
  BottleFeedsQuerySchema,
  BottleHistoryPreferencesSchema,
  BottleStatsSchema,
  CreateBottleFeedSchema,
  StatsQuerySchema,
  UpdateBottleFeedSchema,
} from '@baby-ricardito/contracts';
import type { ApiRouter } from '../../common/http/api-router';
import { registerCrudRoutes } from '../../common/http/crud-routes';
import type { AppContext } from '../../context';
import { registerPreferenceRoutes } from '../preferences/preference.routes';
import { BottleRepository } from './bottle.repository';
import { BottleService } from './bottle.service';

const TAG = 'Bottle';

export function registerBottleRoutes(api: ApiRouter, context: AppContext): void {
  const service = new BottleService(new BottleRepository(context.database), context.requireBaby);

  registerCrudRoutes(api, {
    tag: TAG,
    path: 'bottle/feeds',
    noun: 'bottle feed',
    schemas: {
      record: BottleFeedSchema,
      create: CreateBottleFeedSchema,
      update: UpdateBottleFeedSchema,
      page: BottleFeedsPageSchema,
      query: BottleFeedsQuerySchema,
    },
    errorCodes: BOTTLE_ERROR_CODES,
    futureCode: 'FED_AT_IN_FUTURE',
    updateDescription: 'Omitted fields keep their value; an empty `notes` clears them.',
    service,
  });

  api.route({
    method: 'get',
    path: '/babies/{babyId}/bottle/stats',
    tag: TAG,
    summary: 'Bottle statistics of a range of local days',
    request: { params: BabyParamsSchema, query: StatsQuerySchema },
    responses: {
      200: { description: 'Statistics.', schema: BottleStatsSchema },
      404: { description: 'The baby does not exist.' },
    },
    handler: async ({ params, query }) => ({ status: 200, body: await service.stats(params.babyId, query) }),
  });

  registerPreferenceRoutes(api, context, {
    tag: TAG,
    key: 'bottle-history',
    summary: 'the bottle history page preferences',
    schema: BottleHistoryPreferencesSchema,
    defaultValue: { hiddenCharts: [] },
  });
}
