import { z } from 'zod';
import type { ApiRouter } from '../../common/http/api-router';

const HealthSchema = z.object({ status: z.literal('ok') }).meta({ id: 'Health' });

export function registerHealthRoutes(api: ApiRouter): void {
  api.route({
    method: 'get',
    path: '/health',
    tag: 'Health',
    summary: 'Liveness check',
    responses: { 200: { description: 'The API is running.', schema: HealthSchema } },
    handler: () => ({ status: 200, body: { status: 'ok' } }),
  });
}
