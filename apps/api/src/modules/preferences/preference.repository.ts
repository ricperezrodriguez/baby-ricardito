import type { Database } from '../../database/prisma';
import type { Prisma } from '../../generated/prisma/client';

/** Reads and writes the `baby_preferences` rows (one per baby and key). */
export class PreferenceRepository {
  constructor(private readonly database: Database) {}

  async find(babyId: string, key: string): Promise<unknown> {
    const row = await this.database.babyPreference.findUnique({ where: { babyId_key: { babyId, key } } });
    return row?.value ?? null;
  }

  async save(babyId: string, key: string, value: Prisma.InputJsonValue): Promise<void> {
    await this.database.babyPreference.upsert({
      where: { babyId_key: { babyId, key } },
      update: { value },
      create: { babyId, key, value },
    });
  }
}
