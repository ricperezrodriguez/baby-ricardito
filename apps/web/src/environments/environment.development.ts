import { AppEnvironment } from '@environments/environment.model';

export const environment: AppEnvironment = {
  useMock: true,
  apiUrl: '/api',
  mockDelayMs: { min: 300, max: 800 },
};
