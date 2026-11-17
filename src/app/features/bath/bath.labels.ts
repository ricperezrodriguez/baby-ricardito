import { BathReaction } from '@app/features/bath/bath.models';

const DAYS_FORMAT = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });

const BATH_REACTION_LABELS: Record<BathReaction, string> = {
  happy: 'Contento',
  neutral: 'Neutro',
  sad: 'Triste',
};

/** Material Symbols icon of each reaction (shared by `BathReactionIcon` and the dialog selector). */
export const BATH_REACTION_ICONS: Record<BathReaction, string> = {
  happy: 'sentiment_satisfied',
  neutral: 'sentiment_neutral',
  sad: 'sentiment_dissatisfied',
};

/** Reaction as told to assistive technologies (no visible text): `Contento`, `Neutro`, `Triste`. */
export function formatBathReaction(reaction: BathReaction): string {
  return BATH_REACTION_LABELS[reaction];
}

/** Hair wash of a bath as shown to the user: `Con pelo`, `Sin pelo`. */
export function formatHairWashed(hairWashed: boolean): string {
  return hairWashed ? 'Con pelo' : 'Sin pelo';
}

/** Number of baths as shown to the user: `1 baño`, `2 baños`. */
export function formatBathCount(baths: number): string {
  return baths === 1 ? '1 baño' : `${baths} baños`;
}

/** Days between baths as shown to the user, up to one decimal: `1 día`, `2,5 días`. */
export function formatBathIntervalDays(days: number): string {
  return `${DAYS_FORMAT.format(days)} ${days === 1 ? 'día' : 'días'}`;
}
