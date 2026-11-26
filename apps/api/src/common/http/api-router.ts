import type { OpenAPIRegistry, RouteConfig } from '@asteasolutions/zod-to-openapi';
import { ApiErrorSchema } from '@baby-ricardito/contracts';
import type { Request, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { badRequest, unprocessableEntity } from '../errors';

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

/** A file received in a `multipart/form-data` request, kept in memory. */
export interface UploadedFile {
  buffer: Buffer;
  size: number;
}

export interface UploadOptions {
  /** Name of the multipart field that carries the file. */
  field: string;
  maxBytes: number;
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
  /** Receives one file in a multipart body instead of JSON; the handler gets it as `file`. */
  upload?: UploadOptions;
  /** Error `code` per failing field (first path segment) of the query/body; `*` applies to any other field. */
  errorCodes?: Record<string, string>;
  responses: Record<number, RouteResponse>;
  handler: (input: {
    params: Output<P>;
    query: Output<Q>;
    body: Output<B>;
    /** Only meaningful when the route declares `upload`; always set then. */
    file: UploadedFile;
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

/**
 * Code of a failed field: the one set by `coded()`, else the route's `errorCodes` (the path without array
 * indexes, e.g. `segments.breast`, then its first segment, then `*`), else the source default.
 */
function resolveCode(
  issue: z.core.$ZodIssue,
  source: RequestSource,
  errorCodes: Record<string, string> | undefined,
): string {
  const fullPath = issue.path.filter((segment) => typeof segment === 'string').join('.');
  const first = issue.path[0];
  const byRoute =
    errorCodes?.[fullPath] ?? (typeof first === 'string' ? errorCodes?.[first] : undefined) ?? errorCodes?.['*'];
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

const BYTES_PER_MB = 1024 * 1024;

/** Reads the multipart file of a request; its errors use the same codes as the mock backend. */
async function receiveFile(req: Request, res: Response, upload: UploadOptions): Promise<UploadedFile> {
  const middleware = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: upload.maxBytes, files: 1, fields: 0 },
  }).single(upload.field);

  await new Promise<void>((resolve, reject) => {
    middleware(req, res, (error?: unknown) => {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        reject(
          unprocessableEntity(
            'PHOTO_TOO_LARGE',
            `The photo must not be larger than ${Math.round(upload.maxBytes / BYTES_PER_MB)} MB.`,
          ),
        );
      } else if (error !== undefined) {
        reject(badRequest('INVALID_PHOTO', `The multipart field "${upload.field}" must be a file.`));
      } else {
        resolve();
      }
    });
  });

  if (req.file === undefined) {
    throw badRequest('INVALID_PHOTO', `The multipart field "${upload.field}" must be a file.`);
  }
  return { buffer: req.file.buffer, size: req.file.size };
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
      const file = definition.upload === undefined ? undefined : await receiveFile(req, res, definition.upload);

      const reply = await definition.handler({ params, query, body, file } as Parameters<
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

  private toOpenApiBody(
    definition: RouteDefinition<
      ObjectSchema | undefined,
      ObjectSchema | undefined,
      z.ZodType | undefined
    >,
  ): NonNullable<RouteConfig['request']>['body'] {
    const { upload, request } = definition;
    if (upload !== undefined) {
      const schema = z.object({ [upload.field]: z.string().meta({ type: 'string', format: 'binary' }) });
      return { required: true, content: { 'multipart/form-data': { schema } } };
    }
    return request?.body === undefined
      ? undefined
      : { required: true, content: { 'application/json': { schema: request.body } } };
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
      request?.params !== undefined ||
      request?.query !== undefined ||
      request?.body !== undefined ||
      definition.upload !== undefined;

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
        body: this.toOpenApiBody(definition),
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
