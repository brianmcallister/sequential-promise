interface Fulfilled<T> {
  status: 'fulfilled';
  value: T;
}

interface Rejected {
  status: 'rejected';
  reason: unknown;
}

export type Result<T> = Fulfilled<T> | Rejected

/**
 * Run an array of functions that return promises sequentially, but as
 * opposed to `sequential`, this will run everything, whether or
 * not the promises resolve or reject.
 *
 * The final returned promise will resolve with an array of results,
 * which will include an `isError` boolean.
 *
 * The resolved or rejected value will be set to the `payload` key
 * of the results object.
 *
 * This is based on the forthcoming `Promise.allSettled`:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
 */
export const sequentialAllSettled = <T>(funcs: ((list: Result<T>[]) => Promise<T>)[]) => {
  return funcs.reduce<Promise<Result<T>[]>>(async (acc, next) => {
    const list = await acc;
    let result;

    try {
      result = {
        status: 'fulfilled',
        value: await next(list),
      } as const;

    } catch (err) {
      result = {
        status: 'rejected',
        reason: err,
      } as const;
    }

    return Promise.resolve([...list, result]);
  }, Promise.resolve([]));
};
