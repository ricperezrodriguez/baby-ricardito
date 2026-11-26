import {
  BabyParamsSchema,
  CreateDiaperChangeSchema,
  DEFAULT_DIAPER_POOP_ALERT_SETTINGS,
  DIAPER_ERROR_CODES,
  DiaperChangeSchema,
  DiaperChangesPageSchema,
  DiaperChangesQuerySchema,
  DiaperHistoryPreferencesSchema,
  DiaperPoopAlertSettingsSchema,
  DiaperStatsSchema,
  StatsQuerySchema,
  UpdateDiaperChangeSchema,
} from '@baby-ricardito/contracts';
import type { ApiRouter } from '../../common/http/api-router';
import { registerCrudRoutes } from '../../common/http/crud-routes';
import type { AppContext } from '../../context';
import { registerPhotoRoutes } from '../photos/photo.routes';
import { registerPreferenceRoutes } from '../preferences/preference.routes';
import { DiaperRepository } from './diaper.repository';
import { DiaperService } from './diaper.service';

const TAG = 'Diaper';
const PATH = 'diaper/changes';

export function registerDiaperRoutes(api: ApiRouter, context: AppContext): void {
  const service = new DiaperService(new DiaperRepository(context.database), context.photos, context.requireBaby);

  registerCrudRoutes(api, {
    tag: TAG,
    path: PATH,
    noun: 'diaper change',
    schemas: {
      record: DiaperChangeSchema,
      create: CreateDiaperChangeSchema,
      update: UpdateDiaperChangeSchema,
      page: DiaperChangesPageSchema,
      query: DiaperChangesQuerySchema,
    },
    errorCodes: DIAPER_ERROR_CODES,
    futureCode: 'CHANGED_AT_IN_FUTURE',
    unprocessableDescription:
      '`CHANGED_AT_IN_FUTURE`, or `STOOL_DETAILS_NOT_ALLOWED` when stool fields are sent with a `wet` diaper.',
    updateDescription:
      'Omitted fields keep their value; when switching to `wet` send `stoolColor` and `stoolConsistency` as null.',
    service,
  });

  registerPhotoRoutes(api, {
    tag: TAG,
    path: PATH,
    noun: 'diaper change',
    recordSchema: DiaperChangeSchema,
    service,
  });

  api.route({
    method: 'get',
    path: '/babies/{babyId}/diaper/stats',
    tag: TAG,
    summary: 'Diaper statistics of a range of local days',
    request: { params: BabyParamsSchema, query: StatsQuerySchema },
    responses: {
      200: { description: 'Statistics.', schema: DiaperStatsSchema },
      404: { description: 'The baby does not exist.' },
    },
    handler: async ({ params, query }) => ({ status: 200, body: await service.stats(params.babyId, query) }),
  });

  registerPreferenceRoutes(api, context, {
    tag: TAG,
    key: 'diaper-history',
    summary: 'the diaper history page preferences',
    schema: DiaperHistoryPreferencesSchema,
    defaultValue: { hiddenCharts: [] },
  });

  registerPreferenceRoutes(api, context, {
    tag: TAG,
    key: 'diaper-poop-alert',
    summary: 'the "too long without poop" alert settings',
    schema: DiaperPoopAlertSettingsSchema,
    defaultValue: DEFAULT_DIAPER_POOP_ALERT_SETTINGS,
  });
}
