import type {
  CreateSleepSession,
  Page,
  PageQuery,
  SleepSession,
  SleepStats,
  StatsQuery,
  UpdateSleepSession,
} from '@baby-ricardito/contracts';
import type { RequireBaby } from '../../common/baby-guard';
import { conflict, unprocessableEntity } from '../../common/errors';
import { isUniqueViolation } from '../../common/prisma-errors';
import { requireRecord, toStoredNotes } from '../../common/records';
import { SleepRepository } from './sleep.repository';
import type { SleepSessionData } from './sleep.repository';
import { calculateSleepStats } from './sleep.stats';
import type { SleepSession as SleepSessionRow } from '../../generated/prisma/client';

function toSession(row: SleepSessionRow, now: number): SleepSession {
  const end = row.endTime === null ? now : row.endTime.getTime();
  return {
    id: row.id,
    babyId: row.babyId,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime === null ? null : row.endTime.toISOString(),
    status: row.endTime === null ? 'in_progress' : 'finished',
    durationSeconds: Math.max(0, Math.round((end - row.startTime.getTime()) / 1_000)),
    ...(row.notes === null ? {} : { notes: row.notes }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Rules of a single sleep (422). */
function assertValidSleep(start: Date, end: Date | null, now: number): void {
  if (start.getTime() > now) {
    throw unprocessableEntity('START_IN_FUTURE', '"startTime" must not be in the future.');
  }
  if (end === null) {
    return;
  }
  if (end.getTime() > now) {
    throw unprocessableEntity('END_IN_FUTURE', '"endTime" must not be in the future.');
  }
  if (end.getTime() <= start.getTime()) {
    throw unprocessableEntity('END_BEFORE_START', '"endTime" must be later than "startTime".');
  }
}

export class SleepService {
  constructor(
    private readonly repository: SleepRepository,
    private readonly requireBaby: RequireBaby,
  ) {}

  async list(babyId: string, query: PageQuery): Promise<Page<SleepSession>> {
    await this.requireBaby(babyId);
    const now = Date.now();
    const { rows, total } = await this.repository.list(babyId, query.limit, query.offset);
    return { items: rows.map((row) => toSession(row, now)), total, limit: query.limit, offset: query.offset };
  }

  async getById(babyId: string, sleepId: string): Promise<SleepSession> {
    await this.requireBaby(babyId);
    return toSession(await this.requireSleep(babyId, sleepId), Date.now());
  }

  async create(babyId: string, input: CreateSleepSession): Promise<SleepSession> {
    await this.requireBaby(babyId);
    const now = Date.now();
    const start = new Date(input.startTime);
    const end = input.endTime === undefined || input.endTime === null ? null : new Date(input.endTime);
    assertValidSleep(start, end, now);
    await this.assertNoConflicts(babyId, start, end, null);

    const data: SleepSessionData = { startTime: start, endTime: end, notes: toStoredNotes(input.notes) };
    try {
      return toSession(await this.repository.create(babyId, data), now);
    } catch (error) {
      throw isUniqueViolation(error) ? conflict('SLEEP_IN_PROGRESS', 'There is already a sleep in progress.') : error;
    }
  }

  async update(babyId: string, sleepId: string, patch: UpdateSleepSession): Promise<SleepSession> {
    await this.requireBaby(babyId);
    const current = await this.requireSleep(babyId, sleepId);
    const now = Date.now();
    const start = patch.startTime === undefined ? current.startTime : new Date(patch.startTime);
    const end =
      patch.endTime === undefined ? current.endTime : patch.endTime === null ? null : new Date(patch.endTime);
    assertValidSleep(start, end, now);
    await this.assertNoConflicts(babyId, start, end, sleepId);

    const data: Partial<SleepSessionData> = {
      startTime: start,
      endTime: end,
      ...(patch.notes === undefined ? {} : { notes: toStoredNotes(patch.notes) }),
    };
    try {
      return toSession(await this.repository.update(sleepId, data), now);
    } catch (error) {
      throw isUniqueViolation(error) ? conflict('SLEEP_IN_PROGRESS', 'There is already a sleep in progress.') : error;
    }
  }

  async remove(babyId: string, sleepId: string): Promise<void> {
    await this.requireBaby(babyId);
    await this.requireSleep(babyId, sleepId);
    await this.repository.delete(sleepId);
  }

  async stats(babyId: string, query: StatsQuery): Promise<SleepStats> {
    await this.requireBaby(babyId);
    return calculateSleepStats(await this.repository.listForStats(babyId), query);
  }

  /** Rules that depend on the other sleeps of the baby (409): one ongoing sleep at most and no overlaps. */
  private async assertNoConflicts(babyId: string, start: Date, end: Date | null, excludeId: string | null): Promise<void> {
    if (end === null && (await this.repository.hasOngoing(babyId, excludeId))) {
      throw conflict('SLEEP_IN_PROGRESS', 'There is already a sleep in progress.');
    }
    if (await this.repository.hasOverlap(babyId, start, end, excludeId)) {
      throw conflict('SLEEP_OVERLAP', 'The sleep overlaps another sleep of the baby.');
    }
  }

  private requireSleep(babyId: string, sleepId: string) {
    return requireRecord((id) => this.repository.findById(babyId, id), sleepId, 'SLEEP_NOT_FOUND', 'Sleep session');
  }
}
