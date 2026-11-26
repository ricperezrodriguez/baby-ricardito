import type {
  BottleFeed,
  BottleFeedsQuery,
  BottleStats,
  CreateBottleFeed,
  Page,
  StatsQuery,
  UpdateBottleFeed,
} from '@baby-ricardito/contracts';
import type { RequireBaby } from '../../common/baby-guard';
import { assertNotInFuture, requireRecord, toStoredNotes } from '../../common/records';
import { BottleRepository, toBottleFeed } from './bottle.repository';
import type { BottleFeedData } from './bottle.repository';
import { calculateBottleStats } from './bottle.stats';

const FUTURE_CODE = 'FED_AT_IN_FUTURE';

export class BottleService {
  constructor(
    private readonly repository: BottleRepository,
    private readonly requireBaby: RequireBaby,
  ) {}

  async list(babyId: string, query: BottleFeedsQuery): Promise<Page<BottleFeed>> {
    await this.requireBaby(babyId);
    const { rows, total } = await this.repository.list(babyId, query.limit, query.offset, query.milkType);
    return { items: rows.map(toBottleFeed), total, limit: query.limit, offset: query.offset };
  }

  async getById(babyId: string, feedId: string): Promise<BottleFeed> {
    await this.requireBaby(babyId);
    return toBottleFeed(await this.requireFeed(babyId, feedId));
  }

  async create(babyId: string, input: CreateBottleFeed): Promise<BottleFeed> {
    await this.requireBaby(babyId);
    assertNotInFuture(input.fedAt, Date.now(), 'fedAt', FUTURE_CODE);
    const data: BottleFeedData = {
      fedAt: new Date(input.fedAt),
      amountMl: input.amountMl,
      milkType: input.milkType,
      notes: toStoredNotes(input.notes),
    };
    return toBottleFeed(await this.repository.create(babyId, data));
  }

  async update(babyId: string, feedId: string, patch: UpdateBottleFeed): Promise<BottleFeed> {
    await this.requireBaby(babyId);
    await this.requireFeed(babyId, feedId);
    if (patch.fedAt !== undefined) {
      assertNotInFuture(patch.fedAt, Date.now(), 'fedAt', FUTURE_CODE);
    }
    const data: Partial<BottleFeedData> = {
      ...(patch.fedAt === undefined ? {} : { fedAt: new Date(patch.fedAt) }),
      ...(patch.amountMl === undefined ? {} : { amountMl: patch.amountMl }),
      ...(patch.milkType === undefined ? {} : { milkType: patch.milkType }),
      ...(patch.notes === undefined ? {} : { notes: toStoredNotes(patch.notes) }),
    };
    return toBottleFeed(await this.repository.update(feedId, data));
  }

  async remove(babyId: string, feedId: string): Promise<void> {
    await this.requireBaby(babyId);
    await this.requireFeed(babyId, feedId);
    await this.repository.delete(feedId);
  }

  async stats(babyId: string, query: StatsQuery): Promise<BottleStats> {
    await this.requireBaby(babyId);
    return calculateBottleStats(await this.repository.listForStats(babyId), query);
  }

  private requireFeed(babyId: string, feedId: string) {
    return requireRecord((id) => this.repository.findById(babyId, id), feedId, 'FEED_NOT_FOUND', 'Bottle feed');
  }
}
