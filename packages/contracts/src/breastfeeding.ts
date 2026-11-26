import { z } from 'zod';
import {
  HourMapSchema,
  IsoDateTimeInputSchema,
  IsoDateTimeSchema,
  PageQuerySchema,
  historyPreferencesSchema,
  pageSchema,
} from './common';

export const BREAST_SIDES = ['left', 'right'] as const;
export const BreastSchema = z.enum(BREAST_SIDES).meta({ id: 'Breast', description: 'Breast used.' });
export type Breast = z.infer<typeof BreastSchema>;

export const BREASTFEEDING_STATUSES = ['in_progress', 'finished'] as const;

export const BREASTFEEDING_ERROR_CODES = {
  startTime: 'INVALID_DATE_FORMAT',
  endTime: 'INVALID_DATE_FORMAT',
  notes: 'INVALID_NOTES',
  segments: 'INVALID_SEGMENTS',
  'segments.breast': 'INVALID_BREAST',
  'segments.startTime': 'INVALID_DATE_FORMAT',
  'segments.endTime': 'INVALID_DATE_FORMAT',
  '*': 'INVALID_BODY',
} as const;

/** Segment of breastfeeding on one breast within a session. */
export const BreastSegmentSchema = z
  .object({
    breast: BreastSchema,
    startTime: IsoDateTimeSchema,
    endTime: IsoDateTimeSchema.nullable().meta({
      description: 'Null while the session is still in progress and the segment is open.',
    }),
  })
  .meta({ id: 'BreastSegment' });

export type BreastSegment = z.infer<typeof BreastSegmentSchema>;

/** Breastfeeding session; totals are calculated by the API (open sessions are measured up to the request). */
export const BreastfeedingSessionSchema = z
  .object({
    id: z.string(),
    babyId: z.string(),
    startTime: IsoDateTimeSchema,
    endTime: IsoDateTimeSchema.nullable().meta({ description: 'Null while the session is in progress.' }),
    status: z.enum(BREASTFEEDING_STATUSES),
    segments: z.array(BreastSegmentSchema).meta({
      description: 'Ordered by start. In a finished session the open segments are closed with the session `endTime`.',
    }),
    totalDurationSeconds: z.number().int().meta({
      description: 'Sum of the segments; the session span when there are no segments.',
    }),
    leftBreastDurationSeconds: z.number().int(),
    rightBreastDurationSeconds: z.number().int(),
    firstBreast: BreastSchema.nullable().meta({ description: 'Breast of the earliest segment; null without segments.' }),
    notes: z.string().optional().meta({ description: 'Absent when there are none.' }),
    photoUrl: z.string().optional().meta({ description: 'Absent when the session has no photo.' }),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .meta({ id: 'BreastfeedingSession' });

export type BreastfeedingSession = z.infer<typeof BreastfeedingSessionSchema>;

const SegmentInputSchema = z
  .object({
    breast: BreastSchema,
    startTime: IsoDateTimeInputSchema,
    endTime: IsoDateTimeInputSchema.nullable().optional(),
  })
  .meta({ id: 'BreastSegmentInput' });

export const CreateBreastfeedingSessionSchema = z
  .object({
    startTime: IsoDateTimeInputSchema,
    endTime: IsoDateTimeInputSchema.nullable().optional().meta({
      description: 'Omit or send null to start a session in progress (409 `SESSION_IN_PROGRESS` when another is open).',
    }),
    segments: z.array(SegmentInputSchema).optional().meta({ description: 'Defaults to none.' }),
    notes: z.string().optional().meta({ description: 'An empty string means no notes.' }),
  })
  .meta({ id: 'CreateBreastfeedingSession' });

export type CreateBreastfeedingSession = z.infer<typeof CreateBreastfeedingSessionSchema>;

/** Omitted fields keep their value; `segments` replaces the whole list; `endTime: null` reopens the session. */
export const UpdateBreastfeedingSessionSchema = CreateBreastfeedingSessionSchema.partial().meta({
  id: 'UpdateBreastfeedingSession',
});

export type UpdateBreastfeedingSession = z.infer<typeof UpdateBreastfeedingSessionSchema>;

export const BreastfeedingSessionsPageSchema = pageSchema(BreastfeedingSessionSchema, 'BreastfeedingSessionsPage');

export const BreastfeedingQuerySchema = PageQuerySchema;

export const BREASTFEEDING_HISTORY_CHART_IDS = [
  'feedsPerDay',
  'minutesPerDay',
  'breastSplit',
  'averageDuration',
  'averageInterval',
  'hourMap',
] as const;

export const BreastfeedingHistoryPreferencesSchema = historyPreferencesSchema(
  BREASTFEEDING_HISTORY_CHART_IDS,
  'BreastfeedingHistoryPreferences',
);

export const BreastfeedingDayStatsSchema = z
  .object({
    date: z.string().meta({ example: '2026-11-18', description: 'Local day, yyyy-MM-dd.' }),
    feeds: z.number().int(),
    totalSeconds: z.number().int(),
    leftSeconds: z.number().int(),
    rightSeconds: z.number().int(),
    averageDurationSeconds: z.number().int().nullable(),
    averageIntervalSeconds: z.number().int().nullable().meta({
      description: 'Start to start against the previous feed, even from the day before; null without a previous feed.',
    }),
  })
  .meta({ id: 'BreastfeedingDayStats' });

export const BreastfeedingStatsTotalsSchema = z
  .object({
    feeds: z.number().int(),
    totalSeconds: z.number().int(),
    leftSeconds: z.number().int(),
    rightSeconds: z.number().int(),
    averageDurationSeconds: z.number().int().nullable(),
    averageIntervalSeconds: z.number().int().nullable(),
  })
  .meta({ id: 'BreastfeedingStatsTotals' });

export const BreastfeedingStatsSchema = z
  .object({
    from: z.string(),
    to: z.string(),
    timeZone: z.string(),
    days: z.array(BreastfeedingDayStatsSchema),
    totals: BreastfeedingStatsTotalsSchema,
    hourMap: HourMapSchema.meta({ description: 'Feeds started per weekday (0 = Monday) and hour of the day.' }),
  })
  .meta({ id: 'BreastfeedingStats' });

export type BreastfeedingStats = z.infer<typeof BreastfeedingStatsSchema>;
export type BreastfeedingDayStats = z.infer<typeof BreastfeedingDayStatsSchema>;
export type BreastfeedingStatsTotals = z.infer<typeof BreastfeedingStatsTotalsSchema>;
