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

export const VITAMIN_D_NOTES_MAX_LENGTH = 500;
export const VITAMIN_D_DROPS_MIN = 1;
export const VITAMIN_D_DROPS_MAX = 10;

const dropsSchema = z
  .number()
  .int()
  .min(VITAMIN_D_DROPS_MIN)
  .max(VITAMIN_D_DROPS_MAX)
  .meta({ example: 2, description: 'Whole drops.' });

export const VITAMIN_D_ERROR_CODES = {
  givenAt: 'INVALID_DATE_FORMAT',
  drops: 'INVALID_DROPS',
  notes: 'INVALID_NOTES',
  '*': 'INVALID_BODY',
} as const;

/** Vitamin D dose: a single instant, optionally with the number of drops. */
export const VitaminDDoseSchema = z
  .object({
    id: z.string(),
    babyId: z.string(),
    givenAt: IsoDateTimeSchema.meta({ description: 'Never in the future.' }),
    drops: dropsSchema.optional().meta({ description: 'Absent when not recorded.' }),
    notes: notesSchema(VITAMIN_D_NOTES_MAX_LENGTH).optional().meta({ description: 'Absent when there are none.' }),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .meta({ id: 'VitaminDDose' });

export type VitaminDDose = z.infer<typeof VitaminDDoseSchema>;

export const CreateVitaminDDoseSchema = z
  .object({
    givenAt: IsoDateTimeInputSchema,
    drops: dropsSchema.nullable().optional().meta({ description: 'A missing or null value means "not recorded".' }),
    notes: notesSchema(VITAMIN_D_NOTES_MAX_LENGTH).optional(),
  })
  .meta({ id: 'CreateVitaminDDose' });

export type CreateVitaminDDose = z.infer<typeof CreateVitaminDDoseSchema>;

/** Omitted fields keep their value; `drops: null` clears the drops. */
export const UpdateVitaminDDoseSchema = CreateVitaminDDoseSchema.partial().meta({ id: 'UpdateVitaminDDose' });

export type UpdateVitaminDDose = z.infer<typeof UpdateVitaminDDoseSchema>;

export const VitaminDDosesPageSchema = pageSchema(VitaminDDoseSchema, 'VitaminDDosesPage');

export const VITAMIN_D_HISTORY_CHART_IDS = ['calendar', 'dosesPerDay', 'dropsPerDay', 'hourMap'] as const;

export const VitaminDHistoryPreferencesSchema = historyPreferencesSchema(
  VITAMIN_D_HISTORY_CHART_IDS,
  'VitaminDHistoryPreferences',
);

/** Clock hours of the day selectable for the "dose not given yet" alert. */
export const VITAMIN_D_MISSED_ALERT_THRESHOLDS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] as const;

export const VitaminDMissedAlertSettingsSchema = alertSettingsSchema(
  'thresholdHours',
  VITAMIN_D_MISSED_ALERT_THRESHOLDS,
  'VitaminDMissedAlertSettings',
  '"Dose not given today" alert, stored per baby. `thresholdHours` is the CLOCK HOUR (18 = 18:00) from which it shows.',
);

export const DEFAULT_VITAMIN_D_MISSED_ALERT_SETTINGS = { enabled: true, thresholdHours: 18 } as const;

export const VitaminDQuerySchema = PageQuerySchema;

export const VITAMIN_D_DAY_STATUSES = ['given', 'missed', 'pending', 'notStarted'] as const;
export type VitaminDDayStatus = (typeof VITAMIN_D_DAY_STATUSES)[number];

export const VitaminDDayStatsSchema = z
  .object({
    date: z.string().meta({ example: '2026-11-18', description: 'Local day, yyyy-MM-dd.' }),
    doses: z.number().int(),
    drops: z.number().int().nullable().meta({ description: 'Sum of the drops recorded that day; null when none.' }),
    status: z.enum(VITAMIN_D_DAY_STATUSES).meta({
      description:
        '`given`: at least one dose. `pending`: today (or later) without doses. `notStarted`: before the first dose ever recorded. `missed`: any other day without doses.',
    }),
  })
  .meta({ id: 'VitaminDDayStats' });

export const VitaminDStatsTotalsSchema = z
  .object({
    doses: z.number().int(),
    drops: z.number().int().nullable(),
    daysGiven: z.number().int(),
    daysMissed: z.number().int(),
    daysInRange: z.number().int().meta({ description: '`daysGiven + daysMissed`.' }),
    adherencePercent: z.number().int().nullable().meta({ description: 'Null when `daysInRange` is 0.' }),
    currentStreakDays: z.number().int().meta({ description: 'Whole history; ends today or yesterday while today is pending.' }),
    longestStreakDays: z.number().int().meta({ description: 'Within the requested range.' }),
    lastGivenAt: IsoDateTimeSchema.nullable().meta({ description: 'Whole history; null when there is none.' }),
  })
  .meta({ id: 'VitaminDStatsTotals' });

export const VitaminDStatsSchema = z
  .object({
    from: z.string(),
    to: z.string(),
    timeZone: z.string(),
    days: z.array(VitaminDDayStatsSchema),
    totals: VitaminDStatsTotalsSchema,
    hourMap: HourMapSchema,
  })
  .meta({ id: 'VitaminDStats' });

export type VitaminDStats = z.infer<typeof VitaminDStatsSchema>;
export type VitaminDDayStats = z.infer<typeof VitaminDDayStatsSchema>;
export type VitaminDStatsTotals = z.infer<typeof VitaminDStatsTotalsSchema>;
