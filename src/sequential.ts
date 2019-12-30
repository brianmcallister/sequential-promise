/**
 * Broken out reducer function to do the work
 * of waiting for a promise to resolve, and adding
 * it to the array of results.
 */
const simpleReducer = async <T>(
  acc: Promise<T[]>,
  next: (list: T[]) => Promise<T>
) => {
  const list = await acc;
  return Promise.resolve([...list, await next(list)]);
};

/**
 * Run an array of functions that return promises in order,
 * waiting for each returned promise to resolve before running
 * the next function.
 *
 * This works very similarlly to `Promise.all`, in that if one
 * of the promises rejects, everything will stop.
 */
export const sequential = <T>(funcs: ((list: T[]) => Promise<T>)[]) => {
  return funcs.reduce<Promise<T[]>>(simpleReducer, Promise.resolve([]));
};
