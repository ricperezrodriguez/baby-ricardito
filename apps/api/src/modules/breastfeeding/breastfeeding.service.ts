import type {
  BreastfeedingSession,
  BreastfeedingStats,
  CreateBreastfeedingSession,
  Page,
  PageQuery,
  StatsQuery,
  UpdateBreastfeedingSession,
} from '@baby-ricardito/contracts';
import type { RequireBaby } from '../../common/baby-guard';
import { conflict, unprocessableEntity } from '../../common/errors';
import type { UploadedFile } from '../../common/http/api-router';
import { isUniqueViolation } from '../../common/prisma-errors';
import { requireRecord, toStoredNotes } from '../../common/records';
import type { PhotoService } from '../photos/photo.routes';
import type { PhotoStorage } from '../photos/photo-storage';
import type { SegmentTimes } from './breastfeeding.metrics';
import { BreastfeedingRepository, toBreastfeedingSession } from './breastfeeding.repository';
import type { SegmentData, SessionData } from './breastfeeding.repository';
import { calculateBreastfeedingStats } from './breastfeeding.stats';

type SegmentInput = NonNullable<CreateBreastfeedingSession['segments']>[number];

function toSegmentData(segment: SegmentInput): SegmentData {
  return {
    breast: segment.breast,
    startTime: new Date(segment.startTime),
    endTime: segment.endTime === undefined || segment.endTime === null ? null : new Date(segment.endTime),
  };
}

/** Chronology rules (422): the end must not precede the start, for the session and for each segment. */
function assertChronology(start: Date, end: Date | null, segments: SegmentTimes[]): void {
  if (end !== null && end < start) {
    throw unprocessableEntity('END_BEFORE_START', '"endTime" must not be earlier than "startTime".');
  }
  segments.forEach((segment, index) => {
    const segmentEnd = segment.endTime ?? end;
    if (segmentEnd !== null && segmentEnd < segment.startTime) {
      throw unprocessableEntity(
        'SEGMENT_END_BEFORE_START',
        `"segments[${index}].endTime" must not be earlier than its "startTime".`,
      );
    }
  });
}

const IN_PROGRESS = () => conflict('SESSION_IN_PROGRESS', 'There is already a session in progress for this baby.');

export class BreastfeedingService implements PhotoService<BreastfeedingSession> {
  constructor(
    private readonly repository: BreastfeedingRepository,
    private readonly photos: PhotoStorage,
    private readonly requireBaby: RequireBaby,
  ) {}

  async list(babyId: string, query: PageQuery): Promise<Page<BreastfeedingSession>> {
    await this.requireBaby(babyId);
    const now = Date.now();
    const { rows, total } = await this.repository.list(babyId, query.limit, query.offset);
    return { items: rows.map((row) => toBreastfeedingSession(row, now)), total, limit: query.limit, offset: query.offset };
  }

  async getById(babyId: string, sessionId: string): Promise<BreastfeedingSession> {
    await this.requireBaby(babyId);
    return toBreastfeedingSession(await this.requireSession(babyId, sessionId), Date.now());
  }

  async create(babyId: string, input: CreateBreastfeedingSession): Promise<BreastfeedingSession> {
    await this.requireBaby(babyId);
    const start = new Date(input.startTime);
    const end = input.endTime === undefined || input.endTime === null ? null : new Date(input.endTime);
    const segments = (input.segments ?? []).map(toSegmentData);
    assertChronology(start, end, segments);
    if (end === null && (await this.repository.hasOpen(babyId, null))) {
      throw IN_PROGRESS();
    }

    const data: SessionData = { startTime: start, endTime: end, notes: toStoredNotes(input.notes) };
    try {
      return toBreastfeedingSession(await this.repository.create(babyId, data, segments), Date.now());
    } catch (error) {
      throw isUniqueViolation(error) ? IN_PROGRESS() : error;
    }
  }

  async update(babyId: string, sessionId: string, patch: UpdateBreastfeedingSession): Promise<BreastfeedingSession> {
    await this.requireBaby(babyId);
    const current = await this.requireSession(babyId, sessionId);
    const start = patch.startTime === undefined ? current.startTime : new Date(patch.startTime);
    const end =
      patch.endTime === undefined ? current.endTime : patch.endTime === null ? null : new Date(patch.endTime);
    const segments = patch.segments === undefined ? undefined : patch.segments.map(toSegmentData);
    assertChronology(start, end, segments ?? current.segments);
    if (end === null && (await this.repository.hasOpen(babyId, sessionId))) {
      throw IN_PROGRESS();
    }

    const data: Partial<SessionData> = {
      startTime: start,
      endTime: end,
      ...(patch.notes === undefined ? {} : { notes: toStoredNotes(patch.notes) }),
    };
    try {
      return toBreastfeedingSession(await this.repository.update(sessionId, data, segments), Date.now());
    } catch (error) {
      throw isUniqueViolation(error) ? IN_PROGRESS() : error;
    }
  }

  async remove(babyId: string, sessionId: string): Promise<void> {
    await this.requireBaby(babyId);
    const current = await this.requireSession(babyId, sessionId);
    await this.repository.delete(sessionId);
    await this.photos.remove(current.photoPath);
  }

  async setPhoto(babyId: string, sessionId: string, file: UploadedFile): Promise<BreastfeedingSession> {
    await this.requireBaby(babyId);
    const current = await this.requireSession(babyId, sessionId);
    const photoPath = await this.photos.save(file.buffer);
    try {
      const updated = await this.repository.update(sessionId, { photoPath }, undefined);
      await this.photos.remove(current.photoPath);
      return toBreastfeedingSession(updated, Date.now());
    } catch (error) {
      await this.photos.remove(photoPath);
      throw error;
    }
  }

  async removePhoto(babyId: string, sessionId: string): Promise<BreastfeedingSession> {
    await this.requireBaby(babyId);
    const current = await this.requireSession(babyId, sessionId);
    const updated = await this.repository.update(sessionId, { photoPath: null }, undefined);
    await this.photos.remove(current.photoPath);
    return toBreastfeedingSession(updated, Date.now());
  }

  async stats(babyId: string, query: StatsQuery): Promise<BreastfeedingStats> {
    await this.requireBaby(babyId);
    return calculateBreastfeedingStats(await this.repository.listFinishedForStats(babyId), query);
  }

  private requireSession(babyId: string, sessionId: string) {
    return requireRecord((id) => this.repository.findById(babyId, id), sessionId, 'SESSION_NOT_FOUND', 'Session');
  }
}
