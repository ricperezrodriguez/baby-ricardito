import { Breast, BreastfeedingSession } from '@app/features/breastfeeding/breastfeeding.models';
import { buildSession, SegmentInput } from '@app/core/mocks/mock-backend.calculations';
import { buildSeedPhoto } from '@app/core/mocks/mock-backend.photos';
import { createRandom, MS_PER_MINUTE, SEED_BABY_ID } from '@app/core/mocks/mock-backend.seed-utils';

interface SeedSegmentSpec {
  breast: Breast;
  minutes: number;
}

interface SeedSessionSpec {
  startedMinutesAgo: number;
  segments: SeedSegmentSpec[];
  notes?: string;
  photoUrl?: string;
  inProgress?: boolean;
}

const SEED_PHOTOS = {
  sleepy: buildSeedPhoto('#cfe8ff', '😴'),
  smiling: buildSeedPhoto('#ffe9b8', '😊'),
};

const LONG_NOTES =
  'La bebé estaba muy adormilada al principio y necesitó un poco de estimulación suave para agarrarse bien al pecho. ' +
  'Después de unos minutos encontró un ritmo constante y se oían bien las degluciones. ' +
  'Eructó dos veces durante la toma y se quedó dormida al final, así que la mantuve incorporada diez minutos más.';

const SEED_SESSION_SPECS: SeedSessionSpec[] = [
  { startedMinutesAgo: 30, segments: [{ breast: 'left', minutes: 4 }, { breast: 'right', minutes: 2 }], photoUrl: SEED_PHOTOS.smiling },
  { startedMinutesAgo: 190, segments: [{ breast: 'right', minutes: 12 }, { breast: 'left', minutes: 8 }] },
  { startedMinutesAgo: 410, segments: [{ breast: 'left', minutes: 15 }] },
  { startedMinutesAgo: 640, segments: [{ breast: 'left', minutes: 10 }, { breast: 'right', minutes: 10 }], notes: LONG_NOTES },
  { startedMinutesAgo: 1030, segments: [{ breast: 'right', minutes: 18 }] },
  { startedMinutesAgo: 1290, segments: [{ breast: 'left', minutes: 9 }, { breast: 'right', minutes: 11 }] },
  { startedMinutesAgo: 1520, segments: [{ breast: 'left', minutes: 14 }], notes: 'Solo tomó de un pecho y estuvo tranquila.', photoUrl: SEED_PHOTOS.sleepy },
  { startedMinutesAgo: 1750, segments: [{ breast: 'right', minutes: 7 }, { breast: 'left', minutes: 13 }] },
  { startedMinutesAgo: 2450, segments: [{ breast: 'right', minutes: 16 }] },
  { startedMinutesAgo: 2700, segments: [{ breast: 'left', minutes: 11 }, { breast: 'right', minutes: 6 }] },
  { startedMinutesAgo: 2950, segments: [], notes: 'No usamos el temporizador; comió en el coche durante unos 15 minutos.' },
  { startedMinutesAgo: 3200, segments: [{ breast: 'left', minutes: 20 }], notes: LONG_NOTES },
  { startedMinutesAgo: 3900, segments: [{ breast: 'right', minutes: 10 }, { breast: 'left', minutes: 10 }] },
  { startedMinutesAgo: 4150, segments: [{ breast: 'right', minutes: 14 }] },
  { startedMinutesAgo: 4400, segments: [{ breast: 'left', minutes: 8 }, { breast: 'right', minutes: 9 }], notes: 'Estaba inquieta y eructó mucho.' },
  { startedMinutesAgo: 5200, segments: [{ breast: 'left', minutes: 17 }] },
  { startedMinutesAgo: 5500, segments: [{ breast: 'right', minutes: 12 }, { breast: 'left', minutes: 5 }] },
  { startedMinutesAgo: 6900, segments: [{ breast: 'right', minutes: 19 }], notes: 'Toma nocturna; volvió a dormirse enseguida.' },
];

function buildSegments(spec: SeedSessionSpec, startTimeMs: number): SegmentInput[] {
  let cursorMs = startTimeMs;
  return spec.segments.map((segment, index) => {
    const segmentStart = cursorMs;
    cursorMs += segment.minutes * MS_PER_MINUTE;
    const isOpen = spec.inProgress === true && index === spec.segments.length - 1;
    return {
      breast: segment.breast,
      startTime: new Date(segmentStart).toISOString(),
      endTime: isOpen ? null : new Date(cursorMs).toISOString(),
    };
  });
}

function buildSeedSession(spec: SeedSessionSpec, now: Date): BreastfeedingSession {
  const startTimeMs = now.getTime() - spec.startedMinutesAgo * MS_PER_MINUTE;
  const segments = buildSegments(spec, startTimeMs);
  const lastSegment = segments.at(-1);
  const endTime = spec.inProgress === true ? null : (lastSegment?.endTime ?? new Date(startTimeMs + 15 * MS_PER_MINUTE).toISOString());
  const timestamp = (endTime ?? now.toISOString());

  return buildSession({
    id: crypto.randomUUID(),
    babyId: SEED_BABY_ID,
    input: {
      startTime: new Date(startTimeMs).toISOString(),
      endTime,
      segments,
      ...(spec.notes === undefined ? {} : { notes: spec.notes }),
      ...(spec.photoUrl === undefined ? {} : { photoUrl: spec.photoUrl }),
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    now,
  });
}

const MINUTES_PER_DAY = 1_440;
const HISTORY_DAYS = 60;

/** Feeds every ~3 hours (more spaced as the baby grows) for the days older than the hand-written ones. */
function createOlderSessionSpecs(): SeedSessionSpec[] {
  const random = createRandom(2026);
  const specs: SeedSessionSpec[] = [];
  const firstOlderMinute = 7_200;
  const lastMinute = HISTORY_DAYS * MINUTES_PER_DAY;

  for (let dayStart = firstOlderMinute; dayStart < lastMinute; dayStart += MINUTES_PER_DAY) {
    const spacing = 150 + Math.round(((dayStart - firstOlderMinute) / lastMinute) * 90);
    for (let offset = 0; offset < MINUTES_PER_DAY; offset += spacing + Math.round(random() * 50)) {
      const bothBreasts = random() > 0.45;
      const first: Breast = random() > 0.5 ? 'left' : 'right';
      const second: Breast = first === 'left' ? 'right' : 'left';
      specs.push({
        startedMinutesAgo: dayStart + offset,
        segments: bothBreasts
          ? [
              { breast: first, minutes: 6 + Math.round(random() * 10) },
              { breast: second, minutes: 3 + Math.round(random() * 8) },
            ]
          : [{ breast: first, minutes: 8 + Math.round(random() * 14) }],
      });
    }
  }
  return specs;
}

export function createSeedSessions(now: Date): BreastfeedingSession[] {
  return [...SEED_SESSION_SPECS, ...createOlderSessionSpecs()].map((spec) => buildSeedSession(spec, now));
}
