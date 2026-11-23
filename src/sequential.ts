/**
 * A function in the list passed to `sequential`. It receives the results so far, and returns the
 * next result or a promise for it.
 */
export type SequentialTask<T> = (results: T[]) => T | PromiseLike<T>;

/**
 * Call each function in `tasks` in order, waiting for each one's promise to settle before calling
 * the next. Each function receives the results so far.
 *
 * Resolves with every result, in order. Like `Promise.all`, it rejects as soon as one promise
 * rejects, and the functions after it are never called.
 *
 *   const [user, orders] = await sequential([
 *     () => fetchUser(1),
 *     ([user]) => fetchOrders(user.id),
 *   ]);
 */
export const sequential = async <T>(tasks: readonly SequentialTask<T>[]): Promise<T[]> => {
  const results: T[] = [];

  for (const task of tasks) {
    // Pass a copy, so a function can't change the results the others see.
    results.push(await task([...results]));
  }

  return results;
};
