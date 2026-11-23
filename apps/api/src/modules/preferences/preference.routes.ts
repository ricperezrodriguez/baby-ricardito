import { BabyParamsSchema } from '@baby-ricardito/contracts';
import type { z } from 'zod';
import type { ApiRouter } from '../../common/http/api-router';
import type { AppContext } from '../../context';
import type { Prisma } from '../../generated/prisma/client';

interface PreferenceOptions<S extends z.ZodType> {
  tag: string;
  /** Row key and last path segment, e.g. `bottle-history`. */
  key: string;
  summary: string;
  schema: S;
  /** Returned while the baby has not saved the preference yet. */
  defaultValue: z.output<S>;
}

/** Registers `GET` and `PUT /babies/{babyId}/preferences/<key>` for a preference stored as JSON. */
export function registerPreferenceRoutes<S extends z.ZodType>(
  api: ApiRouter,
  { preferences, requireBaby }: Pick<AppContext, 'preferences' | 'requireBaby'>,
  options: PreferenceOptions<S>,
): void {
  const path = `/babies/{babyId}/preferences/${options.key}`;

  api.route({
    method: 'get',
    path,
    tag: options.tag,
    summary: `Get ${options.summary}`,
    request: { params: BabyParamsSchema },
    responses: {
      200: { description: 'The saved value, or the default when none was saved.', schema: options.schema },
      404: { description: 'The baby does not exist.' },
    },
    handler: async ({ params }) => {
      await requireBaby(params.babyId);
      const stored = options.schema.safeParse(await preferences.find(params.babyId, options.key));
      return { status: 200, body: stored.success ? stored.data : structuredClone(options.defaultValue) };
    },
  });

  api.route({
    method: 'put',
    path,
    tag: options.tag,
    summary: `Save ${options.summary}`,
    request: { params: BabyParamsSchema, body: options.schema },
    errorCodes: { '*': 'INVALID_PREFERENCES' },
    responses: {
      200: { description: 'The saved value.', schema: options.schema },
      404: { description: 'The baby does not exist.' },
    },
    handler: async ({ params, body }) => {
      await requireBaby(params.babyId);
      await preferences.save(params.babyId, options.key, body as Prisma.InputJsonValue);
      return { status: 200, body };
    },
  });
}
