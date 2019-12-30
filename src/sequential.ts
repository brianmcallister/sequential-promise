/**
 * Broken out reducer function to do the work
 * of waiting for a promise to resolve, and adding
 * it to the array of results.
 */
const simpleReducer = async <T>(
  acc: Promise<T[]>,
  next: () => Promise<T>
) => Promise.resolve([...(await acc), await next()]);

/**
 * Run an array of functions that return promises in order,
 * waiting for each returned promise to resolve before running
 * the next function.
 *
 * This works very similarlly to `Promise.all`, in that if one
 * of the promises rejects, everything will stop.
 */
export const sequential = <T>(funcs: (() => Promise<T>)[]) => {
  return funcs.reduce<Promise<T[]>>(simpleReducer, Promise.resolve([]));
};
