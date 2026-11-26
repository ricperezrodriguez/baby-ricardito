import type {
  Bath,
  BathStats,
  CreateBath,
  Page,
  PageQuery,
  StatsQuery,
  UpdateBath,
} from '@baby-ricardito/contracts';
import type { RequireBaby } from '../../common/baby-guard';
import { assertNotInFuture, requireRecord, toStoredNotes } from '../../common/records';
import { BathRepository, toBath } from './bath.repository';
import type { BathData } from './bath.repository';
import { calculateBathStats } from './bath.stats';

const FUTURE_CODE = 'BATHED_AT_IN_FUTURE';

export class BathService {
  constructor(
    private readonly repository: BathRepository,
    private readonly requireBaby: RequireBaby,
  ) {}

  async list(babyId: string, query: PageQuery): Promise<Page<Bath>> {
    await this.requireBaby(babyId);
    const { rows, total } = await this.repository.list(babyId, query.limit, query.offset);
    return { items: rows.map(toBath), total, limit: query.limit, offset: query.offset };
  }

  async getById(babyId: string, bathId: string): Promise<Bath> {
    await this.requireBaby(babyId);
    return toBath(await this.requireBath(babyId, bathId));
  }

  async create(babyId: string, input: CreateBath): Promise<Bath> {
    await this.requireBaby(babyId);
    assertNotInFuture(input.bathedAt, Date.now(), 'bathedAt', FUTURE_CODE);
    const data: BathData = {
      bathedAt: new Date(input.bathedAt),
      hairWashed: input.hairWashed,
      reaction: input.reaction,
      notes: toStoredNotes(input.notes),
    };
    return toBath(await this.repository.create(babyId, data));
  }

  async update(babyId: string, bathId: string, patch: UpdateBath): Promise<Bath> {
    await this.requireBaby(babyId);
    await this.requireBath(babyId, bathId);
    if (patch.bathedAt !== undefined) {
      assertNotInFuture(patch.bathedAt, Date.now(), 'bathedAt', FUTURE_CODE);
    }
    const data: Partial<BathData> = {
      ...(patch.bathedAt === undefined ? {} : { bathedAt: new Date(patch.bathedAt) }),
      ...(patch.hairWashed === undefined ? {} : { hairWashed: patch.hairWashed }),
      ...(patch.reaction === undefined ? {} : { reaction: patch.reaction }),
      ...(patch.notes === undefined ? {} : { notes: toStoredNotes(patch.notes) }),
    };
    return toBath(await this.repository.update(bathId, data));
  }

  async remove(babyId: string, bathId: string): Promise<void> {
    await this.requireBaby(babyId);
    await this.requireBath(babyId, bathId);
    await this.repository.delete(bathId);
  }

  async stats(babyId: string, query: StatsQuery): Promise<BathStats> {
    await this.requireBaby(babyId);
    return calculateBathStats(await this.repository.listForStats(babyId), query);
  }

  private requireBath(babyId: string, bathId: string) {
    return requireRecord((id) => this.repository.findById(babyId, id), bathId, 'BATH_NOT_FOUND', 'Bath');
  }
}
