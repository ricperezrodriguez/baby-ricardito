import { NAIL_AREAS, NailTrimArea } from '@app/features/nail-trimming/nail-trimming.models';

/** Spanish copy of the trimmed zones, shared by every nail trimming view. */
export const NAIL_AREA_LABELS: Record<NailTrimArea, string> = {
  hands: 'Manos',
  feet: 'Pies',
};

/** Zones of a trim as shown to the user: `Manos`, `Pies`, `Manos y pies`. */
export function formatNailAreas(areas: readonly NailTrimArea[]): string {
  const [first, ...rest] = NAIL_AREAS.filter((area) => areas.includes(area));
  if (first === undefined) {
    return '';
  }
  return [
    NAIL_AREA_LABELS[first],
    ...rest.map((area) => NAIL_AREA_LABELS[area].toLowerCase()),
  ].join(' y ');
}

/** Number of trims as shown to the user: `1 corte`, `2 cortes`. */
export function formatNailTrimCount(trims: number): string {
  return trims === 1 ? '1 corte' : `${trims} cortes`;
}
