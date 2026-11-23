import { describe, expect, it, vi } from 'vitest';

import sequentialDefault, { sequential } from '../index';

const later = <T>(value: T, ms = 1) =>
  new Promise<T>((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, ms);
  });

describe('sequential', () => {
  it('is the default export', () => {
    expect(sequentialDefault).toBe(sequential);
  });

  it('resolves with every result, in order', async () => {
    await expect(sequential([() => later('a', 5), () => later('b', 1)])).resolves.toStrictEqual([
      'a',
      'b',
    ]);
  });

  it('resolves with an empty list when there are no functions', async () => {
    await expect(sequential([])).resolves.toStrictEqual([]);
  });

  it('waits for each promise before calling the next function', async () => {
    const events: string[] = [];
    const task = (name: string) => async () => {
      events.push(`start ${name}`);
      await later(null);
      events.push(`end ${name}`);

      return name;
    };

    await sequential([task('one'), task('two'), task('three')]);

    expect(events).toStrictEqual([
      'start one',
      'end one',
      'start two',
      'end two',
      'start three',
      'end three',
    ]);
  });

  it('passes each function the results so far', async () => {
    const seen: string[][] = [];
    const task = (value: string) => (results: string[]) => {
      seen.push(results);

      return later(value);
    };

    await sequential([task('a'), task('b'), task('c')]);

    expect(seen).toStrictEqual([[], ['a'], ['a', 'b']]);
  });

  it("doesn't let a function change the results", async () => {
    const results = await sequential<number>([
      () => 1,
      (previous) => {
        previous.push(99);

        return 2;
      },
    ]);

    expect(results).toStrictEqual([1, 2]);
  });

  it('accepts functions that return values instead of promises', async () => {
    await expect(sequential([() => 1, () => later(2), () => 3])).resolves.toStrictEqual([1, 2, 3]);
  });

  // Regression: this test used to pass even when nothing rejected.
  it('rejects with the first rejection, and stops calling functions', async () => {
    const after = vi.fn(() => 'never');

    await expect(
      sequential([() => later('a'), () => Promise.reject(new Error('oops')), after]),
    ).rejects.toThrow('oops');
    expect(after).not.toHaveBeenCalled();
  });

  it('rejects when a function throws', async () => {
    await expect(
      sequential([
        () => {
          throw new Error('thrown');
        },
      ]),
    ).rejects.toThrow('thrown');
  });

  it('handles long lists', async () => {
    const tasks = Array.from({ length: 10_000 }, (_, index) => () => index);

    const results = await sequential(tasks);

    expect(results).toHaveLength(10_000);
    expect(results[results.length - 1]).toBe(9_999);
  });
});
