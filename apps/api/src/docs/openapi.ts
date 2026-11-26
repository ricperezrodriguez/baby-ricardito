import { OpenApiGeneratorV31, type OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { Router } from 'express';
import { Router as createRouter } from 'express';
import swaggerUi from 'swagger-ui-express';

function buildDocument(registry: OpenAPIRegistry) {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Baby Ricardito API',
      version: '0.1.0',
      description: 'Backend of the baby care tracker. Error bodies are always `{ code, message }`.',
    },
    servers: [{ url: '/api' }],
  });
}

/** Serves the OpenAPI document (`/openapi.json`) and Swagger UI (`/docs`). */
export function createDocsRouter(registry: OpenAPIRegistry): Router {
  const document = buildDocument(registry);
  const router = createRouter();

  router.get('/openapi.json', (_req, res) => {
    res.json(document);
  });
  router.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(document, { customSiteTitle: 'Baby Ricardito API' }),
  );

  return router;
}
