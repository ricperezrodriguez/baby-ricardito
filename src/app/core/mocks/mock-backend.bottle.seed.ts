import { BOTTLE_MILK_TYPE, BottleFeed, BottleMilkType } from '@app/features/bottle/bottle.models';
import { createRandom, MS_PER_MINUTE, SEED_BABY_ID } from '@app/core/mocks/mock-backend.seed-utils';

interface SeedFeedSpec {
  fedMinutesAgo: number;
  amountMl: number;
  milkType: BottleMilkType;
  notes?: string;
}

const HISTORY_DAYS = 60;
const MINUTES_PER_DAY = 1_440;
/** Hand-written feeds cover the last ~46 hours; the generated ones start right after. */
const GENERATED_FROM_MINUTES_AGO = 2_800;
/** Local days (0 = today) without any bottle feed (breastfeeding only). */
const DAYS_WITHOUT_FEEDS: ReadonlySet<number> = new Set([9, 23, 38, 52]);

const LONG_NOTES =
  'Esta toma costó un poco más de lo normal: estaba inquieta y soltaba la tetina cada pocos minutos, así que tuvimos que ' +
  'parar a sacarle el aire varias veces. Probé con una tetina de flujo más lento y pareció gustarle más. Al final se ' +
  'terminó casi todo el biberón y se quedó tranquila y adormilada, así que la dejé en la cuna sin darle más.';

/** Hand-written recent feeds, roughly every 3 hours; the latest one is ~40 minutes ago. */
const RECENT_SPECS: SeedFeedSpec[] = [
  { fedMinutesAgo: 40, amountMl: 120, milkType: BOTTLE_MILK_TYPE.BREAST_MILK },
  { fedMinutesAgo: 215, amountMl: 90, milkType: BOTTLE_MILK_TYPE.FORMULA },
  { fedMinutesAgo: 390, amountMl: 150, milkType: BOTTLE_MILK_TYPE.BREAST_MILK, notes: LONG_NOTES },
  { fedMinutesAgo: 570, amountMl: 60, milkType: BOTTLE_MILK_TYPE.MIXED },
  { fedMinutesAgo: 745, amountMl: 120, milkType: BOTTLE_MILK_TYPE.FORMULA },
  { fedMinutesAgo: 930, amountMl: 100, milkType: BOTTLE_MILK_TYPE.BREAST_MILK },
  { fedMinutesAgo: 1_100, amountMl: 180, milkType: BOTTLE_MILK_TYPE.FORMULA, notes: 'Tenía mucha hambre.' },
  { fedMinutesAgo: 1_290, amountMl: 130, milkType: BOTTLE_MILK_TYPE.MIXED },
  { fedMinutesAgo: 1_470, amountMl: 110, milkType: BOTTLE_MILK_TYPE.BREAST_MILK },
  { fedMinutesAgo: 1_650, amountMl: 90, milkType: BOTTLE_MILK_TYPE.FORMULA },
  { fedMinutesAgo: 1_830, amountMl: 140, milkType: BOTTLE_MILK_TYPE.BREAST_MILK },
  { fedMinutesAgo: 2_010, amountMl: 70, milkType: BOTTLE_MILK_TYPE.MIXED },
  { fedMinutesAgo: 2_190, amountMl: 120, milkType: BOTTLE_MILK_TYPE.FORMULA },
  { fedMinutesAgo: 2_370, amountMl: 160, milkType: BOTTLE_MILK_TYPE.BREAST_MILK },
  { fedMinutesAgo: 2_560, amountMl: 100, milkType: BOTTLE_MILK_TYPE.FORMULA },
  { fedMinutesAgo: 2_740, amountMl: 150, milkType: BOTTLE_MILK_TYPE.BREAST_MILK },
];

/** Breast milk ~45%, formula ~35% and mixed ~20%. */
function pickMilkType(randomValue: number): BottleMilkType {
  if (randomValue < 0.45) {
    return BOTTLE_MILK_TYPE.BREAST_MILK;
  }
  return randomValue < 0.8 ? BOTTLE_MILK_TYPE.FORMULA : BOTTLE_MILK_TYPE.MIXED;
}

/** 60-180 ml in steps of 10. */
function pickAmountMl(randomValue: number): number {
  return 60 + 10 * Math.floor(randomValue * 13);
}

function minutesBeforeNow(now: Date, daysAgo: number, minuteOfDay: number): number {
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 0, minuteOfDay);
  return Math.round((now.getTime() - at.getTime()) / MS_PER_MINUTE);
}

/** 6-8 feeds per local day spread over the whole day, with a few days without any. */
function createGeneratedSpecs(now: Date): SeedFeedSpec[] {
  const random = createRandom(7_331);
  const specs: SeedFeedSpec[] = [];

  for (let daysAgo = 0; daysAgo < HISTORY_DAYS; daysAgo += 1) {
    if (DAYS_WITHOUT_FEEDS.has(daysAgo)) {
      continue;
    }
    const feedsInDay = 6 + Math.floor(random() * 3);
    const slotMinutes = MINUTES_PER_DAY / feedsInDay;
    for (let indexInDay = 0; indexInDay < feedsInDay; indexInDay += 1) {
      const minuteOfDay = Math.floor(indexInDay * slotMinutes + random() * slotMinutes);
      specs.push({
        fedMinutesAgo: minutesBeforeNow(now, daysAgo, minuteOfDay),
        amountMl: pickAmountMl(random()),
        milkType: pickMilkType(random()),
      });
    }
  }
  return specs.filter((spec) => spec.fedMinutesAgo >= GENERATED_FROM_MINUTES_AGO);
}

function buildSeedFeed(spec: SeedFeedSpec, index: number, now: Date): BottleFeed {
  const fedAt = new Date(now.getTime() - spec.fedMinutesAgo * MS_PER_MINUTE).toISOString();
  return {
    id: `seed-bottle-${index}`,
    babyId: SEED_BABY_ID,
    fedAt,
    amountMl: spec.amountMl,
    milkType: spec.milkType,
    ...(spec.notes === undefined ? {} : { notes: spec.notes }),
    createdAt: fedAt,
    updatedAt: fedAt,
  };
}

/** Deterministic ~60 days of feeds (hand-written recent ones plus generated older ones). */
export function createSeedBottleFeeds(now: Date): BottleFeed[] {
  return [...RECENT_SPECS, ...createGeneratedSpecs(now)].map((spec, index) => buildSeedFeed(spec, index, now));
}
