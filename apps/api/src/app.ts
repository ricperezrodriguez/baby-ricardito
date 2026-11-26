import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express from 'express';
import { ApiRouter } from './common/http/api-router';
import { errorHandler, routeNotFoundHandler } from './common/http/error-handler';
import type { AppContext } from './context';
import type { Database } from './database/prisma';
import { createDocsRouter } from './docs/openapi';
import { createRequireBaby } from './modules/babies/require-baby';
import { registerBathRoutes } from './modules/bath/bath.routes';
import { registerBottleRoutes } from './modules/bottle/bottle.routes';
import { registerFeedingRoutes } from './modules/feeding/feeding.routes';
import { registerHealthRoutes } from './modules/health/health.routes';
import { registerNailTrimmingRoutes } from './modules/nail-trimming/nail-trimming.routes';
import { PreferenceRepository } from './modules/preferences/preference.repository';
import { registerVitaminDRoutes } from './modules/vitamin-d/vitamin-d.routes';

export function createApp(database: Database): express.Express {
  const registry = new OpenAPIRegistry();
  const context: AppContext = {
    database,
    requireBaby: createRequireBaby(database),
    preferences: new PreferenceRepository(database),
  };

  const api = new ApiRouter(registry);
  registerHealthRoutes(api);
  registerBottleRoutes(api, context);
  registerFeedingRoutes(api, context);
  registerVitaminDRoutes(api, context);
  registerNailTrimmingRoutes(api, context);
  registerBathRoutes(api, context);

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', createDocsRouter(registry), api.router, routeNotFoundHandler);
  app.use(errorHandler);
  return app;
}
