export interface Fulfilled<T> {
  status: 'fulfilled';
  value: T;
}

export interface Rejected {
  status: 'rejected';
  reason: unknown;
}

/** The outcome of one function passed to `sequentialAllSettled`, like `Promise.allSettled`. */
export type Result<T> = Fulfilled<T> | Rejected;

/**
 * A function in the list passed to `sequentialAllSettled`. It receives the outcomes so far, and
 * returns the next value or a promise for it.
 */
export type SequentialAllSettledTask<T> = (results: Result<T>[]) => T | PromiseLike<T>;

/**
 * Call each function in `tasks` in order, waiting for each one's promise to settle before calling
 * the next. Each function receives the outcomes so far.
 *
 * Unlike `sequential`, it keeps going when a promise rejects or a function throws. Resolves with
 * the outcome of every function, in order, in the same shape as `Promise.allSettled`.
 */
export const sequentialAllSettled = async <T>(
  tasks: readonly SequentialAllSettledTask<T>[],
): Promise<Result<T>[]> => {
  const results: Result<T>[] = [];

  for (const task of tasks) {
    try {
      // Pass a copy, so a function can't change the outcomes the others see.
      results.push({ status: 'fulfilled', value: await task([...results]) });
    } catch (reason) {
      results.push({ status: 'rejected', reason });
    }
  }

  return results;
};
