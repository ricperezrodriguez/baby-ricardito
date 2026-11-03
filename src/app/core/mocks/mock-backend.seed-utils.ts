export const SEED_BABY_ID = 'baby-1';

export const MS_PER_MINUTE = 60_000;

/** Deterministic pseudo-random sequence so the older history looks the same on every run. */
export function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}
