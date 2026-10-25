// breastfeeding.models.ts

export const BREAST_SIDE = {
  LEFT: 'left',
  RIGHT: 'right',
} as const;

/** Breast used */
export type Breast = (typeof BREAST_SIDE)[keyof typeof BREAST_SIDE];

/** Session status (useful when a timer is running) */
export type SessionStatus = 'in_progress' | 'paused' | 'finished';

/** Segment of breastfeeding on a specific breast within a session */
export interface BreastSegment {
  breast: Breast;
  startTime: string; // ISO 8601 (UTC)
  endTime: string | null; // null if the segment is still in progress
}

/** Breastfeeding session: what the backend returns */
export interface BreastfeedingSession {
  id: string;
  babyId: string;

  startTime: string; // ISO 8601 (UTC)
  endTime: string | null;
  status: SessionStatus;

  segments: BreastSegment[];

  // Totals calculated by the backend
  totalDurationSeconds: number;
  leftBreastDurationSeconds: number;
  rightBreastDurationSeconds: number;
  firstBreast: Breast | null; // useful to suggest which breast to start with next time

  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface BreastfeedingSessionsPageRequest {
  limit: number;
  offset: number;
}

export interface BreastfeedingSessionsPage {
  items: BreastfeedingSession[];
  total: number;
  limit: number;
  offset: number;
}

/** Create a session (sent from the front) */
export interface CreateBreastfeedingSessionDto {
  babyId: string;
  startTime: string;
  endTime?: string | null;
  segments?: Pick<BreastSegment, 'breast' | 'startTime' | 'endTime'>[];
  notes?: string;
}

/** Update a session (change segments, notes, close the session...) */
export type UpdateBreastfeedingSessionDto = Partial<Omit<CreateBreastfeedingSessionDto, 'babyId'>>;
