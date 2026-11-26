import type { OpenAPIRegistry, RouteConfig } from '@asteasolutions/zod-to-openapi';
import { ApiErrorSchema } from '@baby-ricardito/contracts';
import { Router } from 'express';
import type { z } from 'zod';
import { badRequest } from '../errors';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
type ObjectSchema = z.ZodObject;
type Output<S> = S extends z.ZodType ? z.output<S> : undefined;
type RequestSource = 'params' | 'query' | 'body';

const FALLBACK_ERROR_CODES: Record<RequestSource, string> = {
  params: 'INVALID_PARAMS',
  query: 'INVALID_QUERY',
  body: 'INVALID_BODY',
};

export interface Reply {
  status: number;
  /** Serialized as JSON; omit it for an empty response (e.g. 204). */
  body?: unknown;
}

export interface RouteResponse {
  description: string;
  schema?: z.ZodType;
}

export interface RouteDefinition<
  P extends ObjectSchema | undefined,
  Q extends ObjectSchema | undefined,
  B extends z.ZodType | undefined,
> {
  method: HttpMethod;
  /** OpenAPI path with `{param}` placeholders, relative to the API prefix. */
  path: string;
  tag: string;
  summary: string;
  description?: string;
  request?: { params?: P; query?: Q; body?: B };
  /** Error `code` per failing field (first path segment) of the query/body; `*` applies to any other field. */
  errorCodes?: Record<string, string>;
  responses: Record<number, RouteResponse>;
  handler: (input: {
    params: Output<P>;
    query: Output<Q>;
    body: Output<B>;
  }) => Reply | Promise<Reply>;
}

function issueCode(issue: z.core.$ZodIssue, fallback: string): string {
  const params: unknown = 'params' in issue ? issue.params : undefined;
  const code =
    typeof params === 'object' && params !== null
      ? (params as Record<string, unknown>)['code']
      : undefined;
  return typeof code === 'string' ? code : fallback;
}

/** Code of a failed field: the one set by `coded()`, else the route's `errorCodes` (field, then `*`), else the source default. */
function resolveCode(
  issue: z.core.$ZodIssue,
  source: RequestSource,
  errorCodes: Record<string, string> | undefined,
): string {
  const field = issue.path[0];
  const byRoute =
    (typeof field === 'string' ? errorCodes?.[field] : undefined) ?? errorCodes?.['*'];
  return issueCode(issue, byRoute ?? FALLBACK_ERROR_CODES[source]);
}

function parseInput(
  source: RequestSource,
  schema: z.ZodType | undefined,
  value: unknown,
  errorCodes: Record<string, string> | undefined,
): unknown {
  if (schema === undefined) {
    return undefined;
  }
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  const issue = result.error.issues[0]!;
  const field = issue.path.length > 0 ? `"${issue.path.map(String).join('.')}": ` : '';
  throw badRequest(resolveCode(issue, source, errorCodes), `${field}${issue.message}`);
}

function toExpressPath(path: string): string {
  return path.replace(/\{(\w+)\}/g, ':$1');
}

/** Registers each route once: as an Express handler (validating its input) and as an OpenAPI operation. */
export class ApiRouter {
  readonly router = Router();

  constructor(private readonly registry: OpenAPIRegistry) {}

  route<
    P extends ObjectSchema | undefined = undefined,
    Q extends ObjectSchema | undefined = undefined,
    B extends z.ZodType | undefined = undefined,
  >(definition: RouteDefinition<P, Q, B>): void {
    this.registry.registerPath(this.toOpenApi(definition));

    this.router[definition.method](toExpressPath(definition.path), async (req, res) => {
      const params = parseInput(
        'params',
        definition.request?.params,
        req.params,
        definition.errorCodes,
      );
      const query = parseInput(
        'query',
        definition.request?.query,
        req.query,
        definition.errorCodes,
      );
      const body = parseInput('body', definition.request?.body, req.body, definition.errorCodes);

      const reply = await definition.handler({ params, query, body } as Parameters<
        typeof definition.handler
      >[0]);
      res.status(reply.status);
      if (reply.body === undefined) {
        res.end();
      } else {
        res.json(reply.body);
      }
    });
  }

  private toOpenApi(
    definition: RouteDefinition<
      ObjectSchema | undefined,
      ObjectSchema | undefined,
      z.ZodType | undefined
    >,
  ): RouteConfig {
    const { request, responses } = definition;
    const json = (schema: z.ZodType) => ({ content: { 'application/json': { schema } } });
    const hasRequest =
      request?.params !== undefined || request?.query !== undefined || request?.body !== undefined;

    const documented: Record<number, RouteResponse> = { ...responses };
    if (hasRequest && documented[400] === undefined) {
      documented[400] = { description: 'Invalid request.', schema: ApiErrorSchema };
    }

    return {
      method: definition.method,
      path: definition.path,
      tags: [definition.tag],
      summary: definition.summary,
      description: definition.description,
      request: {
        params: request?.params,
        query: request?.query,
        body: request?.body === undefined ? undefined : { required: true, ...json(request.body) },
      },
      responses: Object.fromEntries(
        Object.entries(documented).map(([status, response]) => [
          status,
          {
            description: response.description,
            ...(response.schema === undefined ? {} : json(response.schema)),
          },
        ]),
      ),
    };
  }
}
