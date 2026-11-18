import { SleepSessionInput, StoredSleepSession } from '@app/core/mocks/mock-backend.sleep.validation';
import { MS_PER_MINUTE, SEED_BABY_ID, createRandom } from '@app/core/mocks/mock-backend.seed-utils';

interface SeedSleepSpec {
  /** Epoch milliseconds */
  start: number;
  durationMinutes: number;
  notes?: string;
}

const HISTORY_DAYS = 60;
const MINUTES_PER_HOUR = 60;
/** Hand-written sleeps cover the last ~48 hours; the generated ones end before this many minutes ago. */
const GENERATED_UNTIL_MINUTES_AGO = 2_900;

const LONG_NOTES =
  'Se durmió en mis brazos después de la toma de la tarde y se despertó dos veces durante la primera hora, así que la acunamos hasta que volvió a dormirse, con el ruido blanco encendido. ' +
  'Por fin se tranquilizó cuando la acostamos de lado en la cuna, con el saquito un poco más holgado. ' +
  'Después durmió profundamente y ni siquiera se despertó cuando ladró el perro afuera.';

/** Hand-written recent sleeps (minutes ago when it started, minutes of duration); the last one ended ~50 min ago. */
const RECENT_SPECS: { startedMinutesAgo: number; durationMinutes: number; notes?: string }[] = [
  { startedMinutesAgo: 95, durationMinutes: 45, notes: 'Siesta corta en el cochecito.' },
  { startedMinutesAgo: 230, durationMinutes: 80 },
  { startedMinutesAgo: 400, durationMinutes: 100 },
  { startedMinutesAgo: 560, durationMinutes: 60 },
  { startedMinutesAgo: 800, durationMinutes: 150, notes: LONG_NOTES },
  { startedMinutesAgo: 1_000, durationMinutes: 90 },
  { startedMinutesAgo: 1_190, durationMinutes: 120 },
  { startedMinutesAgo: 1_420, durationMinutes: 200, notes: 'Durmió a pesar del malestar de la vacuna.' },
  { startedMinutesAgo: 1_600, durationMinutes: 110 },
  { startedMinutesAgo: 1_800, durationMinutes: 95 },
  { startedMinutesAgo: 2_000, durationMinutes: 130 },
  { startedMinutesAgo: 2_230, durationMinutes: 170 },
  { startedMinutesAgo: 2_430, durationMinutes: 90, notes: 'Se despertó llorando; quería comer.' },
  { startedMinutesAgo: 2_620, durationMinutes: 100 },
  { startedMinutesAgo: 2_830, durationMinutes: 140 },
];

/** Notes of generated sleeps, by `<days ago>:<slot>`. */
const GENERATED_NOTES: Record<string, string> = {
  '3:nap0': 'Solo durmió en la silla del coche.',
  '5:night1': LONG_NOTES,
  '9:nap1': 'Le están saliendo los dientes y estuvo muy inquieta.',
  '14:night2': 'Durmió del tirón hasta que sonó la alarma.',
  '21:nap0': 'Siesta corta; se despertó con el ruido del cortacésped.',
};

function localTime(now: Date, daysAgo: number, minutesOfDay: number): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 0, minutesOfDay).getTime();
}

function recentSpecs(now: Date): SeedSleepSpec[] {
  return RECENT_SPECS.map(({ startedMinutesAgo, durationMinutes, notes }) => ({
    start: now.getTime() - startedMinutesAgo * MS_PER_MINUTE,
    durationMinutes,
    ...(notes === undefined ? {} : { notes }),
  }));
}

/**
 * One local day: 2-4 naps (they start 08:00-18:15, so they are naps) and two night sleeps that start from 19:30
 * (the second one usually crosses midnight and ends before 07:30). Nothing overlaps.
 */
function createDaySpecs(now: Date, daysAgo: number, random: () => number): SeedSleepSpec[] {
  const specs: SeedSleepSpec[] = [];
  const add = (slot: string, start: number, durationMinutes: number): void => {
    const notes = GENERATED_NOTES[`${daysAgo}:${slot}`];
    specs.push({ start, durationMinutes, ...(notes === undefined ? {} : { notes }) });
  };

  const night1Start = 19 * MINUTES_PER_HOUR + 30 + Math.floor(random() * 90);
  const night1Duration = 180 + Math.floor(random() * 90);
  const nightGap = 40 + Math.floor(random() * 50);
  const night2Duration = 180 + Math.floor(random() * 90);

  let cursor = 8 * MINUTES_PER_HOUR + Math.floor(random() * 60);
  for (let nap = 0; nap < 4; nap += 1) {
    const duration = 30 + Math.floor(random() * 90);
    const awake = 90 + Math.floor(random() * 90);
    if (cursor + duration > night1Start - 45) {
      break;
    }
    add(`nap${nap}`, localTime(now, daysAgo, cursor), duration);
    cursor += duration + awake;
  }

  const night1 = localTime(now, daysAgo, night1Start);
  add('night1', night1, night1Duration);
  add('night2', night1 + (night1Duration + nightGap) * MS_PER_MINUTE, night2Duration);
  return specs;
}

/** Drops the (rare, around daylight saving changes) sleeps that would overlap the previous one. */
function withoutOverlaps(specs: SeedSleepSpec[]): SeedSleepSpec[] {
  const kept: SeedSleepSpec[] = [];
  let lastEnd = Number.NEGATIVE_INFINITY;
  for (const spec of [...specs].sort((a, b) => a.start - b.start)) {
    if (spec.start >= lastEnd) {
      kept.push(spec);
      lastEnd = spec.start + spec.durationMinutes * MS_PER_MINUTE;
    }
  }
  return kept;
}

function createGeneratedSpecs(now: Date): SeedSleepSpec[] {
  const random = createRandom(7_331);
  const cutoff = now.getTime() - GENERATED_UNTIL_MINUTES_AGO * MS_PER_MINUTE;
  const specs: SeedSleepSpec[] = [];
  for (let daysAgo = 0; daysAgo < HISTORY_DAYS; daysAgo += 1) {
    specs.push(...createDaySpecs(now, daysAgo, random));
  }
  return withoutOverlaps(specs).filter((spec) => spec.start + spec.durationMinutes * MS_PER_MINUTE <= cutoff);
}

function buildSeedSleep(spec: SeedSleepSpec, index: number): StoredSleepSession {
  const startTime = new Date(spec.start).toISOString();
  const endTime = new Date(spec.start + spec.durationMinutes * MS_PER_MINUTE).toISOString();
  const input: SleepSessionInput = {
    startTime,
    endTime,
    ...(spec.notes === undefined ? {} : { notes: spec.notes }),
  };
  return { id: `seed-sleep-${index}`, babyId: SEED_BABY_ID, ...input, createdAt: endTime, updatedAt: endTime };
}

/** Deterministic ~60 days of finished sleeps (hand-written recent ones plus generated older ones); none ongoing. */
export function createSeedSleepSessions(now: Date): StoredSleepSession[] {
  return [...recentSpecs(now), ...createGeneratedSpecs(now)].map(buildSeedSleep);
}
