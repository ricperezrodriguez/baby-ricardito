import { firstValueFrom, Observable } from 'rxjs';

/** Runs a backend write after all the ones enqueued before it, resolving with its result. */
export type WriteQueue = <T>(job: () => Observable<T>) => Promise<T>;

/**
 * Backend writes of a record dialog run one after another so rapid changes never race each other.
 * A failed write rejects only its own promise; the next one still runs.
 */
export function createWriteQueue(): WriteQueue {
  let queue: Promise<unknown> = Promise.resolve();

  return <T>(job: () => Observable<T>): Promise<T> => {
    const result = queue.then(() => firstValueFrom(job()));
    queue = result.catch(() => undefined);
    return result;
  };
}
