import { z } from 'zod';

/** Hours without a feed after which the combined alert shows. */
export const FEEDING_OVERDUE_ALERT_THRESHOLDS = [1, 1.5, 2, 2.5, 3, 3.5, 4] as const;

export const FeedingOverdueAlertSettingsSchema = z
  .object({
    enabled: z.boolean(),
    thresholdHours: z.literal(FEEDING_OVERDUE_ALERT_THRESHOLDS).meta({ enum: [...FEEDING_OVERDUE_ALERT_THRESHOLDS] }),
  })
  .meta({
    id: 'FeedingOverdueAlertSettings',
    description: '"Too long since the last feed" alert (breastfeeding and bottle together), stored per baby.',
  });

export type FeedingOverdueAlertSettings = z.infer<typeof FeedingOverdueAlertSettingsSchema>;

export const DEFAULT_FEEDING_OVERDUE_ALERT_SETTINGS: FeedingOverdueAlertSettings = {
  enabled: true,
  thresholdHours: 3,
};
