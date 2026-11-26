import type { NailTrim, NailTrimArea } from '@baby-ricardito/contracts';
import type { Database } from '../../database/prisma';
import type { NailTrim as NailTrimRow } from '../../generated/prisma/client';

export interface NailTrimData {
  trimmedAt: Date;
  areas: NailTrimArea[];
  /** `null` clears the notes; `undefined` keeps them (update). */
  notes?: string | null;
}

export function toNailTrim(row: NailTrimRow): NailTrim {
  return {
    id: row.id,
    babyId: row.babyId,
    trimmedAt: row.trimmedAt.toISOString(),
    areas: row.areas,
    ...(row.notes === null ? {} : { notes: row.notes }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class NailTrimmingRepository {
  constructor(private readonly database: Database) {}

  async list(babyId: string, limit: number, offset: number): Promise<{ rows: NailTrimRow[]; total: number }> {
    const [rows, total] = await this.database.$transaction([
      this.database.nailTrim.findMany({
        where: { babyId },
        orderBy: [{ trimmedAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.database.nailTrim.count({ where: { babyId } }),
    ]);
    return { rows, total };
  }

  findById(babyId: string, id: string): Promise<NailTrimRow | null> {
    return this.database.nailTrim.findFirst({ where: { id, babyId } });
  }

  create(babyId: string, data: NailTrimData): Promise<NailTrimRow> {
    return this.database.nailTrim.create({ data: { ...data, babyId } });
  }

  update(id: string, data: Partial<NailTrimData>): Promise<NailTrimRow> {
    return this.database.nailTrim.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.database.nailTrim.delete({ where: { id } });
  }

  /** Every trim of the baby: intervals and the last trim of each zone use the whole history. */
  listForStats(babyId: string): Promise<{ trimmedAt: Date; areas: NailTrimArea[] }[]> {
    return this.database.nailTrim.findMany({ where: { babyId }, select: { trimmedAt: true, areas: true } });
  }
}
