import { Breast, BreastfeedingSession } from '@app/features/breastfeeding/breastfeeding.models';
import { buildSession, SegmentInput } from '@app/core/mocks/mock-backend.calculations';

export const SEED_BABY_ID = 'baby-1';

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

const MS_PER_MINUTE = 60_000;

function buildSeedPhoto(background: string, emoji: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">` +
    `<rect width="480" height="360" fill="${background}"/>` +
    `<text x="240" y="220" font-size="140" text-anchor="middle">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const SEED_PHOTOS = {
  sleepy: buildSeedPhoto('#cfe8ff', '😴'),
  smiling: buildSeedPhoto('#ffe9b8', '😊'),
};

const LONG_NOTES =
  'The baby was very sleepy at the beginning and needed some gentle stimulation to latch properly. ' +
  'After a few minutes she settled into a steady rhythm, with good swallowing sounds. ' +
  'Burped twice during the feed and fell asleep at the end, so I kept her upright for ten more minutes.';

const SEED_SESSION_SPECS: SeedSessionSpec[] = [
  { startedMinutesAgo: 30, segments: [{ breast: 'left', minutes: 4 }, { breast: 'right', minutes: 2 }], photoUrl: SEED_PHOTOS.smiling },
  { startedMinutesAgo: 190, segments: [{ breast: 'right', minutes: 12 }, { breast: 'left', minutes: 8 }] },
  { startedMinutesAgo: 410, segments: [{ breast: 'left', minutes: 15 }] },
  { startedMinutesAgo: 640, segments: [{ breast: 'left', minutes: 10 }, { breast: 'right', minutes: 10 }], notes: LONG_NOTES },
  { startedMinutesAgo: 1030, segments: [{ breast: 'right', minutes: 18 }] },
  { startedMinutesAgo: 1290, segments: [{ breast: 'left', minutes: 9 }, { breast: 'right', minutes: 11 }] },
  { startedMinutesAgo: 1520, segments: [{ breast: 'left', minutes: 14 }], notes: 'Left only, calm feed.', photoUrl: SEED_PHOTOS.sleepy },
  { startedMinutesAgo: 1750, segments: [{ breast: 'right', minutes: 7 }, { breast: 'left', minutes: 13 }] },
  { startedMinutesAgo: 2450, segments: [{ breast: 'right', minutes: 16 }] },
  { startedMinutesAgo: 2700, segments: [{ breast: 'left', minutes: 11 }, { breast: 'right', minutes: 6 }] },
  { startedMinutesAgo: 2950, segments: [], notes: 'Timer was not used; fed in the car, roughly 15 minutes.' },
  { startedMinutesAgo: 3200, segments: [{ breast: 'left', minutes: 20 }], notes: LONG_NOTES },
  { startedMinutesAgo: 3900, segments: [{ breast: 'right', minutes: 10 }, { breast: 'left', minutes: 10 }] },
  { startedMinutesAgo: 4150, segments: [{ breast: 'right', minutes: 14 }] },
  { startedMinutesAgo: 4400, segments: [{ breast: 'left', minutes: 8 }, { breast: 'right', minutes: 9 }], notes: 'Fussy, lots of burps.' },
  { startedMinutesAgo: 5200, segments: [{ breast: 'left', minutes: 17 }] },
  { startedMinutesAgo: 5500, segments: [{ breast: 'right', minutes: 12 }, { breast: 'left', minutes: 5 }] },
  { startedMinutesAgo: 6900, segments: [{ breast: 'right', minutes: 19 }], notes: 'Night feed, back to sleep right after.' },
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

export function createSeedSessions(now: Date): BreastfeedingSession[] {
  return SEED_SESSION_SPECS.map((spec) => buildSeedSession(spec, now));
}
