import { z } from 'zod';
import {
  HourMapSchema,
  IsoDateTimeInputSchema,
  IsoDateTimeSchema,
  PageQuerySchema,
  alertSettingsSchema,
  historyPreferencesSchema,
  notesSchema,
  pageSchema,
} from './common';

export const SLEEP_NOTES_MAX_LENGTH = 500;

export const SLEEP_STATUSES = ['in_progress', 'finished'] as const;

export const SLEEP_ERROR_CODES = {
  startTime: 'INVALID_DATE_FORMAT',
  endTime: 'INVALID_DATE_FORMAT',
  notes: 'INVALID_NOTES',
  '*': 'INVALID_BODY',
} as const;

/** Sleep session (nap or night). Nap vs night is not stored: it comes from the local start hour. */
export const SleepSessionSchema = z
  .object({
    id: z.string(),
    babyId: z.string(),
    startTime: IsoDateTimeSchema.meta({ description: 'Never in the future.' }),
    endTime: IsoDateTimeSchema.nullable().meta({
      description: 'Null while the baby is still asleep; never in the future.',
    }),
    status: z.enum(SLEEP_STATUSES).meta({ description: '`in_progress` when `endTime` is null.' }),
    durationSeconds: z.number().int().meta({
      description: 'Calculated by the API; for an ongoing sleep it is measured up to the moment of the request.',
    }),
    notes: notesSchema(SLEEP_NOTES_MAX_LENGTH).optional().meta({ description: 'Absent when there are none.' }),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .meta({ id: 'SleepSession' });

export type SleepSession = z.infer<typeof SleepSessionSchema>;

export const CreateSleepSessionSchema = z
  .object({
    startTime: IsoDateTimeInputSchema,
    endTime: IsoDateTimeInputSchema.nullable().optional().meta({
      description: 'Omit or send null to start an ongoing sleep (409 `SLEEP_IN_PROGRESS` when another is ongoing).',
    }),
    notes: notesSchema(SLEEP_NOTES_MAX_LENGTH).optional(),
  })
  .meta({
    id: 'CreateSleepSession',
    description: 'Retroactive entries are allowed; overlapping another sleep is rejected with 409 `SLEEP_OVERLAP`.',
  });

export type CreateSleepSession = z.infer<typeof CreateSleepSessionSchema>;

/** Waking up the baby is a PATCH with `endTime`; an explicit `endTime: null` reopens the sleep. */
export const UpdateSleepSessionSchema = CreateSleepSessionSchema.partial().meta({ id: 'UpdateSleepSession' });

export type UpdateSleepSession = z.infer<typeof UpdateSleepSessionSchema>;

export const SleepSessionsPageSchema = pageSchema(SleepSessionSchema, 'SleepSessionsPage');

export const SleepQuerySchema = PageQuerySchema;

export const SLEEP_HISTORY_CHART_IDS = [
  'sleepsPerDay',
  'hoursPerDay',
  'averageDuration',
  'averageAwake',
  'hourMap',
] as const;

export const SleepHistoryPreferencesSchema = historyPreferencesSchema(
  SLEEP_HISTORY_CHART_IDS,
  'SleepHistoryPreferences',
);

/** Hours awake since the last sleep after which the alert can show. */
export const SLEEP_AWAKE_ALERT_THRESHOLDS = [2, 3, 4, 5] as const;

export const SleepAwakeAlertSettingsSchema = alertSettingsSchema(
  'thresholdHours',
  SLEEP_AWAKE_ALERT_THRESHOLDS,
  'SleepAwakeAlertSettings',
  '"Awake for too long" alert, stored per baby.',
);

export const DEFAULT_SLEEP_AWAKE_ALERT_SETTINGS = { enabled: true, thresholdHours: 3 } as const;

/** Hours of an ongoing daytime sleep after which the alert can show. */
export const SLEEP_LONG_NAP_ALERT_THRESHOLDS = [3, 4, 5, 6] as const;

export const SleepLongNapAlertSettingsSchema = alertSettingsSchema(
  'thresholdHours',
  SLEEP_LONG_NAP_ALERT_THRESHOLDS,
  'SleepLongNapAlertSettings',
  '"Long nap" alert, stored per baby; it only applies to ongoing sleeps that started by day.',
);

export const DEFAULT_SLEEP_LONG_NAP_ALERT_SETTINGS = { enabled: true, thresholdHours: 4 } as const;

export const SleepDayStatsSchema = z
  .object({
    date: z.string().meta({ example: '2026-11-18', description: 'Local day, yyyy-MM-dd.' }),
    sleeps: z.number().int().meta({ description: 'Finished sleeps that started this day.' }),
    totalSeconds: z.number().int().meta({
      description: 'Seconds asleep during this local day (a sleep crossing midnight is split between both days).',
    }),
    longestSleepSeconds: z.number().int().meta({ description: 'Longest sleep that started this day; 0 without sleeps.' }),
    averageDurationSeconds: z.number().int().nullable(),
    averageAwakeSeconds: z.number().int().nullable().meta({
      description: 'Awake time before the sleeps that started this day; null without a previous sleep.',
    }),
    napAverageDurationSeconds: z.number().int().nullable().meta({ description: 'Naps start 07:00-18:59 local.' }),
    nightAverageDurationSeconds: z.number().int().nullable().meta({ description: 'Night sleeps start 19:00-06:59 local.' }),
  })
  .meta({ id: 'SleepDayStats' });

export const SleepStatsTotalsSchema = z
  .object({
    sleeps: z.number().int(),
    totalSeconds: z.number().int(),
    averageDailySeconds: z.number().int().nullable().meta({ description: 'Over ALL the days of the range, zeros included.' }),
    longestSleepSeconds: z.number().int(),
    averageDurationSeconds: z.number().int().nullable(),
    averageAwakeSeconds: z.number().int().nullable(),
    napAverageDurationSeconds: z.number().int().nullable(),
    nightAverageDurationSeconds: z.number().int().nullable(),
  })
  .meta({ id: 'SleepStatsTotals' });

export const SleepStatsSchema = z
  .object({
    from: z.string(),
    to: z.string(),
    timeZone: z.string(),
    days: z.array(SleepDayStatsSchema),
    totals: SleepStatsTotalsSchema,
    hourMap: HourMapSchema.meta({ description: 'MINUTES asleep per weekday (0 = Monday) and hour of the day.' }),
  })
  .meta({ id: 'SleepStats' });

export type SleepStats = z.infer<typeof SleepStatsSchema>;
export type SleepDayStats = z.infer<typeof SleepDayStatsSchema>;
export type SleepStatsTotals = z.infer<typeof SleepStatsTotalsSchema>;
