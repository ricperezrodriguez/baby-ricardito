import type {
  CreateVitaminDDose,
  Page,
  StatsQuery,
  UpdateVitaminDDose,
  VitaminDDose,
  VitaminDStats,
} from '@baby-ricardito/contracts';
import type { PageQuery } from '@baby-ricardito/contracts';
import type { RequireBaby } from '../../common/baby-guard';
import { assertNotInFuture, requireRecord, toStoredNotes } from '../../common/records';
import { VitaminDRepository, toVitaminDDose } from './vitamin-d.repository';
import type { VitaminDDoseData } from './vitamin-d.repository';
import { calculateVitaminDStats } from './vitamin-d.stats';

const FUTURE_CODE = 'GIVEN_AT_IN_FUTURE';

export class VitaminDService {
  constructor(
    private readonly repository: VitaminDRepository,
    private readonly requireBaby: RequireBaby,
  ) {}

  async list(babyId: string, query: PageQuery): Promise<Page<VitaminDDose>> {
    await this.requireBaby(babyId);
    const { rows, total } = await this.repository.list(babyId, query.limit, query.offset);
    return { items: rows.map(toVitaminDDose), total, limit: query.limit, offset: query.offset };
  }

  async getById(babyId: string, doseId: string): Promise<VitaminDDose> {
    await this.requireBaby(babyId);
    return toVitaminDDose(await this.requireDose(babyId, doseId));
  }

  async create(babyId: string, input: CreateVitaminDDose): Promise<VitaminDDose> {
    await this.requireBaby(babyId);
    assertNotInFuture(input.givenAt, Date.now(), 'givenAt', FUTURE_CODE);
    const data: VitaminDDoseData = {
      givenAt: new Date(input.givenAt),
      drops: input.drops ?? null,
      notes: toStoredNotes(input.notes),
    };
    return toVitaminDDose(await this.repository.create(babyId, data));
  }

  async update(babyId: string, doseId: string, patch: UpdateVitaminDDose): Promise<VitaminDDose> {
    await this.requireBaby(babyId);
    await this.requireDose(babyId, doseId);
    if (patch.givenAt !== undefined) {
      assertNotInFuture(patch.givenAt, Date.now(), 'givenAt', FUTURE_CODE);
    }
    const data: Partial<VitaminDDoseData> = {
      ...(patch.givenAt === undefined ? {} : { givenAt: new Date(patch.givenAt) }),
      ...(patch.drops === undefined ? {} : { drops: patch.drops }),
      ...(patch.notes === undefined ? {} : { notes: toStoredNotes(patch.notes) }),
    };
    return toVitaminDDose(await this.repository.update(doseId, data));
  }

  async remove(babyId: string, doseId: string): Promise<void> {
    await this.requireBaby(babyId);
    await this.requireDose(babyId, doseId);
    await this.repository.delete(doseId);
  }

  async stats(babyId: string, query: StatsQuery): Promise<VitaminDStats> {
    await this.requireBaby(babyId);
    return calculateVitaminDStats(await this.repository.listForStats(babyId), query, Date.now());
  }

  private requireDose(babyId: string, doseId: string) {
    return requireRecord((id) => this.repository.findById(babyId, id), doseId, 'DOSE_NOT_FOUND', 'Vitamin D dose');
  }
}
