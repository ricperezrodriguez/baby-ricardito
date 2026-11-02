import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { filter, Subscription } from 'rxjs';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { BreastfeedingSession } from '@app/features/breastfeeding/breastfeeding.models';
import { BreastfeedingService } from '@app/features/breastfeeding/breastfeeding.service';
import {
  createClock,
  DialogRouteEvents,
  formatDayHeading,
  formatDurationText,
  InView,
  LoadingSpinner,
  localDateKey,
  parseTimestamp,
} from '@shared';

const PAGE_SIZE = 20;
/** Path of the child route that opens a feed; its modal closing refreshes the list. */
const FEED_DIALOG_ROUTE = ':sessionId';

interface FeedRow {
  id: string;
  startMs: number;
  endMs: number | null;
  inProgress: boolean;
  duration: string;
  left: string | null;
  right: string | null;
  hasNotes: boolean;
  hasPhoto: boolean;
  link: string[];
}

interface DayGroup {
  key: string;
  heading: string;
  summary: string | null;
  rows: FeedRow[];
}

function toRow(session: BreastfeedingSession): FeedRow | null {
  const startMs = parseTimestamp(session.startTime);
  if (startMs === null) {
    return null;
  }

  const inProgress = session.status !== 'finished';
  const sideText = (seconds: number): string | null =>
    seconds > 0 ? formatDurationText(seconds * 1_000) : null;
  return {
    id: session.id,
    startMs,
    endMs: session.endTime === null ? null : parseTimestamp(session.endTime),
    inProgress,
    duration: formatDurationText(session.totalDurationSeconds * 1_000),
    left: sideText(session.leftBreastDurationSeconds),
    right: sideText(session.rightBreastDurationSeconds),
    hasNotes: !!session.notes?.trim(),
    hasPhoto: !!session.photoUrl,
    // A running feed is continued in its own modal, not opened as history.
    link: inProgress ? ['/lactancia'] : ['/detalle/pecho', session.id],
  };
}

/** Feeds grouped by day, loaded page by page as the user scrolls down. */
@Component({
  selector: 'app-feed-history-list',
  imports: [DatePipe, InView, LoadingSpinner, MatButtonModule, MatIconModule, RouterLink],
  styleUrl: './feed-history-list.scss',
  templateUrl: './feed-history-list.html',
})
export class FeedHistoryList {
  private readonly service = inject(BreastfeedingService);
  private readonly clock = createClock(60_000);

  private readonly sessions = signal<BreastfeedingSession[]>([]);
  private readonly total = signal(0);
  private pending: Subscription | null = null;

  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly loadingMore = signal(false);
  /** Stops the automatic loading after a failed page until the user retries. */
  protected readonly moreFailed = signal(false);
  protected readonly hasMore = computed(() => this.sessions().length < this.total());

  protected readonly groups = computed<DayGroup[]>(() => {
    const now = this.clock.now();
    const groups: DayGroup[] = [];
    for (const session of this.sessions()) {
      const row = toRow(session);
      if (row === null) {
        continue;
      }

      const key = localDateKey(row.startMs);
      const last = groups.at(-1);
      if (last?.key === key) {
        last.rows.push(row);
      } else {
        groups.push({ key, heading: formatDayHeading(key, now), summary: null, rows: [row] });
      }
    }

    // The last day may continue in the next page, so its totals are only shown once everything is loaded.
    const complete = this.hasMore() ? groups.slice(0, -1) : groups;
    for (const group of complete) {
      group.summary = this.summaryOf(group, this.sessions());
    }
    return groups;
  });

  constructor() {
    inject(DialogRouteEvents)
      .closed$.pipe(
        filter((path) => path === FEED_DIALOG_ROUTE),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.reload());
    inject(DestroyRef).onDestroy(() => this.pending?.unsubscribe());

    this.reload();
  }

  protected reload(): void {
    this.pending?.unsubscribe();
    this.loadingMore.set(false);
    this.moreFailed.set(false);
    // Keeps the feeds already shown (and so the scroll position) after an edit.
    const limit = Math.max(PAGE_SIZE, this.sessions().length);
    if (this.sessions().length === 0) {
      this.status.set('loading');
    }

    this.pending = this.service.getPage(CURRENT_BABY_ID, { limit, offset: 0 }).subscribe({
      next: (page) => {
        this.sessions.set(page.items);
        this.total.set(page.total);
        this.status.set('ready');
      },
      error: () => {
        // The HTTP error interceptor already reports it; keep showing what was loaded.
        if (this.sessions().length === 0) {
          this.status.set('error');
        }
      },
    });
  }

  protected loadMore(): void {
    if (this.loadingMore() || !this.hasMore() || this.status() !== 'ready') {
      return;
    }

    this.loadingMore.set(true);
    this.moreFailed.set(false);
    this.pending = this.service
      .getPage(CURRENT_BABY_ID, { limit: PAGE_SIZE, offset: this.sessions().length })
      .subscribe({
        next: (page) => {
          this.sessions.update((current) => [...current, ...page.items]);
          this.total.set(page.total);
          this.loadingMore.set(false);
        },
        error: () => {
          this.loadingMore.set(false);
          this.moreFailed.set(true);
        },
      });
  }

  private summaryOf(group: DayGroup, sessions: readonly BreastfeedingSession[]): string {
    const ids = new Set(group.rows.map(({ id }) => id));
    const seconds = sessions
      .filter(({ id }) => ids.has(id))
      .reduce((sum, { totalDurationSeconds }) => sum + totalDurationSeconds, 0);
    const count = group.rows.length;
    return `${count} ${count === 1 ? 'toma' : 'tomas'} · ${formatDurationText(seconds * 1_000)}`;
  }
}
