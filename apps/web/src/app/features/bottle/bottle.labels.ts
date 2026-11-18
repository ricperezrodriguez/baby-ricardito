import { BottleMilkType } from '@app/features/bottle/bottle.models';

/** Spanish copy of the milk types, shared by every bottle view. */
export const BOTTLE_MILK_TYPE_LABELS: Record<BottleMilkType, string> = {
  breast_milk: 'Leche materna',
  formula: 'Fórmula',
  mixed: 'Mixta',
};

/** Amount of milk as shown to the user, e.g. `120 ml`. */
export function formatMl(amountMl: number): string {
  return `${amountMl} ml`;
}
