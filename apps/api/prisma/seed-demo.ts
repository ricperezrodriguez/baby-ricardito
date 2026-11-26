// Demo data: about 60 days of deterministic records for `baby-1`, relative to today (like the front's mock seeds).
// Usage: `npm run db:seed:demo` (refuses to run when the baby already has records) or `... -- --reset`
// (deletes every record of `baby-1`, and its photos, first).
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadEnv } from '../src/config/env';
import { createDatabase } from '../src/database/prisma';
import { DEFAULT_BABY_ID } from './baby';

const HISTORY_DAYS = 60;
const MS_PER_MINUTE = 60_000;
const SAFETY_MARGIN_MINUTES = 10;

const { DATABASE_URL, PHOTOS_DIR } = loadEnv();
const database = createDatabase(DATABASE_URL);
const photosDirectory = resolve(PHOTOS_DIR);
const now = new Date();
const latest = now.getTime() - SAFETY_MARGIN_MINUTES * MS_PER_MINUTE;
const babyId = DEFAULT_BABY_ID;

/** Deterministic pseudo-random sequence so the history looks the same on every run. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

/** Local time `minutesOfDay` of the day `daysAgo` days before today, as epoch milliseconds. */
function atLocal(daysAgo: number, minutesOfDay: number): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 0, minutesOfDay).getTime();
}

function pick<T>(random: () => number, options: readonly T[]): T {
  return options[Math.floor(random() * options.length)]!;
}

async function writeDemoPhoto(background: string, emoji: string): Promise<string> {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">` +
    `<rect width="480" height="360" fill="${background}"/>` +
    `<text x="240" y="220" font-size="140" text-anchor="middle">${emoji}</text></svg>`;
  const name = `demo-${randomUUID()}.svg`;
  await mkdir(photosDirectory, { recursive: true });
  await writeFile(join(photosDirectory, name), svg);
  return name;
}

async function removePhotoFiles(): Promise<void> {
  const [sessions, changes] = await Promise.all([
    database.breastfeedingSession.findMany({ where: { babyId, photoPath: { not: null } }, select: { photoPath: true } }),
    database.diaperChange.findMany({ where: { babyId, photoPath: { not: null } }, select: { photoPath: true } }),
  ]);
  for (const { photoPath } of [...sessions, ...changes]) {
    await rm(join(photosDirectory, photoPath!), { force: true });
  }
}

async function countRecords(): Promise<number> {
  const counts = await Promise.all([
    database.breastfeedingSession.count({ where: { babyId } }),
    database.bottleFeed.count({ where: { babyId } }),
    database.diaperChange.count({ where: { babyId } }),
    database.sleepSession.count({ where: { babyId } }),
    database.vitaminDDose.count({ where: { babyId } }),
    database.nailTrim.count({ where: { babyId } }),
    database.bath.count({ where: { babyId } }),
  ]);
  return counts.reduce((sum, count) => sum + count, 0);
}

async function deleteRecords(): Promise<void> {
  await removePhotoFiles();
  await database.$transaction([
    database.breastfeedingSession.deleteMany({ where: { babyId } }),
    database.bottleFeed.deleteMany({ where: { babyId } }),
    database.diaperChange.deleteMany({ where: { babyId } }),
    database.sleepSession.deleteMany({ where: { babyId } }),
    database.vitaminDDose.deleteMany({ where: { babyId } }),
    database.nailTrim.deleteMany({ where: { babyId } }),
    database.bath.deleteMany({ where: { babyId } }),
  ]);
}

/** Feeds every ~3 hours with one or two breasts; a few with notes and two with a photo. */
async function seedBreastfeeding(): Promise<number> {
  const random = createRandom(2026);
  const photos = [await writeDemoPhoto('#ffe9b8', '😊'), await writeDemoPhoto('#cfe8ff', '😴')];
  let index = 0;
  let total = 0;

  for (let daysAgo = 0; daysAgo < HISTORY_DAYS; daysAgo += 1) {
    const spacing = 150 + Math.round((daysAgo / HISTORY_DAYS) * 90);
    for (let minute = Math.floor(random() * 60); minute < 1_440; minute += spacing + Math.round(random() * 50)) {
      const start = atLocal(daysAgo, minute);
      const first = random() > 0.5 ? 'left' : 'right';
      const second = first === 'left' ? 'right' : 'left';
      const lengths = random() > 0.45 ? [6 + Math.round(random() * 10), 3 + Math.round(random() * 8)] : [8 + Math.round(random() * 14)];
      const end = start + lengths.reduce((sum, length) => sum + length, 0) * MS_PER_MINUTE;
      index += 1;
      if (end > latest) {
        continue;
      }

      let cursor = start;
      const segments = lengths.map((length, position) => {
        const segmentStart = cursor;
        cursor += length * MS_PER_MINUTE;
        return { breast: (position === 0 ? first : second) as 'left' | 'right', startTime: new Date(segmentStart), endTime: new Date(cursor) };
      });
      await database.breastfeedingSession.create({
        data: {
          babyId,
          startTime: new Date(start),
          endTime: new Date(end),
          notes: index % 17 === 0 ? 'Estaba muy tranquila y eructó dos veces al final.' : null,
          photoPath: index === 12 ? photos[0]! : index === 90 ? photos[1]! : null,
          segments: { create: segments },
        },
      });
      total += 1;
    }
  }
  return total;
}

/** 6-8 bottle feeds per local day, with a few days without any. */
async function seedBottle(): Promise<number> {
  const random = createRandom(7_331);
  const daysWithout = new Set([9, 23, 38, 52]);
  const milkTypes = ['breast_milk', 'breast_milk', 'formula', 'formula', 'mixed'] as const;
  const data: { babyId: string; fedAt: Date; amountMl: number; milkType: (typeof milkTypes)[number]; notes: string | null }[] = [];

  for (let daysAgo = 0; daysAgo < HISTORY_DAYS; daysAgo += 1) {
    if (daysWithout.has(daysAgo)) {
      continue;
    }
    const feeds = 6 + Math.floor(random() * 3);
    const slot = 1_440 / feeds;
    for (let position = 0; position < feeds; position += 1) {
      const fedAt = atLocal(daysAgo, Math.floor(position * slot + random() * slot));
      if (fedAt > latest) {
        continue;
      }
      data.push({
        babyId,
        fedAt: new Date(fedAt),
        amountMl: 60 + 10 * Math.floor(random() * 13),
        milkType: pick(random, milkTypes),
        notes: data.length % 23 === 0 ? 'Tenía mucha hambre.' : null,
      });
    }
  }
  await database.bottleFeed.createMany({ data });
  return data.length;
}

/** 6-9 changes per local day, a run of rashes and a few rare stool colors in the older history. */
async function seedDiaper(): Promise<number> {
  const random = createRandom(4_242);
  const photo = await writeDemoPhoto('#ffe9b8', '👶');
  const rare = new Map<number, 'black' | 'red' | 'white'>([
    [8, 'black'],
    [12, 'red'],
    [16, 'white'],
  ]);
  const colors = ['yellow', 'yellow', 'brown', 'green'] as const;
  const consistencies = ['soft', 'soft', 'liquid', 'mucous', 'firm'] as const;
  let total = 0;

  for (let daysAgo = 0; daysAgo < HISTORY_DAYS; daysAgo += 1) {
    const changes = 6 + Math.floor(random() * 4);
    for (let position = 0; position < changes; position += 1) {
      const changedAt = atLocal(daysAgo, Math.floor(random() * 1_440));
      const roll = random();
      const type = roll < 0.5 ? 'wet' : roll < 0.8 ? 'both' : 'dirty';
      const rareColor = position === 0 ? rare.get(daysAgo) : undefined;
      const isStool = type !== 'wet' || rareColor !== undefined;
      if (changedAt > latest) {
        continue;
      }
      await database.diaperChange.create({
        data: {
          babyId,
          changedAt: new Date(changedAt),
          type: rareColor === undefined ? type : 'dirty',
          stoolColor: isStool ? (rareColor ?? pick(random, colors)) : null,
          stoolConsistency: isStool ? pick(random, consistencies) : null,
          hasRash: daysAgo >= 3 && daysAgo <= 5 && position % 2 === 0,
          notes: rareColor === undefined ? null : 'Se lo comenté al pediatra.',
          photoPath: daysAgo === 1 && position === 0 ? photo : null,
        },
      });
      total += 1;
    }
  }
  return total;
}

/** Two to four naps (they start 08:00-18:15) and two night sleeps per day; nothing overlaps. */
async function seedSleep(): Promise<number> {
  const random = createRandom(9_001);
  const sleeps: { start: number; end: number }[] = [];

  for (let daysAgo = 0; daysAgo < HISTORY_DAYS; daysAgo += 1) {
    const night1Start = 19 * 60 + 30 + Math.floor(random() * 90);
    const night1Duration = 180 + Math.floor(random() * 90);
    const nightGap = 40 + Math.floor(random() * 50);
    const night2Duration = 180 + Math.floor(random() * 90);

    let cursor = 8 * 60 + Math.floor(random() * 60);
    for (let nap = 0; nap < 4; nap += 1) {
      const duration = 30 + Math.floor(random() * 90);
      if (cursor + duration > night1Start - 45) {
        break;
      }
      sleeps.push({ start: atLocal(daysAgo, cursor), end: atLocal(daysAgo, cursor + duration) });
      cursor += duration + 90 + Math.floor(random() * 90);
    }
    const night1 = atLocal(daysAgo, night1Start);
    sleeps.push({ start: night1, end: night1 + night1Duration * MS_PER_MINUTE });
    const night2 = night1 + (night1Duration + nightGap) * MS_PER_MINUTE;
    sleeps.push({ start: night2, end: night2 + night2Duration * MS_PER_MINUTE });
  }

  // Daylight saving changes can make a generated sleep overlap the previous one: drop those.
  let lastEnd = Number.NEGATIVE_INFINITY;
  const data = sleeps
    .sort((a, b) => a.start - b.start)
    .filter((sleep) => {
      const keep = sleep.start >= lastEnd && sleep.end <= latest;
      if (keep) {
        lastEnd = sleep.end;
      }
      return keep;
    })
    .map((sleep, index) => ({
      babyId,
      startTime: new Date(sleep.start),
      endTime: new Date(sleep.end),
      notes: index % 19 === 0 ? 'Se despertó una vez y volvió a dormirse sola.' : null,
    }));
  await database.sleepSession.createMany({ data });
  return data.length;
}

/** About one dose a day for the last 45 days, with some missed days. */
async function seedVitaminD(): Promise<number> {
  const random = createRandom(555);
  const data: { babyId: string; givenAt: Date; drops: number | null; notes: string | null }[] = [];

  for (let daysAgo = 0; daysAgo < 45; daysAgo += 1) {
    const roll = random();
    const givenAt = atLocal(daysAgo, 8 * 60 + 30 + Math.floor(random() * 180));
    if ((daysAgo > 0 && roll < 0.12) || givenAt > latest) {
      continue;
    }
    data.push({
      babyId,
      givenAt: new Date(givenAt),
      drops: random() < 0.15 ? null : 2 + Math.floor(random() * 2),
      notes: data.length % 14 === 0 ? 'Se la tomó sin problema.' : null,
    });
  }
  await database.vitaminDDose.createMany({ data });
  return data.length;
}

/** Hands about every week and feet about every ten days; a hands+feet trim when they coincide. */
async function seedNailTrimming(): Promise<number> {
  const random = createRandom(31);
  const data: { babyId: string; trimmedAt: Date; areas: ('hands' | 'feet')[]; notes: string | null }[] = [];

  for (let daysAgo = 0; daysAgo < HISTORY_DAYS; daysAgo += 1) {
    const hands = daysAgo >= 4 && (daysAgo - 4) % 7 === 0;
    const feet = daysAgo >= 6 && (daysAgo - 6) % 10 === 0;
    if (!hands && !feet) {
      continue;
    }
    data.push({
      babyId,
      trimmedAt: new Date(atLocal(daysAgo, 19 * 60 + Math.floor(random() * 120))),
      areas: [...(hands ? (['hands'] as const) : []), ...(feet ? (['feet'] as const) : [])],
      notes: data.length % 5 === 0 ? 'Aprovechamos que estaba dormida.' : null,
    });
  }
  await database.nailTrim.createMany({ data });
  return data.length;
}

/** A bath every two or three days, hair washed every third time. */
async function seedBath(): Promise<number> {
  const random = createRandom(77);
  const reactions = ['happy', 'happy', 'neutral', 'sad', null] as const;
  const data: { babyId: string; bathedAt: Date; hairWashed: boolean; reaction: 'happy' | 'neutral' | 'sad' | null; notes: string | null }[] = [];

  for (let daysAgo = 1; daysAgo < HISTORY_DAYS; daysAgo += data.length % 2 === 0 ? 2 : 3) {
    data.push({
      babyId,
      bathedAt: new Date(atLocal(daysAgo, 18 * 60 + 30 + Math.floor(random() * 60))),
      hairWashed: data.length % 3 === 0,
      reaction: pick(random, reactions),
      notes: data.length % 9 === 0 ? 'Le encantó el agua tibia.' : null,
    });
  }
  await database.bath.createMany({ data });
  return data.length;
}

async function main(): Promise<void> {
  await database.baby.upsert({ where: { id: babyId }, update: {}, create: { id: babyId, name: 'Baby Ricardito' } });

  if (process.argv.includes('--reset')) {
    await deleteRecords();
    console.log(`Deleted every record of "${babyId}".`);
  } else if ((await countRecords()) > 0) {
    console.error(`"${babyId}" already has records. Run \`npm run db:seed:demo -- --reset\` to replace them.`);
    process.exitCode = 1;
    return;
  }

  const summary = {
    breastfeeding: await seedBreastfeeding(),
    bottle: await seedBottle(),
    diaper: await seedDiaper(),
    sleep: await seedSleep(),
    vitaminD: await seedVitaminD(),
    nailTrimming: await seedNailTrimming(),
    bath: await seedBath(),
  };
  console.log('Demo data created:', summary);
}

try {
  await main();
} finally {
  await database.$disconnect();
}
