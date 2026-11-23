import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express from 'express';
import { ApiRouter } from './common/http/api-router';
import { errorHandler, routeNotFoundHandler } from './common/http/error-handler';
import { createDocsRouter } from './docs/openapi';
import { registerHealthRoutes } from './modules/health/health.routes';

export function createApp(): express.Express {
  const registry = new OpenAPIRegistry();

  const api = new ApiRouter(registry);
  registerHealthRoutes(api);

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', createDocsRouter(registry), api.router, routeNotFoundHandler);
  app.use(errorHandler);
  return app;
}
