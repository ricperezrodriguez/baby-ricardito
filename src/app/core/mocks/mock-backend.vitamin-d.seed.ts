import { VitaminDDose } from '@app/features/vitamin-d/vitamin-d.models';
import { createRandom, MS_PER_MINUTE, SEED_BABY_ID } from '@app/core/mocks/mock-backend.seed-utils';

interface SeedDoseSpec {
  givenMinutesAgo: number;
  drops?: number;
  notes?: string;
}

const HISTORY_DAYS = 60;
/** Generated doses are given between 07:00 and 10:30 (minutes since midnight). */
const MORNING_START_MINUTE = 7 * 60;
const MORNING_SPAN_MINUTES = 3.5 * 60;
const GENERATED_PROBABILITY = 0.9;
/** Days up to this one (0 = today) are always given, so the current streak is about a week. */
const ALWAYS_GIVEN_UNTIL_DAYS_AGO = 6;
/** Local days (0 = today) without any dose. */
const DAYS_WITHOUT_DOSES: ReadonlySet<number> = new Set([7, 15, 16, 29, 41, 52]);
/** Local day with a second dose, in the evening (minutes since midnight). */
const DUPLICATE_DAY = 20;
const DUPLICATE_DOSE_MINUTE = 19 * 60 + 30;

const LONG_NOTES =
  'Hoy estaba muy inquieta y escupió parte de las gotas, así que repetí la toma pasados unos minutos con cuidado ' +
  'para no pasarme. Se la di con la cucharita en el lado de la mejilla, poco a poco, y esta vez se la tragó bien. ' +
  'Después le di el pecho para que se tranquilizara y se quedó dormida enseguida.';

const DUPLICATE_DOSE_NOTES = 'Segunda toma: no recordaba si ya se la había dado.';

const NOTES_BY_DAY: ReadonlyMap<number, string> = new Map([
  [3, 'Se la di tras el desayuno.'],
  [11, LONG_NOTES],
  [34, 'Con la abuela.'],
]);

function minutesBeforeNow(now: Date, daysAgo: number, minuteOfDay: number): number {
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 0, minuteOfDay);
  return Math.round((now.getTime() - at.getTime()) / MS_PER_MINUTE);
}

/** Mostly 2-3 drops, with some variety and some doses without drops (undefined). */
function pickDrops(randomValue: number): number | undefined {
  if (randomValue < 0.08) {
    return undefined;
  }
  if (randomValue < 0.16) {
    return 1;
  }
  if (randomValue < 0.5) {
    return 2;
  }
  if (randomValue < 0.85) {
    return 3;
  }
  return randomValue < 0.95 ? 4 : 5;
}

function createSpec(
  now: Date,
  daysAgo: number,
  minuteOfDay: number,
  drops: number | undefined,
  notes: string | undefined,
): SeedDoseSpec {
  return {
    givenMinutesAgo: minutesBeforeNow(now, daysAgo, minuteOfDay),
    ...(drops === undefined ? {} : { drops }),
    ...(notes === undefined ? {} : { notes }),
  };
}

/**
 * One morning dose per local day with a few missed days and one duplicated day.
 * Every day draws the same number of random values, so skipping a day does not shift the rest.
 */
function createGeneratedSpecs(now: Date): SeedDoseSpec[] {
  const random = createRandom(4_217);
  const specs: SeedDoseSpec[] = [];

  for (let daysAgo = 1; daysAgo < HISTORY_DAYS; daysAgo += 1) {
    const luckyDay = random() < GENERATED_PROBABILITY;
    const minuteOfDay = Math.floor(MORNING_START_MINUTE + random() * MORNING_SPAN_MINUTES);
    const drops = pickDrops(random());
    const isGiven =
      daysAgo <= ALWAYS_GIVEN_UNTIL_DAYS_AGO || daysAgo === DUPLICATE_DAY || NOTES_BY_DAY.has(daysAgo) || luckyDay;
    if (DAYS_WITHOUT_DOSES.has(daysAgo) || !isGiven) {
      continue;
    }
    specs.push(createSpec(now, daysAgo, minuteOfDay, drops, NOTES_BY_DAY.get(daysAgo)));
    if (daysAgo === DUPLICATE_DAY) {
      specs.push(createSpec(now, daysAgo, DUPLICATE_DOSE_MINUTE, 2, DUPLICATE_DOSE_NOTES));
    }
  }
  return specs;
}

function buildSeedDose(spec: SeedDoseSpec, index: number, now: Date): VitaminDDose {
  const givenAt = new Date(now.getTime() - spec.givenMinutesAgo * MS_PER_MINUTE).toISOString();
  return {
    id: `seed-vitamin-d-${index}`,
    babyId: SEED_BABY_ID,
    givenAt,
    ...(spec.drops === undefined ? {} : { drops: spec.drops }),
    ...(spec.notes === undefined ? {} : { notes: spec.notes }),
    createdAt: givenAt,
    updatedAt: givenAt,
  };
}

/** Deterministic ~60 days of doses: one given ~60 minutes ago plus generated older ones. */
export function createSeedVitaminDDoses(now: Date): VitaminDDose[] {
  const recent: SeedDoseSpec = { givenMinutesAgo: 60, drops: 3 };
  return [recent, ...createGeneratedSpecs(now)].map((spec, index) => buildSeedDose(spec, index, now));
}
