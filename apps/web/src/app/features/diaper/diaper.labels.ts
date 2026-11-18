import { DiaperType, StoolColor, StoolConsistency } from '@app/features/diaper/diaper.models';

/** Spanish copy of the diaper enums, shared by every diaper view. */
export const DIAPER_TYPE_LABELS: Record<DiaperType, string> = {
  wet: 'Pis',
  dirty: 'Caca',
  both: 'Mixto',
};

export const STOOL_COLOR_LABELS: Record<StoolColor, string> = {
  yellow: 'Amarillo',
  green: 'Verde',
  brown: 'Marrón',
  black: 'Negro',
  red: 'Rojo',
  white: 'Blanco',
};

export const STOOL_CONSISTENCY_LABELS: Record<StoolConsistency, string> = {
  liquid: 'Líquida',
  soft: 'Blanda',
  mucous: 'Con moco',
  firm: 'Firme',
};
