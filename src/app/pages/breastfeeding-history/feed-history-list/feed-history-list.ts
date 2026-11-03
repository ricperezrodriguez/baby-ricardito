import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { BreastfeedingSession } from '@app/features/breastfeeding/breastfeeding.models';
import { BreastfeedingService } from '@app/features/breastfeeding/breastfeeding.service';
import {
  createPagedList,
  formatDurationText,
  HistoryDay,
  HistoryList,
  HistoryRow,
  parseTimestamp,
  RecordFlags,
} from '@shared';

/** Path of the child route that opens a feed; its modal closing refreshes the list. */
const FEED_DIALOG_ROUTE = ':sessionId';

interface FeedRow {
  id: string;
  startMs: number;
  endMs: number | null;
  inProgress: boolean;
  durationSeconds: number;
  duration: string;
  left: string | null;
  right: string | null;
  hasNotes: boolean;
  hasPhoto: boolean;
  link: string[];
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
    durationSeconds: session.totalDurationSeconds,
    duration: formatDurationText(session.totalDurationSeconds * 1_000),
    left: sideText(session.leftBreastDurationSeconds),
    right: sideText(session.rightBreastDurationSeconds),
    hasNotes: !!session.notes?.trim(),
    hasPhoto: !!session.photoUrl,
    // A running feed is continued in its own modal, not opened as history.
    link: inProgress ? ['/lactancia'] : ['/detalle/pecho', session.id],
  };
}

/** "N tomas · X"; the time is the sum of the feeds of the day. */
function summaryOf(rows: readonly FeedRow[]): string {
  const seconds = rows.reduce((sum, { durationSeconds }) => sum + durationSeconds, 0);
  const count = rows.length;
  return `${count} ${count === 1 ? 'toma' : 'tomas'} · ${formatDurationText(seconds * 1_000)}`;
}

/** Feeds grouped by day, loaded page by page as the user scrolls down. */
@Component({
  selector: 'app-feed-history-list',
  imports: [DatePipe, HistoryDay, HistoryList, HistoryRow, RecordFlags],
  styleUrl: './feed-history-list.scss',
  templateUrl: './feed-history-list.html',
})
export class FeedHistoryList {
  private readonly service = inject(BreastfeedingService);

  protected readonly list = createPagedList<BreastfeedingSession, FeedRow>({
    load: (page) => this.service.getPage(CURRENT_BABY_ID, page),
    toRow,
    timeOf: ({ startMs }) => startMs,
    summaryOf,
    dialogRoute: FEED_DIALOG_ROUTE,
  });
}
