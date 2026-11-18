/** Load state of any data shown on screen; `AsyncState` renders the matching UI. */
export type LoadStatus = 'loading' | 'empty' | 'loaded' | 'error';

/**
 * Status of a resource whose last value is kept while newer ones load (e.g. a `linkedSignal` over an
 * `rxResource`): a value that is already shown always wins over a later error or reload.
 */
export function resourceStatus(value: unknown, error: unknown): LoadStatus {
  if (value !== undefined) {
    return 'loaded';
  }
  return error ? 'error' : 'loading';
}
