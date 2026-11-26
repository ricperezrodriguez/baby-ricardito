import type { Bath, BathReaction } from '@baby-ricardito/contracts';
import type { Database } from '../../database/prisma';
import type { Bath as BathRow } from '../../generated/prisma/client';

export interface BathData {
  bathedAt: Date;
  hairWashed: boolean;
  /** `null` clears the reaction; `undefined` keeps it (update). */
  reaction?: BathReaction | null;
  /** `null` clears the notes; `undefined` keeps them (update). */
  notes?: string | null;
}

export function toBath(row: BathRow): Bath {
  return {
    id: row.id,
    babyId: row.babyId,
    bathedAt: row.bathedAt.toISOString(),
    hairWashed: row.hairWashed,
    ...(row.reaction === null ? {} : { reaction: row.reaction }),
    ...(row.notes === null ? {} : { notes: row.notes }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class BathRepository {
  constructor(private readonly database: Database) {}

  async list(babyId: string, limit: number, offset: number): Promise<{ rows: BathRow[]; total: number }> {
    const [rows, total] = await this.database.$transaction([
      this.database.bath.findMany({
        where: { babyId },
        orderBy: [{ bathedAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.database.bath.count({ where: { babyId } }),
    ]);
    return { rows, total };
  }

  findById(babyId: string, id: string): Promise<BathRow | null> {
    return this.database.bath.findFirst({ where: { id, babyId } });
  }

  create(babyId: string, data: BathData): Promise<BathRow> {
    return this.database.bath.create({ data: { ...data, babyId } });
  }

  update(id: string, data: Partial<BathData>): Promise<BathRow> {
    return this.database.bath.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.database.bath.delete({ where: { id } });
  }

  /** Every bath of the baby: intervals and the latest bath use the whole history. */
  listForStats(babyId: string): Promise<{ bathedAt: Date; hairWashed: boolean }[]> {
    return this.database.bath.findMany({ where: { babyId }, select: { bathedAt: true, hairWashed: true } });
  }
}
