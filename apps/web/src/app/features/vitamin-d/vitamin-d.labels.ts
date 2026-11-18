/** Drops of a dose as shown to the user: `1 gota`, `3 gotas`. */
export function formatDrops(drops: number): string {
  return drops === 1 ? '1 gota' : `${drops} gotas`;
}

/** Number of doses as shown to the user: `1 toma`, `2 tomas`. */
export function formatDoseCount(doses: number): string {
  return doses === 1 ? '1 toma' : `${doses} tomas`;
}
