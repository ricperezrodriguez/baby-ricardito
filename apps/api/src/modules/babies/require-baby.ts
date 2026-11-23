import type { RequireBaby } from '../../common/baby-guard';
import { notFound } from '../../common/errors';
import type { Database } from '../../database/prisma';

export function createRequireBaby(database: Database): RequireBaby {
  return async (babyId) => {
    const count = await database.baby.count({ where: { id: babyId } });
    if (count === 0) {
      throw notFound('BABY_NOT_FOUND', `Baby "${babyId}" does not exist.`);
    }
  };
}
