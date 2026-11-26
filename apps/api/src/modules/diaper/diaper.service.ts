import type {
  CreateDiaperChange,
  DiaperChange,
  DiaperChangesQuery,
  DiaperStats,
  Page,
  StatsQuery,
  UpdateDiaperChange,
} from '@baby-ricardito/contracts';
import type { RequireBaby } from '../../common/baby-guard';
import { unprocessableEntity } from '../../common/errors';
import type { UploadedFile } from '../../common/http/api-router';
import { assertNotInFuture, requireRecord, toStoredNotes } from '../../common/records';
import type { PhotoService } from '../photos/photo.routes';
import type { PhotoStorage } from '../photos/photo-storage';
import { DiaperRepository, toDiaperChange } from './diaper.repository';
import type { DiaperChangeData } from './diaper.repository';
import { calculateDiaperStats } from './diaper.stats';

const FUTURE_CODE = 'CHANGED_AT_IN_FUTURE';

/** Stool details only make sense when the diaper has poop. */
function assertStoolRules(change: Pick<DiaperChangeData, 'type' | 'stoolColor' | 'stoolConsistency'>): void {
  if (change.type === 'wet' && (change.stoolColor !== null || change.stoolConsistency !== null)) {
    throw unprocessableEntity(
      'STOOL_DETAILS_NOT_ALLOWED',
      '"stoolColor" and "stoolConsistency" are not allowed for a wet diaper.',
    );
  }
}

export class DiaperService implements PhotoService<DiaperChange> {
  constructor(
    private readonly repository: DiaperRepository,
    private readonly photos: PhotoStorage,
    private readonly requireBaby: RequireBaby,
  ) {}

  async list(babyId: string, query: DiaperChangesQuery): Promise<Page<DiaperChange>> {
    await this.requireBaby(babyId);
    const { rows, total } = await this.repository.list(babyId, query.limit, query.offset, query.type);
    return { items: rows.map(toDiaperChange), total, limit: query.limit, offset: query.offset };
  }

  async getById(babyId: string, changeId: string): Promise<DiaperChange> {
    await this.requireBaby(babyId);
    return toDiaperChange(await this.requireChange(babyId, changeId));
  }

  async create(babyId: string, input: CreateDiaperChange): Promise<DiaperChange> {
    await this.requireBaby(babyId);
    assertNotInFuture(input.changedAt, Date.now(), 'changedAt', FUTURE_CODE);
    const data: DiaperChangeData = {
      changedAt: new Date(input.changedAt),
      type: input.type,
      stoolColor: input.stoolColor ?? null,
      stoolConsistency: input.stoolConsistency ?? null,
      hasRash: input.hasRash ?? false,
      notes: toStoredNotes(input.notes),
    };
    assertStoolRules(data);
    return toDiaperChange(await this.repository.create(babyId, data));
  }

  async update(babyId: string, changeId: string, patch: UpdateDiaperChange): Promise<DiaperChange> {
    await this.requireBaby(babyId);
    const current = await this.requireChange(babyId, changeId);
    if (patch.changedAt !== undefined) {
      assertNotInFuture(patch.changedAt, Date.now(), 'changedAt', FUTURE_CODE);
    }
    const merged = {
      type: patch.type ?? current.type,
      stoolColor: patch.stoolColor !== undefined ? patch.stoolColor : current.stoolColor,
      stoolConsistency: patch.stoolConsistency !== undefined ? patch.stoolConsistency : current.stoolConsistency,
    };
    assertStoolRules(merged);

    const data: Partial<DiaperChangeData> = {
      ...merged,
      ...(patch.changedAt === undefined ? {} : { changedAt: new Date(patch.changedAt) }),
      ...(patch.hasRash === undefined ? {} : { hasRash: patch.hasRash }),
      ...(patch.notes === undefined ? {} : { notes: toStoredNotes(patch.notes) }),
    };
    return toDiaperChange(await this.repository.update(changeId, data));
  }

  async remove(babyId: string, changeId: string): Promise<void> {
    await this.requireBaby(babyId);
    const current = await this.requireChange(babyId, changeId);
    await this.repository.delete(changeId);
    await this.photos.remove(current.photoPath);
  }

  async setPhoto(babyId: string, changeId: string, file: UploadedFile): Promise<DiaperChange> {
    await this.requireBaby(babyId);
    const current = await this.requireChange(babyId, changeId);
    const photoPath = await this.photos.save(file.buffer);
    try {
      const updated = await this.repository.update(changeId, { photoPath });
      await this.photos.remove(current.photoPath);
      return toDiaperChange(updated);
    } catch (error) {
      await this.photos.remove(photoPath);
      throw error;
    }
  }

  async removePhoto(babyId: string, changeId: string): Promise<DiaperChange> {
    await this.requireBaby(babyId);
    const current = await this.requireChange(babyId, changeId);
    const updated = await this.repository.update(changeId, { photoPath: null });
    await this.photos.remove(current.photoPath);
    return toDiaperChange(updated);
  }

  async stats(babyId: string, query: StatsQuery): Promise<DiaperStats> {
    await this.requireBaby(babyId);
    return calculateDiaperStats(await this.repository.listForStats(babyId), query);
  }

  private requireChange(babyId: string, changeId: string) {
    return requireRecord((id) => this.repository.findById(babyId, id), changeId, 'CHANGE_NOT_FOUND', 'Diaper change');
  }
}
