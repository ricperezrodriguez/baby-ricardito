import { createRandom, SEED_BABY_ID } from '@app/core/mocks/mock-backend.seed-utils';
import { NailTrim, NailTrimArea } from '@app/features/nail-trimming/nail-trimming.models';

interface SeedTrimSpec {
  daysAgo: number;
  /** Minutes since local midnight */
  minuteOfDay: number;
  areas: NailTrimArea[];
  notes?: string;
}

const HISTORY_DAYS = 120;
/** Latest trim: hands only, exactly this many days ago, in the afternoon. */
const LATEST_DAYS_AGO = 7;
const LATEST_MINUTE = 17 * 60;
/** The previous trim (hands and feet) happened between these many days ago. */
const PREVIOUS_MIN_DAYS_AGO = 10;
const PREVIOUS_SPAN_DAYS = 5;
/** Older trims are spaced 5-9 days apart. */
const MIN_GAP_DAYS = 5;
const GAP_SPAN_DAYS = 5;
/** Feet are included every 2nd or 3rd trim. */
const MIN_FEET_EVERY = 2;
const FEET_EVERY_SPAN = 2;
/** Older trims are done between 18:00 and 21:30 (minutes since midnight). */
const EVENING_START_MINUTE = 18 * 60;
const EVENING_SPAN_MINUTES = 3.5 * 60;
/** Trim (counting the generated ones from 0) split in two on the same day: hands in the morning, feet in the evening. */
const SPLIT_DAY_TRIM_INDEX = 5;
const SPLIT_MORNING_MINUTE = 9 * 60 + 15;
const SPLIT_EVENING_MINUTE = 19 * 60 + 30;

const LONG_NOTES =
  'Hoy le cortamos las uñas después del baño, que es cuando están más blandas. Estaba muy inquieta y lo hicimos en ' +
  'dos tandas: primero la mano derecha y, cuando se calmó con la canción, la izquierda. Se me escapó un pequeño ' +
  'roce en el dedo corazón, pero no sangró. Mejor con tijeras de punta redonda.';

const NOTES_BY_INDEX: ReadonlyMap<number, string> = new Map([
  [1, 'Después del baño.'],
  [3, 'Dormida, mucho más fácil.'],
  [8, LONG_NOTES],
  [11, 'Con la lima, sin tijeras.'],
  [15, 'Un poco inquieta.'],
]);

function toIsoString(now: Date, daysAgo: number, minuteOfDay: number): string {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysAgo,
    0,
    minuteOfDay,
  ).toISOString();
}

/**
 * Trims from the previous one back to the start of the window. Every iteration draws the same
 * number of random values, so the shape of one trim does not shift the rest.
 */
function createOlderSpecs(): SeedTrimSpec[] {
  const random = createRandom(7_319);
  const specs: SeedTrimSpec[] = [];
  let daysAgo = PREVIOUS_MIN_DAYS_AGO + Math.floor(random() * PREVIOUS_SPAN_DAYS);
  let sinceFeet = 0;

  for (let index = 0; daysAgo <= HISTORY_DAYS; index += 1) {
    const minuteOfDay = Math.floor(EVENING_START_MINUTE + random() * EVENING_SPAN_MINUTES);
    const feetEvery = MIN_FEET_EVERY + Math.floor(random() * FEET_EVERY_SPAN);
    const gapDays = MIN_GAP_DAYS + Math.floor(random() * GAP_SPAN_DAYS);
    const notes = NOTES_BY_INDEX.get(index);
    sinceFeet = index === 0 ? 0 : sinceFeet + 1;

    if (index === SPLIT_DAY_TRIM_INDEX) {
      specs.push({ daysAgo, minuteOfDay: SPLIT_MORNING_MINUTE, areas: ['hands'] });
      specs.push({
        daysAgo,
        minuteOfDay: SPLIT_EVENING_MINUTE,
        areas: ['feet'],
        ...(notes === undefined ? {} : { notes }),
      });
      sinceFeet = 0;
    } else {
      const withFeet = index === 0 || sinceFeet >= feetEvery;
      specs.push({
        daysAgo,
        minuteOfDay,
        areas: withFeet ? ['hands', 'feet'] : ['hands'],
        ...(notes === undefined ? {} : { notes }),
      });
      sinceFeet = withFeet ? 0 : sinceFeet;
    }
    daysAgo += gapDays;
  }
  return specs;
}

function buildSeedTrim(spec: SeedTrimSpec, index: number, now: Date): NailTrim {
  const trimmedAt = toIsoString(now, spec.daysAgo, spec.minuteOfDay);
  return {
    id: `seed-nail-trimming-${index}`,
    babyId: SEED_BABY_ID,
    trimmedAt,
    areas: spec.areas,
    ...(spec.notes === undefined ? {} : { notes: spec.notes }),
    createdAt: trimmedAt,
    updatedAt: trimmedAt,
  };
}

/** Deterministic ~120 days of trims: the latest 7 days ago (hands only) plus older generated ones. */
export function createSeedNailTrims(now: Date): NailTrim[] {
  const latest: SeedTrimSpec = {
    daysAgo: LATEST_DAYS_AGO,
    minuteOfDay: LATEST_MINUTE,
    areas: ['hands'],
  };
  return [latest, ...createOlderSpecs()].map((spec, index) => buildSeedTrim(spec, index, now));
}
