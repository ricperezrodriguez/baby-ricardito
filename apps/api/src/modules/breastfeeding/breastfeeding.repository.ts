import type { BreastfeedingSession, Breast } from '@baby-ricardito/contracts';
import type { Database } from '../../database/prisma';
import type { Prisma } from '../../generated/prisma/client';
import { photoUrl } from '../photos/photo-storage';
import { calculateSessionMetrics } from './breastfeeding.metrics';
import type { SegmentTimes, SessionTimes } from './breastfeeding.metrics';

const WITH_SEGMENTS = { segments: { orderBy: [{ startTime: 'asc' }, { id: 'asc' }] } } satisfies Prisma.BreastfeedingSessionInclude;

export type SessionRow = Prisma.BreastfeedingSessionGetPayload<{ include: typeof WITH_SEGMENTS }>;

export interface SessionData {
  startTime: Date;
  endTime: Date | null;
  /** `null` clears the notes; `undefined` keeps them (update). */
  notes?: string | null;
  /** File name inside the photos folder; `null` removes the photo; `undefined` keeps it (update). */
  photoPath?: string | null;
}

/** Segments as stored: the list always replaces the previous one. */
export type SegmentData = SegmentTimes;

function toTimes(row: SessionRow): SessionTimes {
  return {
    startTime: row.startTime,
    endTime: row.endTime,
    segments: row.segments.map(({ breast, startTime, endTime }) => ({ breast, startTime, endTime })),
  };
}

export function toBreastfeedingSession(row: SessionRow, now: number): BreastfeedingSession {
  const metrics = calculateSessionMetrics(toTimes(row), now);
  const url = photoUrl(row.photoPath);
  return {
    id: row.id,
    babyId: row.babyId,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime === null ? null : row.endTime.toISOString(),
    status: metrics.status,
    segments: metrics.segments.map((segment) => ({
      breast: segment.breast,
      startTime: segment.startTime.toISOString(),
      endTime: segment.endTime === null ? null : segment.endTime.toISOString(),
    })),
    totalDurationSeconds: metrics.totalDurationSeconds,
    leftBreastDurationSeconds: metrics.leftBreastDurationSeconds,
    rightBreastDurationSeconds: metrics.rightBreastDurationSeconds,
    firstBreast: metrics.firstBreast as Breast | null,
    ...(row.notes === null ? {} : { notes: row.notes }),
    ...(url === undefined ? {} : { photoUrl: url }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class BreastfeedingRepository {
  constructor(private readonly database: Database) {}

  /** Newest start first, so an open session is always the first one. */
  async list(babyId: string, limit: number, offset: number): Promise<{ rows: SessionRow[]; total: number }> {
    const [rows, total] = await this.database.$transaction([
      this.database.breastfeedingSession.findMany({
        where: { babyId },
        include: WITH_SEGMENTS,
        orderBy: [{ startTime: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.database.breastfeedingSession.count({ where: { babyId } }),
    ]);
    return { rows, total };
  }

  findById(babyId: string, id: string): Promise<SessionRow | null> {
    return this.database.breastfeedingSession.findFirst({ where: { id, babyId }, include: WITH_SEGMENTS });
  }

  create(babyId: string, data: SessionData, segments: SegmentData[]): Promise<SessionRow> {
    return this.database.breastfeedingSession.create({
      data: { ...data, babyId, segments: { create: segments } },
      include: WITH_SEGMENTS,
    });
  }

  /** Updates the session; when `segments` is given it replaces the whole list in the same write. */
  update(id: string, data: Partial<SessionData>, segments: SegmentData[] | undefined): Promise<SessionRow> {
    return this.database.breastfeedingSession.update({
      where: { id },
      data: { ...data, ...(segments === undefined ? {} : { segments: { deleteMany: {}, create: segments } }) },
      include: WITH_SEGMENTS,
    });
  }

  async delete(id: string): Promise<void> {
    await this.database.breastfeedingSession.delete({ where: { id } });
  }

  /** Another session of the baby (not `excludeId`) is still open. */
  async hasOpen(babyId: string, excludeId: string | null): Promise<boolean> {
    const count = await this.database.breastfeedingSession.count({
      where: { babyId, endTime: null, ...(excludeId === null ? {} : { id: { not: excludeId } }) },
    });
    return count > 0;
  }

  /** Every finished session of the baby with its segments: intervals reach back before the range. */
  async listFinishedForStats(babyId: string): Promise<SessionTimes[]> {
    const rows = await this.database.breastfeedingSession.findMany({
      where: { babyId, endTime: { not: null } },
      select: {
        startTime: true,
        endTime: true,
        segments: { select: { breast: true, startTime: true, endTime: true } },
      },
    });
    return rows;
  }
}
