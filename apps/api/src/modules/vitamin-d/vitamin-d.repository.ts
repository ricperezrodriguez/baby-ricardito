import type { VitaminDDose } from '@baby-ricardito/contracts';
import type { Database } from '../../database/prisma';
import type { VitaminDDose as VitaminDDoseRow } from '../../generated/prisma/client';

export interface VitaminDDoseData {
  givenAt: Date;
  /** `null` means "not recorded"; `undefined` keeps the value (update). */
  drops?: number | null;
  /** `null` clears the notes; `undefined` keeps them (update). */
  notes?: string | null;
}

export function toVitaminDDose(row: VitaminDDoseRow): VitaminDDose {
  return {
    id: row.id,
    babyId: row.babyId,
    givenAt: row.givenAt.toISOString(),
    ...(row.drops === null ? {} : { drops: row.drops }),
    ...(row.notes === null ? {} : { notes: row.notes }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class VitaminDRepository {
  constructor(private readonly database: Database) {}

  async list(babyId: string, limit: number, offset: number): Promise<{ rows: VitaminDDoseRow[]; total: number }> {
    const [rows, total] = await this.database.$transaction([
      this.database.vitaminDDose.findMany({
        where: { babyId },
        orderBy: [{ givenAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.database.vitaminDDose.count({ where: { babyId } }),
    ]);
    return { rows, total };
  }

  findById(babyId: string, id: string): Promise<VitaminDDoseRow | null> {
    return this.database.vitaminDDose.findFirst({ where: { id, babyId } });
  }

  create(babyId: string, data: VitaminDDoseData): Promise<VitaminDDoseRow> {
    return this.database.vitaminDDose.create({ data: { ...data, babyId } });
  }

  update(id: string, data: Partial<VitaminDDoseData>): Promise<VitaminDDoseRow> {
    return this.database.vitaminDDose.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.database.vitaminDDose.delete({ where: { id } });
  }

  /** Every dose of the baby: streaks and the last dose use the whole history. */
  listForStats(babyId: string): Promise<{ givenAt: Date; drops: number | null }[]> {
    return this.database.vitaminDDose.findMany({ where: { babyId }, select: { givenAt: true, drops: true } });
  }
}
