import type { DiaperChange, DiaperType, StoolColor, StoolConsistency } from '@baby-ricardito/contracts';
import type { Database } from '../../database/prisma';
import type { DiaperChange as DiaperChangeRow } from '../../generated/prisma/client';
import { photoUrl } from '../photos/photo-storage';

export interface DiaperChangeData {
  changedAt: Date;
  type: DiaperType;
  stoolColor: StoolColor | null;
  stoolConsistency: StoolConsistency | null;
  hasRash: boolean;
  /** `null` clears the notes; `undefined` keeps them (update). */
  notes?: string | null;
  /** File name inside the photos folder; `null` removes the photo; `undefined` keeps it (update). */
  photoPath?: string | null;
}

export function toDiaperChange(row: DiaperChangeRow): DiaperChange {
  const url = photoUrl(row.photoPath);
  return {
    id: row.id,
    babyId: row.babyId,
    changedAt: row.changedAt.toISOString(),
    type: row.type,
    stoolColor: row.stoolColor,
    stoolConsistency: row.stoolConsistency,
    hasRash: row.hasRash,
    ...(row.notes === null ? {} : { notes: row.notes }),
    ...(url === undefined ? {} : { photoUrl: url }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class DiaperRepository {
  constructor(private readonly database: Database) {}

  /** Newest first; `types` empty means every type. */
  async list(
    babyId: string,
    limit: number,
    offset: number,
    types: readonly DiaperType[],
  ): Promise<{ rows: DiaperChangeRow[]; total: number }> {
    const where = { babyId, ...(types.length === 0 ? {} : { type: { in: [...types] } }) };
    const [rows, total] = await this.database.$transaction([
      this.database.diaperChange.findMany({
        where,
        orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.database.diaperChange.count({ where }),
    ]);
    return { rows, total };
  }

  findById(babyId: string, id: string): Promise<DiaperChangeRow | null> {
    return this.database.diaperChange.findFirst({ where: { id, babyId } });
  }

  create(babyId: string, data: DiaperChangeData): Promise<DiaperChangeRow> {
    return this.database.diaperChange.create({ data: { ...data, babyId } });
  }

  update(id: string, data: Partial<DiaperChangeData>): Promise<DiaperChangeRow> {
    return this.database.diaperChange.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.database.diaperChange.delete({ where: { id } });
  }

  /** Only what the stats need, every change of the baby (intervals reach back before the range). */
  listForStats(
    babyId: string,
  ): Promise<{ changedAt: Date; type: DiaperType; stoolColor: StoolColor | null; hasRash: boolean }[]> {
    return this.database.diaperChange.findMany({
      where: { babyId },
      select: { changedAt: true, type: true, stoolColor: true, hasRash: true },
    });
  }
}
