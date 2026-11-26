import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { resolve } from 'node:path';
import express from 'express';
import { ApiRouter } from './common/http/api-router';
import { errorHandler, routeNotFoundHandler } from './common/http/error-handler';
import type { AppContext } from './context';
import type { Database } from './database/prisma';
import { createDocsRouter } from './docs/openapi';
import { createRequireBaby } from './modules/babies/require-baby';
import { registerBathRoutes } from './modules/bath/bath.routes';
import { registerBottleRoutes } from './modules/bottle/bottle.routes';
import { registerBreastfeedingRoutes } from './modules/breastfeeding/breastfeeding.routes';
import { registerDiaperRoutes } from './modules/diaper/diaper.routes';
import { registerFeedingRoutes } from './modules/feeding/feeding.routes';
import { registerHealthRoutes } from './modules/health/health.routes';
import { registerNailTrimmingRoutes } from './modules/nail-trimming/nail-trimming.routes';
import { PHOTOS_URL_PATH, PhotoStorage } from './modules/photos/photo-storage';
import { PreferenceRepository } from './modules/preferences/preference.repository';
import { registerSleepRoutes } from './modules/sleep/sleep.routes';
import { registerVitaminDRoutes } from './modules/vitamin-d/vitamin-d.routes';

export interface AppOptions {
  database: Database;
  photosDir: string;
}

export function createApp({ database, photosDir }: AppOptions): express.Express {
  const registry = new OpenAPIRegistry();
  const photos = new PhotoStorage(resolve(photosDir));
  const context: AppContext = {
    database,
    requireBaby: createRequireBaby(database),
    preferences: new PreferenceRepository(database),
    photos,
  };

  const api = new ApiRouter(registry);
  registerHealthRoutes(api);
  registerBottleRoutes(api, context);
  registerFeedingRoutes(api, context);
  registerVitaminDRoutes(api, context);
  registerNailTrimmingRoutes(api, context);
  registerBathRoutes(api, context);
  registerDiaperRoutes(api, context);
  registerSleepRoutes(api, context);
  registerBreastfeedingRoutes(api, context);

  const app = express();
  app.disable('x-powered-by');
  // Photo names are unique per upload (a replaced photo gets a new name), so they can be cached for good.
  app.use(
    PHOTOS_URL_PATH,
    express.static(photos.directory, {
      dotfiles: 'deny',
      index: false,
      maxAge: '1y',
      immutable: true,
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', createDocsRouter(registry), api.router, routeNotFoundHandler);
  app.use(errorHandler);
  return app;
}
