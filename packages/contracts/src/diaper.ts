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

export const DIAPER_NOTES_MAX_LENGTH = 500;

export const DIAPER_TYPES = ['wet', 'dirty', 'both'] as const;
export const DiaperTypeSchema = z.enum(DIAPER_TYPES).meta({
  id: 'DiaperType',
  description: 'Content of the diaper (exclusive): only pee, only poop, or both.',
});
export type DiaperType = z.infer<typeof DiaperTypeSchema>;

export const STOOL_COLORS = ['yellow', 'green', 'brown', 'black', 'red', 'white'] as const;
export const StoolColorSchema = z.enum(STOOL_COLORS).meta({ id: 'StoolColor' });
export type StoolColor = z.infer<typeof StoolColorSchema>;

/** `mucous` means "con moco". */
export const STOOL_CONSISTENCIES = ['liquid', 'soft', 'mucous', 'firm'] as const;
export const StoolConsistencySchema = z.enum(STOOL_CONSISTENCIES).meta({ id: 'StoolConsistency' });
export type StoolConsistency = z.infer<typeof StoolConsistencySchema>;

export const DIAPER_ERROR_CODES = {
  changedAt: 'INVALID_DATE_FORMAT',
  type: 'INVALID_DIAPER_TYPE',
  stoolColor: 'INVALID_STOOL_COLOR',
  stoolConsistency: 'INVALID_STOOL_CONSISTENCY',
  hasRash: 'INVALID_HAS_RASH',
  notes: 'INVALID_NOTES',
  '*': 'INVALID_BODY',
} as const;

/** Diaper change. */
export const DiaperChangeSchema = z
  .object({
    id: z.string(),
    babyId: z.string(),
    changedAt: IsoDateTimeSchema.meta({ description: 'Never in the future.' }),
    type: DiaperTypeSchema,
    stoolColor: StoolColorSchema.nullable().meta({ description: 'Only for `dirty` and `both`; null for `wet`.' }),
    stoolConsistency: StoolConsistencySchema.nullable().meta({
      description: 'Only for `dirty` and `both`; null for `wet`.',
    }),
    hasRash: z.boolean(),
    notes: notesSchema(DIAPER_NOTES_MAX_LENGTH).optional().meta({ description: 'Absent when there are none.' }),
    photoUrl: z.string().optional().meta({ description: 'Absent when the change has no photo.' }),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .meta({ id: 'DiaperChange' });

export type DiaperChange = z.infer<typeof DiaperChangeSchema>;

export const CreateDiaperChangeSchema = z
  .object({
    changedAt: IsoDateTimeInputSchema,
    type: DiaperTypeSchema,
    stoolColor: StoolColorSchema.nullable().optional(),
    stoolConsistency: StoolConsistencySchema.nullable().optional(),
    hasRash: z.boolean().optional().meta({ description: 'Defaults to false.' }),
    notes: notesSchema(DIAPER_NOTES_MAX_LENGTH).optional(),
  })
  .meta({
    id: 'CreateDiaperChange',
    description: 'Stool fields with `type: wet` are rejected with 422 `STOOL_DETAILS_NOT_ALLOWED`.',
  });

export type CreateDiaperChange = z.infer<typeof CreateDiaperChangeSchema>;

/** Omitted fields keep their value; when switching to `wet` send `stoolColor` and `stoolConsistency` as null. */
export const UpdateDiaperChangeSchema = CreateDiaperChangeSchema.partial().meta({ id: 'UpdateDiaperChange' });

export type UpdateDiaperChange = z.infer<typeof UpdateDiaperChangeSchema>;

export const DiaperChangesQuerySchema = PageQuerySchema.extend({
  type: z
    .union([DiaperTypeSchema, z.array(DiaperTypeSchema)])
    .optional()
    .transform((value): DiaperType[] => (value === undefined ? [] : [...new Set([value].flat())]))
    .meta({ description: 'Repeatable. Only changes of these types; every type when omitted.' }),
});

export type DiaperChangesQuery = z.infer<typeof DiaperChangesQuerySchema>;

export const DiaperChangesPageSchema = pageSchema(DiaperChangeSchema, 'DiaperChangesPage');

export const DIAPER_HISTORY_CHART_IDS = [
  'changesPerDay',
  'typeSplit',
  'averageInterval',
  'stoolColors',
  'hourMap',
] as const;

export const DiaperHistoryPreferencesSchema = historyPreferencesSchema(
  DIAPER_HISTORY_CHART_IDS,
  'DiaperHistoryPreferences',
);

/** Hours without poop after which the alert can show. */
export const DIAPER_POOP_ALERT_THRESHOLDS = [12, 24, 36, 48, 72] as const;

export const DiaperPoopAlertSettingsSchema = alertSettingsSchema(
  'thresholdHours',
  DIAPER_POOP_ALERT_THRESHOLDS,
  'DiaperPoopAlertSettings',
  '"Too long without poop" alert, stored per baby.',
);

export const DEFAULT_DIAPER_POOP_ALERT_SETTINGS = { enabled: true, thresholdHours: 48 } as const;

export const DiaperDayStatsSchema = z
  .object({
    date: z.string().meta({ example: '2026-11-18', description: 'Local day, yyyy-MM-dd.' }),
    changes: z.number().int(),
    wet: z.number().int(),
    dirty: z.number().int(),
    both: z.number().int(),
    rashChanges: z.number().int(),
    averageIntervalSeconds: z.number().int().nullable().meta({
      description: 'Against the previous change, even from the day before; null without a previous change.',
    }),
  })
  .meta({ id: 'DiaperDayStats' });

export const DiaperStoolColorCountsSchema = z
  .object({
    yellow: z.number().int(),
    green: z.number().int(),
    brown: z.number().int(),
    black: z.number().int(),
    red: z.number().int(),
    white: z.number().int(),
    unspecified: z.number().int().meta({ description: 'Dirty or both changes without a color.' }),
  })
  .meta({ id: 'DiaperStoolColorCounts' });

export const DiaperStatsTotalsSchema = z
  .object({
    changes: z.number().int(),
    wet: z.number().int(),
    dirty: z.number().int(),
    both: z.number().int(),
    rashChanges: z.number().int(),
    averageChangesPerDay: z.number().nullable().meta({ description: 'One decimal; null without changes.' }),
    averageIntervalSeconds: z.number().int().nullable(),
    stoolColors: DiaperStoolColorCountsSchema,
  })
  .meta({ id: 'DiaperStatsTotals' });

export const DiaperStatsSchema = z
  .object({
    from: z.string(),
    to: z.string(),
    timeZone: z.string(),
    days: z.array(DiaperDayStatsSchema),
    totals: DiaperStatsTotalsSchema,
    hourMap: HourMapSchema,
  })
  .meta({ id: 'DiaperStats' });

export type DiaperStats = z.infer<typeof DiaperStatsSchema>;
export type DiaperDayStats = z.infer<typeof DiaperDayStatsSchema>;
export type DiaperStatsTotals = z.infer<typeof DiaperStatsTotalsSchema>;
export type DiaperStoolColorCounts = z.infer<typeof DiaperStoolColorCountsSchema>;
