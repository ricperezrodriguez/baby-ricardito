import type {
  CreateNailTrim,
  NailTrim,
  NailTrimmingStats,
  Page,
  PageQuery,
  StatsQuery,
  UpdateNailTrim,
} from '@baby-ricardito/contracts';
import type { RequireBaby } from '../../common/baby-guard';
import { assertNotInFuture, requireRecord, toStoredNotes } from '../../common/records';
import { NailTrimmingRepository, toNailTrim } from './nail-trimming.repository';
import type { NailTrimData } from './nail-trimming.repository';
import { calculateNailTrimmingStats } from './nail-trimming.stats';

const FUTURE_CODE = 'TRIMMED_AT_IN_FUTURE';

export class NailTrimmingService {
  constructor(
    private readonly repository: NailTrimmingRepository,
    private readonly requireBaby: RequireBaby,
  ) {}

  async list(babyId: string, query: PageQuery): Promise<Page<NailTrim>> {
    await this.requireBaby(babyId);
    const { rows, total } = await this.repository.list(babyId, query.limit, query.offset);
    return { items: rows.map(toNailTrim), total, limit: query.limit, offset: query.offset };
  }

  async getById(babyId: string, trimId: string): Promise<NailTrim> {
    await this.requireBaby(babyId);
    return toNailTrim(await this.requireTrim(babyId, trimId));
  }

  async create(babyId: string, input: CreateNailTrim): Promise<NailTrim> {
    await this.requireBaby(babyId);
    assertNotInFuture(input.trimmedAt, Date.now(), 'trimmedAt', FUTURE_CODE);
    const data: NailTrimData = {
      trimmedAt: new Date(input.trimmedAt),
      areas: input.areas,
      notes: toStoredNotes(input.notes),
    };
    return toNailTrim(await this.repository.create(babyId, data));
  }

  async update(babyId: string, trimId: string, patch: UpdateNailTrim): Promise<NailTrim> {
    await this.requireBaby(babyId);
    await this.requireTrim(babyId, trimId);
    if (patch.trimmedAt !== undefined) {
      assertNotInFuture(patch.trimmedAt, Date.now(), 'trimmedAt', FUTURE_CODE);
    }
    const data: Partial<NailTrimData> = {
      ...(patch.trimmedAt === undefined ? {} : { trimmedAt: new Date(patch.trimmedAt) }),
      ...(patch.areas === undefined ? {} : { areas: patch.areas }),
      ...(patch.notes === undefined ? {} : { notes: toStoredNotes(patch.notes) }),
    };
    return toNailTrim(await this.repository.update(trimId, data));
  }

  async remove(babyId: string, trimId: string): Promise<void> {
    await this.requireBaby(babyId);
    await this.requireTrim(babyId, trimId);
    await this.repository.delete(trimId);
  }

  async stats(babyId: string, query: StatsQuery): Promise<NailTrimmingStats> {
    await this.requireBaby(babyId);
    return calculateNailTrimmingStats(await this.repository.listForStats(babyId), query);
  }

  private requireTrim(babyId: string, trimId: string) {
    return requireRecord((id) => this.repository.findById(babyId, id), trimId, 'NAIL_TRIM_NOT_FOUND', 'Nail trim');
  }
}
