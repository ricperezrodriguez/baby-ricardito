import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CURRENT_BABY_ID } from '@app/core/current-baby';
import { SleepSession } from '@app/features/sleep/sleep.models';
import { SleepService } from '@app/features/sleep/sleep.service';
import { sleepSpan } from '@app/features/sleep/sleep.span';
import {
  createPagedList,
  formatDurationText,
  HistoryDay,
  HistoryList,
  HistoryRow,
  localDateKey,
  RecordFlags,
} from '@shared';

/** Path of the child route that opens a sleep; its modal closing refreshes the list. */
const SLEEP_DIALOG_ROUTE = ':sessionId';

interface SleepRow {
  id: string;
  startMs: number;
  endMs: number | null;
  /** The wake-up falls on a later local day than the start (shown as "(+1)"). */
  endsNextDay: boolean;
  inProgress: boolean;
  durationSeconds: number;
  duration: string;
  hasNotes: boolean;
  link: string[];
}

function toRow(session: SleepSession): SleepRow | null {
  const span = sleepSpan(session);
  if (span === null) {
    return null;
  }

  const inProgress = session.status !== 'finished';
  return {
    id: session.id,
    startMs: span.start,
    endMs: span.end,
    endsNextDay: span.end !== null && localDateKey(span.end) !== localDateKey(span.start),
    inProgress,
    durationSeconds: session.durationSeconds,
    duration: formatDurationText(session.durationSeconds * 1_000),
    hasNotes: !!session.notes?.trim(),
    // A sleep in progress is continued in its own modal, not opened as history.
    link: inProgress ? ['/sueno'] : ['/detalle/sueno', session.id],
  };
}

/** "N sueños · X"; only finished sleeps count (an ongoing one has no final duration yet). */
function summaryOf(rows: readonly SleepRow[]): string {
  const finished = rows.filter(({ inProgress }) => !inProgress);
  if (finished.length === 0) {
    return '';
  }
  const seconds = finished.reduce((sum, { durationSeconds }) => sum + durationSeconds, 0);
  const count = finished.length;
  return `${count} ${count === 1 ? 'sueño' : 'sueños'} · ${formatDurationText(seconds * 1_000)}`;
}

/** Sleeps grouped by the day they started, loaded page by page as the user scrolls down. */
@Component({
  selector: 'app-sleep-history-list',
  imports: [DatePipe, HistoryDay, HistoryList, HistoryRow, RecordFlags],
  styleUrl: './sleep-history-list.scss',
  templateUrl: './sleep-history-list.html',
})
export class SleepHistoryList {
  private readonly service = inject(SleepService);

  protected readonly list = createPagedList<SleepSession, SleepRow>({
    load: (page) => this.service.getPage(CURRENT_BABY_ID, page),
    toRow,
    timeOf: ({ startMs }) => startMs,
    summaryOf,
    dialogRoute: SLEEP_DIALOG_ROUTE,
  });
}
