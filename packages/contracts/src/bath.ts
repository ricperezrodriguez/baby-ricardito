import { z } from 'zod';
import {
  IsoDateTimeInputSchema,
  IsoDateTimeSchema,
  PageQuerySchema,
  alertSettingsSchema,
  historyPreferencesSchema,
  notesSchema,
  pageSchema,
} from './common';

export const BATH_NOTES_MAX_LENGTH = 500;

/** How the baby reacted to the bath. */
export const BATH_REACTIONS = ['happy', 'neutral', 'sad'] as const;
export const BathReactionSchema = z.enum(BATH_REACTIONS).meta({ id: 'BathReaction' });
export type BathReaction = z.infer<typeof BathReactionSchema>;

export const BATH_ERROR_CODES = {
  bathedAt: 'INVALID_DATE_FORMAT',
  hairWashed: 'INVALID_HAIR_WASHED',
  reaction: 'INVALID_REACTION',
  notes: 'INVALID_NOTES',
  '*': 'INVALID_BODY',
} as const;

/** Bath: a single instant and whether the hair was washed. */
export const BathSchema = z
  .object({
    id: z.string(),
    babyId: z.string(),
    bathedAt: IsoDateTimeSchema.meta({ description: 'Never in the future.' }),
    hairWashed: z.boolean(),
    reaction: BathReactionSchema.optional().meta({ description: 'Absent when it was not recorded.' }),
    notes: notesSchema(BATH_NOTES_MAX_LENGTH).optional().meta({ description: 'Absent when there are none.' }),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .meta({ id: 'Bath' });

export type Bath = z.infer<typeof BathSchema>;

export const CreateBathSchema = z
  .object({
    bathedAt: IsoDateTimeInputSchema,
    hairWashed: z.boolean(),
    reaction: BathReactionSchema.optional(),
    notes: notesSchema(BATH_NOTES_MAX_LENGTH).optional().meta({ description: 'An empty string means no notes.' }),
  })
  .meta({ id: 'CreateBath' });

export type CreateBath = z.infer<typeof CreateBathSchema>;

/** Omitted fields keep their value; a null `reaction` and an empty or null `notes` clear them. */
export const UpdateBathSchema = z
  .object({
    bathedAt: IsoDateTimeInputSchema.optional(),
    hairWashed: z.boolean().optional(),
    reaction: BathReactionSchema.nullable().optional(),
    notes: notesSchema(BATH_NOTES_MAX_LENGTH).nullable().optional(),
  })
  .meta({ id: 'UpdateBath' });

export type UpdateBath = z.infer<typeof UpdateBathSchema>;

export const BathsPageSchema = pageSchema(BathSchema, 'BathsPage');

export const BathQuerySchema = PageQuerySchema;

export const BATH_HISTORY_CHART_IDS = ['calendar', 'intervals', 'hairSplit'] as const;

export const BathHistoryPreferencesSchema = historyPreferencesSchema(
  BATH_HISTORY_CHART_IDS,
  'BathHistoryPreferences',
);

/** Days without a bath after which the "overdue" alert can show. */
export const BATH_OVERDUE_ALERT_THRESHOLDS = [2, 3, 4, 7] as const;

export const BathOverdueAlertSettingsSchema = alertSettingsSchema(
  'thresholdDays',
  BATH_OVERDUE_ALERT_THRESHOLDS,
  'BathOverdueAlertSettings',
  '"Bath overdue" alert, stored per baby.',
);

export const DEFAULT_BATH_OVERDUE_ALERT_SETTINGS = { enabled: true, thresholdDays: 3 } as const;

export const BathDayStatsSchema = z
  .object({
    date: z.string().meta({ example: '2026-11-18', description: 'Local day, yyyy-MM-dd.' }),
    baths: z.number().int(),
    hairWashes: z.number().int().meta({ description: 'Baths of the day with the hair washed.' }),
  })
  .meta({ id: 'BathDayStats' });

export const BathIntervalSchema = z
  .object({
    date: z.string().meta({ description: 'Local day of the most recent bath, yyyy-MM-dd.' }),
    days: z.number().int().meta({ description: 'Whole local days since the previous bath.' }),
  })
  .meta({ id: 'BathInterval' });

export const BathStatsTotalsSchema = z
  .object({
    baths: z.number().int(),
    daysWithBath: z.number().int(),
    daysInRange: z.number().int(),
    hairWashes: z.number().int(),
    averageIntervalDays: z.number().nullable().meta({ description: 'One decimal; null without intervals.' }),
    longestIntervalDays: z.number().int().nullable(),
    lastBathAt: IsoDateTimeSchema.nullable().meta({ description: 'Whole history, not the range.' }),
    lastHairWashAt: IsoDateTimeSchema.nullable().meta({ description: 'Whole history, not the range.' }),
  })
  .meta({ id: 'BathStatsTotals' });

export const BathStatsSchema = z
  .object({
    from: z.string(),
    to: z.string(),
    timeZone: z.string(),
    days: z.array(BathDayStatsSchema),
    intervals: z.array(BathIntervalSchema),
    totals: BathStatsTotalsSchema,
  })
  .meta({ id: 'BathStats' });

export type BathStats = z.infer<typeof BathStatsSchema>;
export type BathDayStats = z.infer<typeof BathDayStatsSchema>;
export type BathInterval = z.infer<typeof BathIntervalSchema>;
export type BathStatsTotals = z.infer<typeof BathStatsTotalsSchema>;
