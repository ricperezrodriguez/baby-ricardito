export interface AppEnvironment {
  useMock: boolean;
  apiUrl: string;
  mockDelayMs: { min: number; max: number };
}
