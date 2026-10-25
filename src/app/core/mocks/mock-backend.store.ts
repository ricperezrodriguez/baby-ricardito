import { Injectable } from '@angular/core';
import {
  BreastfeedingSession,
  BreastfeedingSessionsPage,
} from '../../features/breastfeeding/breastfeeding.models';
import { applyUpdate, buildSession } from './mock-backend.calculations';
import { conflict, notFound } from './mock-backend.errors';
import { createSeedSessions, SEED_BABY_ID } from './mock-backend.seed';
import { assertChronology, parseCreateBody, parseUpdateBody } from './mock-backend.validation';

type BabySessions = Map<string, BreastfeedingSession>;

function toSessionMap(sessions: BreastfeedingSession[]): BabySessions {
  return new Map(sessions.map((session) => [session.id, session]));
}

function byStartTimeDescending(a: BreastfeedingSession, b: BreastfeedingSession): number {
  return new Date(b.startTime).getTime() - new Date(a.startTime).getTime() || b.id.localeCompare(a.id);
}

/** In-memory data store: lives as long as the app stays open. */
@Injectable({ providedIn: 'root' })
export class MockBackendStore {
  private readonly sessionsByBaby = new Map<string, BabySessions>([
    [SEED_BABY_ID, toSessionMap(createSeedSessions(new Date()))],
  ]);

  list(babyId: string, limit: number, offset: number): BreastfeedingSessionsPage {
    const sessions = [...this.requireBabySessions(babyId).values()].map((session) => this.refresh(session));
    const items = sessions.sort(byStartTimeDescending).slice(offset, offset + limit);
    return { items, total: sessions.length, limit, offset };
  }

  getById(babyId: string, sessionId: string): BreastfeedingSession {
    return this.refresh(this.requireSession(babyId, sessionId));
  }

  create(babyId: string, body: unknown): BreastfeedingSession {
    const sessions = this.requireBabySessions(babyId);
    const input = parseCreateBody(body);
    assertChronology(input);
    this.assertNoOtherInProgress(sessions, input.endTime, null);

    const timestamp = new Date().toISOString();
    const session = buildSession({
      id: crypto.randomUUID(),
      babyId,
      input,
      createdAt: timestamp,
      updatedAt: timestamp,
      now: new Date(),
    });
    sessions.set(session.id, session);
    return session;
  }

  update(babyId: string, sessionId: string, body: unknown): BreastfeedingSession {
    const sessions = this.requireBabySessions(babyId);
    const current = this.requireSession(babyId, sessionId);
    const input = applyUpdate(current, parseUpdateBody(body));
    assertChronology(input);
    this.assertNoOtherInProgress(sessions, input.endTime, sessionId);

    const updated = buildSession({
      id: current.id,
      babyId: current.babyId,
      input,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
      now: new Date(),
    });
    sessions.set(updated.id, updated);
    return updated;
  }

  remove(babyId: string, sessionId: string): void {
    this.requireSession(babyId, sessionId);
    this.requireBabySessions(babyId).delete(sessionId);
  }

  private requireBabySessions(babyId: string): BabySessions {
    const sessions = this.sessionsByBaby.get(babyId);
    if (sessions === undefined) {
      throw notFound('BABY_NOT_FOUND', `Baby "${babyId}" does not exist.`);
    }
    return sessions;
  }

  private requireSession(babyId: string, sessionId: string): BreastfeedingSession {
    const session = this.requireBabySessions(babyId).get(sessionId);
    if (session === undefined) {
      throw notFound('SESSION_NOT_FOUND', `Session "${sessionId}" does not exist.`);
    }
    return session;
  }

  private assertNoOtherInProgress(sessions: BabySessions, endTime: string | null, ignoredSessionId: string | null): void {
    if (endTime !== null) {
      return;
    }
    const hasOther = [...sessions.values()].some((s) => s.status === 'in_progress' && s.id !== ignoredSessionId);
    if (hasOther) {
      throw conflict('SESSION_IN_PROGRESS', 'There is already a session in progress for this baby.');
    }
  }

  /** Open sessions keep growing, so their durations are recomputed on read. */
  private refresh(session: BreastfeedingSession): BreastfeedingSession {
    if (session.status !== 'in_progress') {
      return session;
    }
    return buildSession({
      id: session.id,
      babyId: session.babyId,
      input: session,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      now: new Date(),
    });
  }
}
