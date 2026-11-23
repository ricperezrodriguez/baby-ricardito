import type { BottleFeed, BottleMilkType } from '@baby-ricardito/contracts';
import type { Database } from '../../database/prisma';
import type { BottleFeed as BottleFeedRow } from '../../generated/prisma/client';

export interface BottleFeedData {
  fedAt: Date;
  amountMl: number;
  milkType: BottleMilkType;
  /** `null` clears the notes; `undefined` keeps them (update). */
  notes?: string | null;
}

export function toBottleFeed(row: BottleFeedRow): BottleFeed {
  return {
    id: row.id,
    babyId: row.babyId,
    fedAt: row.fedAt.toISOString(),
    amountMl: row.amountMl,
    milkType: row.milkType,
    ...(row.notes === null ? {} : { notes: row.notes }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class BottleRepository {
  constructor(private readonly database: Database) {}

  /** Newest first; `milkTypes` empty means every milk type. */
  async list(
    babyId: string,
    limit: number,
    offset: number,
    milkTypes: readonly BottleMilkType[],
  ): Promise<{ rows: BottleFeedRow[]; total: number }> {
    const where = { babyId, ...(milkTypes.length === 0 ? {} : { milkType: { in: [...milkTypes] } }) };
    const [rows, total] = await this.database.$transaction([
      this.database.bottleFeed.findMany({
        where,
        orderBy: [{ fedAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.database.bottleFeed.count({ where }),
    ]);
    return { rows, total };
  }

  findById(babyId: string, id: string): Promise<BottleFeedRow | null> {
    return this.database.bottleFeed.findFirst({ where: { id, babyId } });
  }

  create(babyId: string, data: BottleFeedData): Promise<BottleFeedRow> {
    return this.database.bottleFeed.create({ data: { ...data, babyId } });
  }

  update(id: string, data: Partial<BottleFeedData>): Promise<BottleFeedRow> {
    return this.database.bottleFeed.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.database.bottleFeed.delete({ where: { id } });
  }

  /** Only what the stats need, every feed of the baby (intervals reach back before the range). */
  listForStats(babyId: string): Promise<Pick<BottleFeedRow, 'fedAt' | 'amountMl' | 'milkType'>[]> {
    return this.database.bottleFeed.findMany({
      where: { babyId },
      select: { fedAt: true, amountMl: true, milkType: true },
    });
  }
}
