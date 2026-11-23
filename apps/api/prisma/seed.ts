import { loadEnv } from '../src/config/env';
import { createDatabase } from '../src/database/prisma';

export const DEFAULT_BABY_ID = 'baby-1';

const { DATABASE_URL } = loadEnv();
const database = createDatabase(DATABASE_URL);

try {
  await database.baby.upsert({
    where: { id: DEFAULT_BABY_ID },
    update: {},
    create: { id: DEFAULT_BABY_ID, name: 'Baby Ricardito' },
  });
  console.log(`Baby "${DEFAULT_BABY_ID}" is ready.`);
} finally {
  await database.$disconnect();
}
