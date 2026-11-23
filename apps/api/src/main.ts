import { createApp } from './app';
import { loadEnv } from './config/env';

const { PORT } = loadEnv();

createApp().listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}/api (docs: /api/docs)`);
});
