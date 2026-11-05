import { Service } from '@angular/core';
import {
  BOTTLE_HISTORY_CHART_IDS,
  BottleFeed,
  BottleFeedsPage,
  BottleHistoryPreferences,
  BottleMilkType,
  BottleStats,
  BottleStatsRequest,
} from '@app/features/bottle/bottle.models';
import { notFound } from '@app/core/mocks/mock-backend.errors';
import { parseHiddenChartsBody } from '@app/core/mocks/mock-backend.parsing';
import { SEED_BABY_ID } from '@app/core/mocks/mock-backend.seed-utils';
import { createSeedBottleFeeds } from '@app/core/mocks/mock-backend.bottle.seed';
import { calculateBottleStats } from '@app/core/mocks/mock-backend.bottle.stats';
import {
  BottleFeedInput,
  applyUpdate,
  assertValidFeed,
  parseCreateBody,
  parseUpdateBody,
} from '@app/core/mocks/mock-backend.bottle.validation';

type BabyFeeds = Map<string, BottleFeed>;

function toFeedMap(feeds: BottleFeed[]): BabyFeeds {
  return new Map(feeds.map((feed) => [feed.id, feed]));
}

function byFedAtDescending(a: BottleFeed, b: BottleFeed): number {
  return Date.parse(b.fedAt) - Date.parse(a.fedAt) || b.id.localeCompare(a.id);
}

function buildFeed(
  base: Pick<BottleFeed, 'id' | 'babyId' | 'createdAt'>,
  input: BottleFeedInput,
  updatedAt: string,
): BottleFeed {
  const { notes, ...content } = input;
  return { ...base, ...content, ...(notes === undefined ? {} : { notes }), updatedAt };
}

/** In-memory bottle data store: lives as long as the app stays open. */
@Service()
export class MockBottleStore {
  private readonly feedsByBaby = new Map<string, BabyFeeds>([
    [SEED_BABY_ID, toFeedMap(createSeedBottleFeeds(new Date()))],
  ]);
  private readonly historyPreferencesByBaby = new Map<string, BottleHistoryPreferences>();

  /** Newest first; `milkTypes` empty means every milk type. */
  list(babyId: string, limit: number, offset: number, milkTypes: readonly BottleMilkType[]): BottleFeedsPage {
    const feeds = [...this.requireBabyFeeds(babyId).values()]
      .filter((feed) => milkTypes.length === 0 || milkTypes.includes(feed.milkType))
      .sort(byFedAtDescending);
    return { items: feeds.slice(offset, offset + limit), total: feeds.length, limit, offset };
  }

  getById(babyId: string, feedId: string): BottleFeed {
    return this.requireFeed(babyId, feedId);
  }

  stats(babyId: string, request: BottleStatsRequest): BottleStats {
    return calculateBottleStats([...this.requireBabyFeeds(babyId).values()], request);
  }

  getHistoryPreferences(babyId: string): BottleHistoryPreferences {
    this.requireBabyFeeds(babyId);
    return this.historyPreferencesByBaby.get(babyId) ?? { hiddenCharts: [] };
  }

  saveHistoryPreferences(babyId: string, body: unknown): BottleHistoryPreferences {
    this.requireBabyFeeds(babyId);
    const preferences = parseHiddenChartsBody(body, BOTTLE_HISTORY_CHART_IDS);
    this.historyPreferencesByBaby.set(babyId, preferences);
    return preferences;
  }

  create(babyId: string, body: unknown): BottleFeed {
    const feeds = this.requireBabyFeeds(babyId);
    const input = parseCreateBody(body);
    assertValidFeed(input, Date.now());

    const timestamp = new Date().toISOString();
    const feed = buildFeed({ id: crypto.randomUUID(), babyId, createdAt: timestamp }, input, timestamp);
    feeds.set(feed.id, feed);
    return feed;
  }

  update(babyId: string, feedId: string, body: unknown): BottleFeed {
    const current = this.requireFeed(babyId, feedId);
    const input = applyUpdate(current, parseUpdateBody(body));
    assertValidFeed(input, Date.now());

    const updated = buildFeed(
      { id: current.id, babyId: current.babyId, createdAt: current.createdAt },
      input,
      new Date().toISOString(),
    );
    this.requireBabyFeeds(babyId).set(updated.id, updated);
    return updated;
  }

  remove(babyId: string, feedId: string): void {
    this.requireFeed(babyId, feedId);
    this.requireBabyFeeds(babyId).delete(feedId);
  }

  private requireBabyFeeds(babyId: string): BabyFeeds {
    const feeds = this.feedsByBaby.get(babyId);
    if (feeds === undefined) {
      throw notFound('BABY_NOT_FOUND', `Baby "${babyId}" does not exist.`);
    }
    return feeds;
  }

  private requireFeed(babyId: string, feedId: string): BottleFeed {
    const feed = this.requireBabyFeeds(babyId).get(feedId);
    if (feed === undefined) {
      throw notFound('FEED_NOT_FOUND', `Bottle feed "${feedId}" does not exist.`);
    }
    return feed;
  }
}
