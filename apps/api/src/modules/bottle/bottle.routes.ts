import {
  BOTTLE_ERROR_CODES,
  BabyParamsSchema,
  BottleFeedSchema,
  BottleFeedsPageSchema,
  BottleFeedsQuerySchema,
  BottleHistoryPreferencesSchema,
  BottleStatsSchema,
  CreateBottleFeedSchema,
  RecordParamsSchema,
  StatsQuerySchema,
  UpdateBottleFeedSchema,
} from '@baby-ricardito/contracts';
import type { ApiRouter } from '../../common/http/api-router';
import type { AppContext } from '../../context';
import { registerPreferenceRoutes } from '../preferences/preference.routes';
import { BottleRepository } from './bottle.repository';
import { BottleService } from './bottle.service';

const TAG = 'Bottle';
const NO_BABY = { description: 'The baby does not exist.' };
const NO_FEED = { description: 'The baby or the feed does not exist.' };

export function registerBottleRoutes(api: ApiRouter, context: AppContext): void {
  const service = new BottleService(new BottleRepository(context.database), context.requireBaby);

  api.route({
    method: 'post',
    path: '/babies/{babyId}/bottle/feeds',
    tag: TAG,
    summary: 'Create a bottle feed',
    request: { params: BabyParamsSchema, body: CreateBottleFeedSchema },
    errorCodes: BOTTLE_ERROR_CODES,
    responses: {
      201: { description: 'The created feed.', schema: BottleFeedSchema },
      404: NO_BABY,
      422: { description: '`FED_AT_IN_FUTURE`: the feed is in the future.' },
    },
    handler: async ({ params, body }) => ({ status: 201, body: await service.create(params.babyId, body) }),
  });

  api.route({
    method: 'get',
    path: '/babies/{babyId}/bottle/feeds',
    tag: TAG,
    summary: 'List bottle feeds, newest first',
    request: { params: BabyParamsSchema, query: BottleFeedsQuerySchema },
    errorCodes: { milkType: BOTTLE_ERROR_CODES.milkType },
    responses: { 200: { description: 'A page of feeds.', schema: BottleFeedsPageSchema }, 404: NO_BABY },
    handler: async ({ params, query }) => ({ status: 200, body: await service.list(params.babyId, query) }),
  });

  api.route({
    method: 'get',
    path: '/babies/{babyId}/bottle/feeds/{recordId}',
    tag: TAG,
    summary: 'Get a bottle feed',
    request: { params: RecordParamsSchema },
    responses: { 200: { description: 'The feed.', schema: BottleFeedSchema }, 404: NO_FEED },
    handler: async ({ params }) => ({ status: 200, body: await service.getById(params.babyId, params.recordId) }),
  });

  api.route({
    method: 'patch',
    path: '/babies/{babyId}/bottle/feeds/{recordId}',
    tag: TAG,
    summary: 'Update a bottle feed',
    description: 'Omitted fields keep their value; an empty `notes` clears them.',
    request: { params: RecordParamsSchema, body: UpdateBottleFeedSchema },
    errorCodes: BOTTLE_ERROR_CODES,
    responses: {
      200: { description: 'The updated feed.', schema: BottleFeedSchema },
      404: NO_FEED,
      422: { description: '`FED_AT_IN_FUTURE`: the feed is in the future.' },
    },
    handler: async ({ params, body }) => ({
      status: 200,
      body: await service.update(params.babyId, params.recordId, body),
    }),
  });

  api.route({
    method: 'delete',
    path: '/babies/{babyId}/bottle/feeds/{recordId}',
    tag: TAG,
    summary: 'Delete a bottle feed',
    request: { params: RecordParamsSchema },
    responses: { 204: { description: 'Deleted.' }, 404: NO_FEED },
    handler: async ({ params }) => {
      await service.remove(params.babyId, params.recordId);
      return { status: 204 };
    },
  });

  api.route({
    method: 'get',
    path: '/babies/{babyId}/bottle/stats',
    tag: TAG,
    summary: 'Bottle statistics of a range of local days',
    request: { params: BabyParamsSchema, query: StatsQuerySchema },
    responses: { 200: { description: 'Statistics.', schema: BottleStatsSchema }, 404: NO_BABY },
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
