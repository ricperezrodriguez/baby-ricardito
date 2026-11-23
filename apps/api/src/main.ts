import { createApp } from './app';
import { loadEnv } from './config/env';
import { createDatabase } from './database/prisma';

const { PORT, DATABASE_URL } = loadEnv();
const database = createDatabase(DATABASE_URL);

const server = createApp(database).listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}/api (docs: /api/docs)`);
});

function shutdown(): void {
  server.close(() => {
    void database.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
