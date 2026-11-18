import {
  DIAPER_TYPE,
  DiaperChange,
  DiaperType,
  StoolColor,
  StoolConsistency,
} from '@app/features/diaper/diaper.models';
import { buildSeedPhoto } from '@app/core/mocks/mock-backend.photos';
import { createRandom, MS_PER_MINUTE, SEED_BABY_ID } from '@app/core/mocks/mock-backend.seed-utils';

interface SeedChangeSpec {
  changedMinutesAgo: number;
  type: DiaperType;
  stoolColor?: StoolColor;
  stoolConsistency?: StoolConsistency;
  hasRash?: boolean;
  notes?: string;
  photoUrl?: string;
}

const HISTORY_DAYS = 60;
/** Hand-written changes cover the last ~48 hours; the generated ones start right after. */
const GENERATED_FROM_MINUTES_AGO = 2_900;
/** Local days (0 = today) where every other change has a rash: a run of 3 days. */
const RASH_FIRST_DAY = 3;
const RASH_LAST_DAY = 5;

const SEED_PHOTOS = {
  mustard: buildSeedPhoto('#ffe9b8', '👶'),
};

const LONG_NOTES =
  'La cambié justo después de la toma porque estaba inquieta. El pañal estaba bastante lleno y tenía el culito algo enrojecido, ' +
  'así que la limpié con agua y algodón en lugar de toallitas y la dejé unos minutos sin pañal para que la piel se aireara. ' +
  'Le puse una fina capa de crema de zinc antes de ponerle un pañal limpio. Se tranquilizó enseguida.';

/** Hand-written recent changes: the last poop is ~3 hours ago, so the poop alert does not fire by default. */
const RECENT_SPECS: SeedChangeSpec[] = [
  { changedMinutesAgo: 25, type: DIAPER_TYPE.WET },
  {
    changedMinutesAgo: 190,
    type: DIAPER_TYPE.BOTH,
    stoolColor: 'yellow',
    stoolConsistency: 'soft',
    photoUrl: SEED_PHOTOS.mustard,
  },
  { changedMinutesAgo: 360, type: DIAPER_TYPE.WET },
  { changedMinutesAgo: 560, type: DIAPER_TYPE.WET, notes: LONG_NOTES },
  { changedMinutesAgo: 790, type: DIAPER_TYPE.DIRTY, stoolColor: 'green', stoolConsistency: 'mucous' },
  { changedMinutesAgo: 980, type: DIAPER_TYPE.WET },
  { changedMinutesAgo: 1_180, type: DIAPER_TYPE.BOTH, stoolColor: 'brown', stoolConsistency: 'soft' },
  { changedMinutesAgo: 1_400, type: DIAPER_TYPE.WET },
  {
    changedMinutesAgo: 1_580,
    type: DIAPER_TYPE.DIRTY,
    stoolColor: 'yellow',
    stoolConsistency: 'liquid',
    notes: 'Muy líquida; la tercera de hoy.',
  },
  { changedMinutesAgo: 1_790, type: DIAPER_TYPE.WET },
  { changedMinutesAgo: 2_050, type: DIAPER_TYPE.BOTH, stoolColor: 'yellow', stoolConsistency: 'firm' },
  { changedMinutesAgo: 2_300, type: DIAPER_TYPE.WET },
  { changedMinutesAgo: 2_520, type: DIAPER_TYPE.DIRTY, stoolColor: 'brown', stoolConsistency: 'firm' },
  { changedMinutesAgo: 2_780, type: DIAPER_TYPE.WET },
];

/** Rare colors, placed in the older history so they do not look alarming on the home card. */
const RARE_COLOR_SPECS: SeedChangeSpec[] = [
  {
    changedMinutesAgo: 11_000,
    type: DIAPER_TYPE.DIRTY,
    stoolColor: 'black',
    stoolConsistency: 'soft',
    notes: 'Oscura y pegajosa; se lo comenté al pediatra.',
  },
  {
    changedMinutesAgo: 17_000,
    type: DIAPER_TYPE.DIRTY,
    stoolColor: 'red',
    stoolConsistency: 'liquid',
    notes: 'Una pequeña veta roja. Llamé al pediatra; era por una pequeña fisura en la piel.',
  },
  { changedMinutesAgo: 23_000, type: DIAPER_TYPE.BOTH, stoolColor: 'white', stoolConsistency: 'mucous' },
];

/** Night hours (21:00-05:59) weigh a bit more: slight night bias. */
function hourWeight(hour: number): number {
  return hour < 6 || hour >= 21 ? 1.5 : 1;
}

function pickHour(randomValue: number): number {
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  const total = hours.reduce((sum, hour) => sum + hourWeight(hour), 0);
  let remaining = randomValue * total;
  for (const hour of hours) {
    remaining -= hourWeight(hour);
    if (remaining < 0) {
      return hour;
    }
  }
  return 23;
}

/** Mostly wet (~50%), then both (~30%) and dirty (~20%). */
function pickType(randomValue: number): DiaperType {
  if (randomValue < 0.5) {
    return DIAPER_TYPE.WET;
  }
  return randomValue < 0.8 ? DIAPER_TYPE.BOTH : DIAPER_TYPE.DIRTY;
}

function pickStoolColor(randomValue: number): StoolColor | undefined {
  if (randomValue < 0.1) {
    return undefined;
  }
  if (randomValue < 0.5) {
    return 'yellow';
  }
  return randomValue < 0.75 ? 'brown' : 'green';
}

function pickStoolConsistency(randomValue: number): StoolConsistency | undefined {
  if (randomValue < 0.1) {
    return undefined;
  }
  if (randomValue < 0.55) {
    return 'soft';
  }
  if (randomValue < 0.75) {
    return 'liquid';
  }
  return randomValue < 0.9 ? 'mucous' : 'firm';
}

function minutesBeforeNow(now: Date, daysAgo: number, hour: number, minute: number): number {
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour, minute);
  return Math.round((now.getTime() - at.getTime()) / MS_PER_MINUTE);
}

function isInRashRun(daysAgo: number, indexInDay: number): boolean {
  return daysAgo >= RASH_FIRST_DAY && daysAgo <= RASH_LAST_DAY && indexInDay % 2 === 0;
}

/** 6-9 changes per local day with a slight night bias. */
function createGeneratedSpecs(now: Date): SeedChangeSpec[] {
  const random = createRandom(4_242);
  const specs: SeedChangeSpec[] = [];

  for (let daysAgo = 0; daysAgo < HISTORY_DAYS; daysAgo += 1) {
    const changesInDay = 6 + Math.floor(random() * 4);
    for (let indexInDay = 0; indexInDay < changesInDay; indexInDay += 1) {
      const hour = pickHour(random());
      const minute = Math.floor(random() * 60);
      const type = pickType(random());
      const stoolColor = pickStoolColor(random());
      const stoolConsistency = pickStoolConsistency(random());
      const hasStool = type !== DIAPER_TYPE.WET;
      specs.push({
        changedMinutesAgo: minutesBeforeNow(now, daysAgo, hour, minute),
        type,
        ...(hasStool && stoolColor !== undefined ? { stoolColor } : {}),
        ...(hasStool && stoolConsistency !== undefined ? { stoolConsistency } : {}),
        hasRash: isInRashRun(daysAgo, indexInDay),
      });
    }
  }
  return specs.filter((spec) => spec.changedMinutesAgo >= GENERATED_FROM_MINUTES_AGO);
}

function buildSeedChange(spec: SeedChangeSpec, index: number, now: Date): DiaperChange {
  const changedAt = new Date(now.getTime() - spec.changedMinutesAgo * MS_PER_MINUTE).toISOString();
  return {
    id: `seed-diaper-${index}`,
    babyId: SEED_BABY_ID,
    changedAt,
    type: spec.type,
    stoolColor: spec.stoolColor ?? null,
    stoolConsistency: spec.stoolConsistency ?? null,
    hasRash: spec.hasRash ?? false,
    ...(spec.notes === undefined ? {} : { notes: spec.notes }),
    ...(spec.photoUrl === undefined ? {} : { photoUrl: spec.photoUrl }),
    createdAt: changedAt,
    updatedAt: changedAt,
  };
}

/** Deterministic ~60 days of changes (hand-written recent ones plus generated older ones). */
export function createSeedDiaperChanges(now: Date): DiaperChange[] {
  return [...RECENT_SPECS, ...RARE_COLOR_SPECS, ...createGeneratedSpecs(now)].map((spec, index) =>
    buildSeedChange(spec, index, now),
  );
}
