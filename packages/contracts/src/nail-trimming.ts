import { z } from 'zod';
import {
  IsoDateTimeInputSchema,
  IsoDateTimeSchema,
  PageQuerySchema,
  alertSettingsSchema,
  coded,
  historyPreferencesSchema,
  notesSchema,
  pageSchema,
} from './common';

export const NAIL_TRIM_NOTES_MAX_LENGTH = 500;

/** Zones whose nails can be trimmed, in display order. */
export const NAIL_AREAS = ['hands', 'feet'] as const;
export const NailAreaSchema = z.enum(NAIL_AREAS).meta({ id: 'NailArea' });
export type NailTrimArea = z.infer<typeof NailAreaSchema>;

export const NAIL_TRIM_ERROR_CODES = {
  trimmedAt: 'INVALID_DATE_FORMAT',
  areas: 'INVALID_AREAS',
  notes: 'INVALID_NOTES',
  '*': 'INVALID_BODY',
} as const;

/** Non-empty, no duplicates; normalized to `NAIL_AREAS` order. */
const areasInputSchema = z
  .array(NailAreaSchema)
  .min(1)
  .refine(
    (areas) => new Set(areas).size === areas.length,
    coded('INVALID_AREAS', '"areas" must not contain duplicates.'),
  )
  .transform((areas) => NAIL_AREAS.filter((area) => areas.includes(area)))
  .meta({ type: 'array', items: { $ref: '#/components/schemas/NailArea' }, minItems: 1, uniqueItems: true });

/** Nail trim: a single instant and the zones trimmed. */
export const NailTrimSchema = z
  .object({
    id: z.string(),
    babyId: z.string(),
    trimmedAt: IsoDateTimeSchema.meta({ description: 'Never in the future.' }),
    areas: z.array(NailAreaSchema).meta({ description: 'Non-empty, no duplicates, in `hands`, `feet` order.' }),
    notes: notesSchema(NAIL_TRIM_NOTES_MAX_LENGTH).optional().meta({ description: 'Absent when there are none.' }),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .meta({ id: 'NailTrim' });

export type NailTrim = z.infer<typeof NailTrimSchema>;

export const CreateNailTrimSchema = z
  .object({
    trimmedAt: IsoDateTimeInputSchema,
    areas: areasInputSchema,
    notes: notesSchema(NAIL_TRIM_NOTES_MAX_LENGTH).optional().meta({ description: 'An empty string means no notes.' }),
  })
  .meta({ id: 'CreateNailTrim' });

export type CreateNailTrim = z.infer<typeof CreateNailTrimSchema>;

/** Omitted fields keep their value; `areas` replaces the whole list; an empty or null `notes` clears them. */
export const UpdateNailTrimSchema = z
  .object({
    trimmedAt: IsoDateTimeInputSchema.optional(),
    areas: areasInputSchema.optional(),
    notes: notesSchema(NAIL_TRIM_NOTES_MAX_LENGTH).nullable().optional(),
  })
  .meta({ id: 'UpdateNailTrim' });

export type UpdateNailTrim = z.infer<typeof UpdateNailTrimSchema>;

export const NailTrimsPageSchema = pageSchema(NailTrimSchema, 'NailTrimsPage');

export const NailTrimQuerySchema = PageQuerySchema;

export const NAIL_TRIMMING_HISTORY_CHART_IDS = ['calendar', 'intervals', 'areaSplit'] as const;

export const NailTrimmingHistoryPreferencesSchema = historyPreferencesSchema(
  NAIL_TRIMMING_HISTORY_CHART_IDS,
  'NailTrimmingHistoryPreferences',
);

/** Days without trimming after which the "overdue" alert can show. */
export const NAIL_TRIM_OVERDUE_ALERT_THRESHOLDS = [5, 7, 10, 14] as const;

export const NailTrimOverdueAlertSettingsSchema = alertSettingsSchema(
  'thresholdDays',
  NAIL_TRIM_OVERDUE_ALERT_THRESHOLDS,
  'NailTrimOverdueAlertSettings',
  '"Nails overdue" alert, stored per baby.',
);

export const DEFAULT_NAIL_TRIM_OVERDUE_ALERT_SETTINGS = { enabled: true, thresholdDays: 7 } as const;

export const NailTrimDayStatsSchema = z
  .object({
    date: z.string().meta({ example: '2026-11-18', description: 'Local day, yyyy-MM-dd.' }),
    trims: z.number().int(),
    hands: z.number().int().meta({ description: 'A hands+feet trim counts in both `hands` and `feet`.' }),
    feet: z.number().int(),
  })
  .meta({ id: 'NailTrimDayStats' });

export const NailTrimIntervalSchema = z
  .object({
    date: z.string().meta({ description: 'Local day of the most recent trim, yyyy-MM-dd.' }),
    area: NailAreaSchema,
    days: z.number().int().meta({ description: 'Whole local days since the previous trim of the same zone.' }),
  })
  .meta({ id: 'NailTrimInterval' });

export const NailTrimmingStatsTotalsSchema = z
  .object({
    trims: z.number().int(),
    handsOnly: z.number().int(),
    feetOnly: z.number().int(),
    both: z.number().int(),
    averageHandsIntervalDays: z.number().nullable().meta({ description: 'One decimal; null without intervals.' }),
    averageFeetIntervalDays: z.number().nullable(),
    longestIntervalDays: z.number().int().nullable(),
    lastHandsAt: IsoDateTimeSchema.nullable().meta({ description: 'Whole history, not the range.' }),
    lastFeetAt: IsoDateTimeSchema.nullable(),
  })
  .meta({ id: 'NailTrimmingStatsTotals' });

export const NailTrimmingStatsSchema = z
  .object({
    from: z.string(),
    to: z.string(),
    timeZone: z.string(),
    days: z.array(NailTrimDayStatsSchema),
    intervals: z.array(NailTrimIntervalSchema),
    totals: NailTrimmingStatsTotalsSchema,
  })
  .meta({ id: 'NailTrimmingStats' });

export type NailTrimmingStats = z.infer<typeof NailTrimmingStatsSchema>;
export type NailTrimDayStats = z.infer<typeof NailTrimDayStatsSchema>;
export type NailTrimInterval = z.infer<typeof NailTrimIntervalSchema>;
export type NailTrimmingStatsTotals = z.infer<typeof NailTrimmingStatsTotalsSchema>;
