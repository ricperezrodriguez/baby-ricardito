import { z } from 'zod';

/** Customizes a failed `refine` so the API answers with a specific error `code`. */
export function coded(code: string, message: string): { error: string; params: { code: string } } {
  return { error: message, params: { code } };
}

/** Name of the multipart field that carries the photo file */
export const PHOTO_UPLOAD_FIELD = 'photo';

/** Photo limits shared by the forms and the API */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const ApiErrorSchema = z
  .object({
    code: z.string().meta({ example: 'ROUTE_NOT_FOUND' }),
    message: z.string(),
  })
  .meta({ id: 'ApiError', description: 'Error body returned with every 4xx/5xx status.' });

export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;

export const BabyParamsSchema = z.object({
  babyId: z.string().min(1).meta({ example: 'baby-1' }),
});

export const RecordParamsSchema = BabyParamsSchema.extend({
  recordId: z.string().min(1).meta({ example: '0198a1c2-7b3e-7d00-9a4e-3f6c1b2d5e80' }),
});

/** Integer query parameter (digits only) with a lower bound; `fallback` when it is omitted. */
function integerParam(name: string, minimum: number, fallback: number) {
  return z
    .string()
    .refine(
      (value) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) >= minimum,
      coded('INVALID_PAGINATION', `"${name}" must be an integer greater than or equal to ${minimum}.`),
    )
    .transform(Number)
    .default(fallback)
    .meta({ type: 'integer', minimum, default: fallback });
}

export const PageQuerySchema = z.object({
  limit: integerParam('limit', 1, 20),
  offset: integerParam('offset', 0, 0),
});

export type PageQuery = z.infer<typeof PageQuerySchema>;

export function pageSchema<T extends z.ZodType>(item: T, id: string) {
  return z
    .object({
      items: z.array(item),
      total: z.number().int(),
      limit: z.number().int(),
      offset: z.number().int(),
    })
    .meta({ id });
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;
export const MAX_STATS_RANGE_DAYS = 366;

/** Real calendar day formatted as `yyyy-MM-dd`. */
export function isDateKey(value: string): boolean {
  const match = DATE_KEY_PATTERN.exec(value);
  if (match === null) {
    return false;
  }
  const [, year, month, day] = match.map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!)).toISOString().slice(0, 10) === value;
}

export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function dateKeyParam(name: string) {
  return z
    .string()
    .refine(isDateKey, coded('INVALID_DATE_FORMAT', `"${name}" must be a valid date formatted as yyyy-MM-dd.`))
    .meta({ example: '2026-11-01' });
}

/** Query string of every `<tracker>/stats` endpoint. */
export const StatsQuerySchema = z
  .object({
    from: dateKeyParam('from').meta({ description: 'First local day (inclusive).' }),
    to: dateKeyParam('to').meta({ description: 'Last local day (inclusive).' }),
    tz: z
      .string()
      .refine(isTimeZone, coded('INVALID_TIME_ZONE', '"tz" must be a valid IANA time zone.'))
      .default('UTC')
      .meta({ example: 'Europe/Madrid', description: 'IANA time zone used to split records in days and hours.' }),
  })
  .refine(
    ({ from, to }) => !isDateKey(from) || !isDateKey(to) || Date.parse(to) >= Date.parse(from),
    coded('INVALID_RANGE', '"to" must not be earlier than "from".'),
  )
  .refine(
    ({ from, to }) =>
      !isDateKey(from) || !isDateKey(to) || (Date.parse(to) - Date.parse(from)) / MS_PER_DAY + 1 <= MAX_STATS_RANGE_DAYS,
    coded('INVALID_RANGE', `The range must not exceed ${MAX_STATS_RANGE_DAYS} days.`),
  );

export type StatsQuery = z.infer<typeof StatsQuerySchema>;

/** Records per weekday (0 = Monday ... 6 = Sunday) and hour of the day (0-23) */
export const HourMapSchema = z.array(z.array(z.number().int()).length(24)).length(7).meta({ id: 'HourMap' });

export type HourMap = z.infer<typeof HourMapSchema>;
