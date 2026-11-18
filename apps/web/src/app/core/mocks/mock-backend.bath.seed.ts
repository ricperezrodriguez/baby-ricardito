import { createRandom, SEED_BABY_ID } from '@app/core/mocks/mock-backend.seed-utils';
import { Bath, BathReaction } from '@app/features/bath/bath.models';

interface SeedBathSpec {
  daysAgo: number;
  /** Minutes since local midnight */
  minuteOfDay: number;
  hairWashed: boolean;
  reaction?: BathReaction;
  notes?: string;
}

const HISTORY_DAYS = 60;
/** Latest bath: yesterday at 19:30, without hair wash, happy. */
const LATEST_DAYS_AGO = 1;
const LATEST_MINUTE = 19 * 60 + 30;
/** Latest hair wash: 3 days ago at 19:45. */
const LATEST_HAIR_WASH_DAYS_AGO = 3;
const LATEST_HAIR_WASH_MINUTE = 19 * 60 + 45;
/** Older baths are spaced 1-3 days apart. */
const MIN_GAP_DAYS = 1;
const GAP_SPAN_DAYS = 3;
/** The hair is washed every 2nd or 3rd bath. */
const MIN_HAIR_EVERY = 2;
const HAIR_EVERY_SPAN = 2;
/** Older baths start between 19:00 and 20:45, on quarter hours. */
const EVENING_START_MINUTE = 19 * 60;
const EVENING_SLOT_MINUTES = 15;
const EVENING_SLOTS = 8;
/** Bath (counting the generated ones from 0) whose day also has an extra morning bath. */
const EXTRA_BATH_INDEX = 6;
const EXTRA_BATH_MINUTE = 10 * 60 + 15;
const EXTRA_BATH_NOTES = 'Después de un escape del pañal';
/**
 * Reactions use their own sequence (one draw per older bath), so the main sequence and therefore
 * every other seeded field stay the same as before reactions existed. Each draw picks one slot:
 * 1 in 6 without reaction, 3 happy, 1 neutral, 1 sad. The seed is chosen so the reactions match the
 * notes (happy at 1, 9 and 16, sad at 4).
 */
const REACTION_SEED = 364;
const REACTION_SLOTS: readonly (BathReaction | undefined)[] = [
  undefined,
  'happy',
  'happy',
  'happy',
  'neutral',
  'sad',
];

const LONG_NOTES =
  'Baño algo más largo de lo normal porque estaba muy a gusto en el agua. Probamos el gel nuevo sin ' +
  'perfume y no le salió ninguna rojez. Le lavamos el pelo con cuidado de que no le cayera agua en los ' +
  'ojos y esta vez no protestó nada. Después, masaje con crema hidratante en las piernas y la tripa, ' +
  'pijama y a dormir enseguida.';

const NOTES_BY_INDEX: ReadonlyMap<number, string> = new Map([
  [1, 'Le encantó el agua.'],
  [4, 'Lloró un poco al salir.'],
  [9, LONG_NOTES],
  [12, 'Bañera grande por primera vez.'],
  [16, 'Muy relajada, se durmió después.'],
  [20, 'Agua un poco más templada.'],
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
 * Baths from before the latest hair wash back to the start of the window. Every iteration draws the
 * same number of random values, so the shape of one bath does not shift the rest.
 */
function createOlderSpecs(): SeedBathSpec[] {
  const random = createRandom(4_271);
  const reactionRandom = createRandom(REACTION_SEED);
  const specs: SeedBathSpec[] = [];
  let daysAgo = LATEST_HAIR_WASH_DAYS_AGO + MIN_GAP_DAYS + Math.floor(random() * GAP_SPAN_DAYS);
  /** Baths since the latest hair wash (the one 3 days ago). */
  let sinceHair = 0;

  for (let index = 0; daysAgo <= HISTORY_DAYS; index += 1) {
    const minuteOfDay =
      EVENING_START_MINUTE + Math.floor(random() * EVENING_SLOTS) * EVENING_SLOT_MINUTES;
    const hairEvery = MIN_HAIR_EVERY + Math.floor(random() * HAIR_EVERY_SPAN);
    const gapDays = MIN_GAP_DAYS + Math.floor(random() * GAP_SPAN_DAYS);
    const reaction = REACTION_SLOTS[Math.floor(reactionRandom() * REACTION_SLOTS.length)];
    const notes = NOTES_BY_INDEX.get(index);

    sinceHair += 1;
    const hairWashed = sinceHair >= hairEvery;
    if (hairWashed) {
      sinceHair = 0;
    }
    specs.push({
      daysAgo,
      minuteOfDay,
      hairWashed,
      ...(reaction === undefined ? {} : { reaction }),
      ...(notes === undefined ? {} : { notes }),
    });
    if (index === EXTRA_BATH_INDEX) {
      specs.push({
        daysAgo,
        minuteOfDay: EXTRA_BATH_MINUTE,
        hairWashed: false,
        notes: EXTRA_BATH_NOTES,
      });
    }
    daysAgo += gapDays;
  }
  return specs;
}

/** Specs only carry `reaction` and `notes` when they have a value, so the rest copies as is. */
function buildSeedBath(
  { daysAgo, minuteOfDay, ...fields }: SeedBathSpec,
  index: number,
  now: Date,
): Bath {
  const bathedAt = toIsoString(now, daysAgo, minuteOfDay);
  return {
    id: `seed-bath-${index}`,
    babyId: SEED_BABY_ID,
    bathedAt,
    ...fields,
    createdAt: bathedAt,
    updatedAt: bathedAt,
  };
}

/**
 * Deterministic ~60 days of evening baths: the latest yesterday at 19:30 without hair wash and happy,
 * the latest hair wash 3 days ago (without reaction), plus older generated ones (one day has an extra morning
 * bath, without reaction); about one in six older baths has no reaction.
 */
export function createSeedBaths(now: Date): Bath[] {
  const fixed: SeedBathSpec[] = [
    { daysAgo: LATEST_DAYS_AGO, minuteOfDay: LATEST_MINUTE, hairWashed: false, reaction: 'happy' },
    { daysAgo: LATEST_HAIR_WASH_DAYS_AGO, minuteOfDay: LATEST_HAIR_WASH_MINUTE, hairWashed: true },
  ];
  return [...fixed, ...createOlderSpecs()].map((spec, index) => buildSeedBath(spec, index, now));
}
