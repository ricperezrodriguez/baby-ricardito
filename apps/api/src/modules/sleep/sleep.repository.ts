import type { Database } from '../../database/prisma';
import type { SleepSession as SleepSessionRow } from '../../generated/prisma/client';

export interface SleepSessionData {
  startTime: Date;
  /** `null` = ongoing. */
  endTime: Date | null;
  /** `null` clears the notes; `undefined` keeps them (update). */
  notes?: string | null;
}

export class SleepRepository {
  constructor(private readonly database: Database) {}

  /** Newest start first, so an ongoing sleep is always the first one. */
  async list(babyId: string, limit: number, offset: number): Promise<{ rows: SleepSessionRow[]; total: number }> {
    const [rows, total] = await this.database.$transaction([
      this.database.sleepSession.findMany({
        where: { babyId },
        orderBy: [{ startTime: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.database.sleepSession.count({ where: { babyId } }),
    ]);
    return { rows, total };
  }

  findById(babyId: string, id: string): Promise<SleepSessionRow | null> {
    return this.database.sleepSession.findFirst({ where: { id, babyId } });
  }

  create(babyId: string, data: SleepSessionData): Promise<SleepSessionRow> {
    return this.database.sleepSession.create({ data: { ...data, babyId } });
  }

  update(id: string, data: Partial<SleepSessionData>): Promise<SleepSessionRow> {
    return this.database.sleepSession.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.database.sleepSession.delete({ where: { id } });
  }

  /** Another sleep of the baby (not `excludeId`) is still ongoing. */
  async hasOngoing(babyId: string, excludeId: string | null): Promise<boolean> {
    const count = await this.database.sleepSession.count({
      where: { babyId, endTime: null, ...(excludeId === null ? {} : { id: { not: excludeId } }) },
    });
    return count > 0;
  }

  /** Another sleep of the baby (not `excludeId`) overlaps `[start, end)`; `end` null means ongoing (no end). */
  async hasOverlap(babyId: string, start: Date, end: Date | null, excludeId: string | null): Promise<boolean> {
    const count = await this.database.sleepSession.count({
      where: {
        babyId,
        ...(excludeId === null ? {} : { id: { not: excludeId } }),
        ...(end === null ? {} : { startTime: { lt: end } }),
        OR: [{ endTime: null }, { endTime: { gt: start } }],
      },
    });
    return count > 0;
  }

  /** Every sleep of the baby: awake time reaches back before the range. */
  listForStats(babyId: string): Promise<{ startTime: Date; endTime: Date | null }[]> {
    return this.database.sleepSession.findMany({
      where: { babyId },
      select: { startTime: true, endTime: true },
    });
  }
}
