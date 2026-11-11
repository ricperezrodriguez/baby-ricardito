/** A kind of push notification the user can turn on or off from the side menu. */
export interface PushNotificationType {
  /** Stable identifier: stored in the preferences and used as the notification tag. */
  readonly id: string;
  /** Material Symbols icon of the setting row. */
  readonly icon: string;
  /** Spanish label of the setting, e.g. `Toma de lactancia en curso`. */
  readonly label: string;
  /** Spanish one-line explanation shown under the label. */
  readonly description: string;
}

/** Every push notification of the app, in the order shown in the side menu. Add new features here. */
export const PUSH_NOTIFICATION_TYPES = [
  {
    id: 'breastfeeding-live',
    icon: 'timer',
    label: 'Toma de lactancia en curso',
    description: 'Con botones para cada teta',
  },
] as const satisfies readonly PushNotificationType[];

export type PushNotificationTypeId = (typeof PUSH_NOTIFICATION_TYPES)[number]['id'];
