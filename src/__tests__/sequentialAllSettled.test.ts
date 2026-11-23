import { describe, expect, it } from 'vitest';

import { sequentialAllSettled, type Result } from '../index';

const later = <T>(value: T, ms = 1) =>
  new Promise<T>((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, ms);
  });

describe('sequentialAllSettled', () => {
  it('resolves with the outcome of every function, in order', async () => {
    await expect(
      sequentialAllSettled([
        () => later('a'),
        () => Promise.reject(new Error('oops')),
        () => later('c'),
      ]),
    ).resolves.toStrictEqual([
      { status: 'fulfilled', value: 'a' },
      { status: 'rejected', reason: new Error('oops') },
      { status: 'fulfilled', value: 'c' },
    ]);
  });

  it('keeps going when a function throws', async () => {
    const results = await sequentialAllSettled([
      () => {
        throw new Error('thrown');
      },
      () => 'after',
    ]);

    expect(results).toStrictEqual([
      { status: 'rejected', reason: new Error('thrown') },
      { status: 'fulfilled', value: 'after' },
    ]);
  });

  it('matches the shape of Promise.allSettled', async () => {
    const tasks = [() => Promise.resolve(1), () => Promise.reject(new Error('no'))];

    await expect(sequentialAllSettled(tasks)).resolves.toStrictEqual(
      await Promise.allSettled(tasks.map((task) => task())),
    );
  });

  it('waits for each promise before calling the next function', async () => {
    const events: string[] = [];
    const task =
      (name: string, fail = false) =>
      async () => {
        events.push(`start ${name}`);
        await later(null);
        events.push(`end ${name}`);

        if (fail) {
          throw new Error(name);
        }

        return name;
      };

    await sequentialAllSettled([task('one'), task('two', true), task('three')]);

    expect(events).toStrictEqual([
      'start one',
      'end one',
      'start two',
      'end two',
      'start three',
      'end three',
    ]);
  });

  it('passes each function the outcomes so far', async () => {
    const seen: Result<string>[][] = [];

    await sequentialAllSettled<string>([
      (results) => {
        seen.push(results);

        return 'a';
      },
      (results) => {
        seen.push(results);

        throw new Error('b');
      },
      (results) => {
        seen.push(results);

        return 'c';
      },
    ]);

    expect(seen).toStrictEqual([
      [],
      [{ status: 'fulfilled', value: 'a' }],
      [
        { status: 'fulfilled', value: 'a' },
        { status: 'rejected', reason: new Error('b') },
      ],
    ]);
  });

  it('resolves with an empty list when there are no functions', async () => {
    await expect(sequentialAllSettled([])).resolves.toStrictEqual([]);
  });
});
