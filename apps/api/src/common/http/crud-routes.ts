import { BabyParamsSchema, RecordParamsSchema } from '@baby-ricardito/contracts';
import type { Page } from '@baby-ricardito/contracts';
import type { z } from 'zod';
import type { ApiRouter, RouteResponse } from './api-router';

/** What the CRUD routes need from the service of a tracker whose records are listed newest first. */
export interface RecordService<Record, Create, Update, Query> {
  list(babyId: string, query: Query): Promise<Page<Record>>;
  getById(babyId: string, recordId: string): Promise<Record>;
  create(babyId: string, input: Create): Promise<Record>;
  update(babyId: string, recordId: string, patch: Update): Promise<Record>;
  remove(babyId: string, recordId: string): Promise<void>;
}

export interface CrudRoutesOptions<
  R extends z.ZodType,
  C extends z.ZodType,
  U extends z.ZodType,
  Q extends z.ZodObject,
> {
  tag: string;
  /** Path after `/babies/{babyId}`, e.g. `bottle/feeds`. */
  path: string;
  /** Singular name used in the summaries, e.g. `bottle feed`. */
  noun: string;
  schemas: { record: R; create: C; update: U; page: z.ZodType; query: Q };
  /** Error code per failing body field (`*`: any other); see `ApiRouter.route`. */
  errorCodes: Record<string, string>;
  /** Code of the 422 answered when the instant is in the future, e.g. `FED_AT_IN_FUTURE`. */
  futureCode: string;
  /** Replaces the default text of the 422 when a tracker has more rules than the future instant. */
  unprocessableDescription?: string;
  /** Documents a 409 on create and update (e.g. overlapping sleeps). */
  conflictDescription?: string;
  updateDescription?: string;
  service: RecordService<z.output<R>, z.output<C>, z.output<U>, z.output<Q>>;
}

const NO_BABY: RouteResponse = { description: 'The baby does not exist.' };
const NO_RECORD: RouteResponse = { description: 'The baby or the record does not exist.' };

/** Registers `POST/GET /<path>` and `GET/PATCH/DELETE /<path>/{recordId}` for a tracker. */
export function registerCrudRoutes<
  R extends z.ZodType,
  C extends z.ZodType,
  U extends z.ZodType,
  Q extends z.ZodObject,
>(api: ApiRouter, options: CrudRoutesOptions<R, C, U, Q>): void {
  const { tag, noun, schemas, service, errorCodes } = options;
  const collection = `/babies/{babyId}/${options.path}`;
  const item = `${collection}/{recordId}`;
  const future: RouteResponse = {
    description:
      options.unprocessableDescription ?? `\`${options.futureCode}\`: the instant is in the future.`,
  };
  const conflict: Record<number, RouteResponse> =
    options.conflictDescription === undefined ? {} : { 409: { description: options.conflictDescription } };
  const queryErrorCodes = Object.fromEntries(Object.entries(errorCodes).filter(([field]) => field !== '*'));

  api.route({
    method: 'post',
    path: collection,
    tag,
    summary: `Create a ${noun}`,
    request: { params: BabyParamsSchema, body: schemas.create },
    errorCodes,
    responses: {
      201: { description: `The created ${noun}.`, schema: schemas.record },
      404: NO_BABY,
      422: future,
      ...conflict,
    },
    handler: async ({ params, body }) => ({
      status: 201,
      body: await service.create(params.babyId, body as z.output<C>),
    }),
  });

  api.route({
    method: 'get',
    path: collection,
    tag,
    summary: `List ${noun}s, newest first`,
    request: { params: BabyParamsSchema, query: schemas.query },
    errorCodes: queryErrorCodes,
    responses: { 200: { description: `A page of ${noun}s.`, schema: schemas.page }, 404: NO_BABY },
    handler: async ({ params, query }) => ({
      status: 200,
      body: await service.list(params.babyId, query as z.output<Q>),
    }),
  });

  api.route({
    method: 'get',
    path: item,
    tag,
    summary: `Get a ${noun}`,
    request: { params: RecordParamsSchema },
    responses: { 200: { description: `The ${noun}.`, schema: schemas.record }, 404: NO_RECORD },
    handler: async ({ params }) => ({ status: 200, body: await service.getById(params.babyId, params.recordId) }),
  });

  api.route({
    method: 'patch',
    path: item,
    tag,
    summary: `Update a ${noun}`,
    description: options.updateDescription ?? 'Omitted fields keep their value.',
    request: { params: RecordParamsSchema, body: schemas.update },
    errorCodes,
    responses: {
      200: { description: `The updated ${noun}.`, schema: schemas.record },
      404: NO_RECORD,
      422: future,
      ...conflict,
    },
    handler: async ({ params, body }) => ({
      status: 200,
      body: await service.update(params.babyId, params.recordId, body as z.output<U>),
    }),
  });

  api.route({
    method: 'delete',
    path: item,
    tag,
    summary: `Delete a ${noun}`,
    request: { params: RecordParamsSchema },
    responses: { 204: { description: 'Deleted.' }, 404: NO_RECORD },
    handler: async ({ params }) => {
      await service.remove(params.babyId, params.recordId);
      return { status: 204 };
    },
  });
}
