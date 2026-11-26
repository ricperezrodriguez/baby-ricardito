import {
  BREASTFEEDING_ERROR_CODES,
  BabyParamsSchema,
  BreastfeedingHistoryPreferencesSchema,
  BreastfeedingQuerySchema,
  BreastfeedingSessionSchema,
  BreastfeedingSessionsPageSchema,
  BreastfeedingStatsSchema,
  CreateBreastfeedingSessionSchema,
  StatsQuerySchema,
  UpdateBreastfeedingSessionSchema,
} from '@baby-ricardito/contracts';
import type { ApiRouter } from '../../common/http/api-router';
import { registerCrudRoutes } from '../../common/http/crud-routes';
import type { AppContext } from '../../context';
import { registerPhotoRoutes } from '../photos/photo.routes';
import { registerPreferenceRoutes } from '../preferences/preference.routes';
import { BreastfeedingRepository } from './breastfeeding.repository';
import { BreastfeedingService } from './breastfeeding.service';

const TAG = 'Breastfeeding';
const PATH = 'breastfeeding/sessions';

export function registerBreastfeedingRoutes(api: ApiRouter, context: AppContext): void {
  const service = new BreastfeedingService(
    new BreastfeedingRepository(context.database),
    context.photos,
    context.requireBaby,
  );

  registerCrudRoutes(api, {
    tag: TAG,
    path: PATH,
    noun: 'breastfeeding session',
    schemas: {
      record: BreastfeedingSessionSchema,
      create: CreateBreastfeedingSessionSchema,
      update: UpdateBreastfeedingSessionSchema,
      page: BreastfeedingSessionsPageSchema,
      query: BreastfeedingQuerySchema,
    },
    errorCodes: BREASTFEEDING_ERROR_CODES,
    futureCode: 'END_BEFORE_START',
    unprocessableDescription:
      '`END_BEFORE_START` (`endTime` earlier than `startTime`) or `SEGMENT_END_BEFORE_START` (a segment ends before it starts).',
    conflictDescription: '`SESSION_IN_PROGRESS`: another session of the baby is still open.',
    updateDescription:
      'Omitted fields keep their value; `segments` replaces the whole list; `endTime: null` reopens the session; an empty `notes` clears them.',
    service,
  });

  registerPhotoRoutes(api, {
    tag: TAG,
    path: PATH,
    noun: 'breastfeeding session',
    recordSchema: BreastfeedingSessionSchema,
    service,
  });

  api.route({
    method: 'get',
    path: '/babies/{babyId}/breastfeeding/stats',
    tag: TAG,
    summary: 'Breastfeeding statistics of a range of local days',
    description: 'Only finished sessions count; intervals are measured against the previous feed, even from the day before.',
    request: { params: BabyParamsSchema, query: StatsQuerySchema },
    responses: {
      200: { description: 'Statistics.', schema: BreastfeedingStatsSchema },
      404: { description: 'The baby does not exist.' },
    },
    handler: async ({ params, query }) => ({ status: 200, body: await service.stats(params.babyId, query) }),
  });

  registerPreferenceRoutes(api, context, {
    tag: TAG,
    key: 'breastfeeding-history',
    summary: 'the breastfeeding history page preferences',
    schema: BreastfeedingHistoryPreferencesSchema,
    defaultValue: { hiddenCharts: [] },
  });
}
