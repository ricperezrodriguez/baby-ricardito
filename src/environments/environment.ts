import { AppEnvironment } from '@environments/environment.model';

export const environment: AppEnvironment = {
  useMock: false,
  apiUrl: '/api',
  mockDelayMs: { min: 300, max: 800 },
};
