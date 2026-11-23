import { z } from 'zod';
import {
  HourMapSchema,
  IsoDateTimeInputSchema,
  IsoDateTimeSchema,
  PageQuerySchema,
  historyPreferencesSchema,
  notesSchema,
  pageSchema,
} from './common';

export const BOTTLE_MILK_TYPES = ['breast_milk', 'formula', 'mixed'] as const;
export const BottleMilkTypeSchema = z.enum(BOTTLE_MILK_TYPES).meta({
  id: 'BottleMilkType',
  description: 'What the bottle contains: expressed breast milk, formula, or a mix of both.',
});
export type BottleMilkType = z.infer<typeof BottleMilkTypeSchema>;

export const BOTTLE_NOTES_MAX_LENGTH = 500;
export const BOTTLE_AMOUNT_MIN_ML = 1;
export const BOTTLE_AMOUNT_MAX_ML = 500;

const amountMlSchema = z
  .number()
  .int()
  .min(BOTTLE_AMOUNT_MIN_ML)
  .max(BOTTLE_AMOUNT_MAX_ML)
  .meta({ example: 120, description: 'Whole millilitres.' });

/** Error codes of the bottle endpoints per failing field. */
export const BOTTLE_ERROR_CODES = {
  fedAt: 'INVALID_DATE_FORMAT',
  amountMl: 'INVALID_AMOUNT',
  milkType: 'INVALID_MILK_TYPE',
  notes: 'INVALID_NOTES',
  '*': 'INVALID_BODY',
} as const;

/** Bottle feed: a single instant with the amount taken. */
export const BottleFeedSchema = z
  .object({
    id: z.string(),
    babyId: z.string(),
    fedAt: IsoDateTimeSchema.meta({ description: 'Never in the future.' }),
    amountMl: amountMlSchema,
    milkType: BottleMilkTypeSchema,
    notes: notesSchema(BOTTLE_NOTES_MAX_LENGTH).optional().meta({ description: 'Absent when there are none.' }),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .meta({ id: 'BottleFeed' });

export type BottleFeed = z.infer<typeof BottleFeedSchema>;

export const CreateBottleFeedSchema = z
  .object({
    fedAt: IsoDateTimeInputSchema,
    amountMl: amountMlSchema,
    milkType: BottleMilkTypeSchema,
    notes: notesSchema(BOTTLE_NOTES_MAX_LENGTH).optional(),
  })
  .meta({ id: 'CreateBottleFeed' });

export type CreateBottleFeed = z.infer<typeof CreateBottleFeedSchema>;

/** Omitted fields keep their value; an empty `notes` clears them. */
export const UpdateBottleFeedSchema = CreateBottleFeedSchema.partial().meta({ id: 'UpdateBottleFeed' });

export type UpdateBottleFeed = z.infer<typeof UpdateBottleFeedSchema>;

export const BottleFeedsQuerySchema = PageQuerySchema.extend({
  milkType: z
    .union([BottleMilkTypeSchema, z.array(BottleMilkTypeSchema)])
    .optional()
    .transform((value): BottleMilkType[] => (value === undefined ? [] : [...new Set([value].flat())]))
    .meta({ description: 'Repeatable. Only feeds of these milk types; every type when omitted.' }),
});

export type BottleFeedsQuery = z.infer<typeof BottleFeedsQuerySchema>;

export const BottleFeedsPageSchema = pageSchema(BottleFeedSchema, 'BottleFeedsPage');

export const BOTTLE_HISTORY_CHART_IDS = [
  'feedsPerDay',
  'mlPerDay',
  'averageAmount',
  'averageInterval',
  'hourMap',
] as const;

export const BottleHistoryPreferencesSchema = historyPreferencesSchema(
  BOTTLE_HISTORY_CHART_IDS,
  'BottleHistoryPreferences',
);

export type BottleHistoryPreferences = z.infer<typeof BottleHistoryPreferencesSchema>;

export const BottleDayStatsSchema = z
  .object({
    date: z.string().meta({ example: '2026-11-18', description: 'Local day, yyyy-MM-dd.' }),
    feeds: z.number().int(),
    totalMl: z.number().int(),
    averageAmountMl: z.number().int().nullable().meta({ description: 'Rounded; null without feeds.' }),
    averageIntervalSeconds: z.number().int().nullable().meta({
      description: 'Start to start against the previous feed (even from the day before); null without a previous feed.',
    }),
  })
  .meta({ id: 'BottleDayStats' });

export type BottleDayStats = z.infer<typeof BottleDayStatsSchema>;

export const BottleStatsTotalsSchema = z
  .object({
    feeds: z.number().int(),
    totalMl: z.number().int(),
    breastMilkMl: z.number().int(),
    formulaMl: z.number().int(),
    mixedMl: z.number().int(),
    averageDailyMl: z.number().int().nullable().meta({ description: 'Over every day of the range, empty ones included.' }),
    averageFeedsPerDay: z.number().nullable().meta({ description: 'One decimal.' }),
    averageAmountMl: z.number().int().nullable(),
    averageIntervalSeconds: z.number().int().nullable(),
  })
  .meta({ id: 'BottleStatsTotals' });

export type BottleStatsTotals = z.infer<typeof BottleStatsTotalsSchema>;

export const BottleStatsSchema = z
  .object({
    from: z.string().meta({ example: '2026-11-01' }),
    to: z.string().meta({ example: '2026-11-07' }),
    timeZone: z.string().meta({ example: 'Europe/Madrid' }),
    days: z.array(BottleDayStatsSchema).meta({ description: 'One entry per local day of the range, zeros included.' }),
    totals: BottleStatsTotalsSchema,
    hourMap: HourMapSchema.meta({ description: 'Feeds per weekday (0 = Monday) and hour of the day.' }),
  })
  .meta({ id: 'BottleStats' });

export type BottleStats = z.infer<typeof BottleStatsSchema>;
