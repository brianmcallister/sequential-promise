import { sequentialAllSettled } from '../sequentialAllSettled';

describe('sequentialAllSettled', () => {
  it('should handle a list functions that all resolve', async () => {
    const promises = [
      () => Promise.resolve('test1'),
      () => Promise.resolve('test2'),
    ];

    const results = await sequentialAllSettled(promises);

    expect(results).toStrictEqual([
      { status: 'fulfilled', value: 'test1' },
      { status: 'fulfilled', value: 'test2' },
    ]);
  });

  it('should handle a list of functions where some reject', async () => {
    const promises = [
      () => Promise.reject('failed'),
      () => Promise.resolve('test2'),
    ];

    const results = await sequentialAllSettled(promises);

    expect(results).toStrictEqual([
      { status: 'rejected', reason: 'failed' },
      { status: 'fulfilled', value: 'test2' },
    ]);
  });

  it('should run all promises sequentially', async done => {
    const createPromise = (val: string) =>
      new Promise(resolve => {
        setTimeout(resolve.bind(null, val), 1);
      });
    const one = jest.fn(list => {
      expect(list).toStrictEqual([]);
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      expect(two).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      expect(three).not.toHaveBeenCalled();

      return createPromise('test1');
    });
    const two = jest.fn(list => {
      expect(list).toStrictEqual([{ status: 'fulfilled', value: 'test1' }]);
      expect(one).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      expect(three).not.toHaveBeenCalled();

      return createPromise('test2');
    });
    const three = jest.fn(list => {
      expect(list).toStrictEqual([
        { status: 'fulfilled', value: 'test1' },
        { status: 'fulfilled', value: 'test2' },
      ]);
      expect(one).toHaveBeenCalled();
      expect(two).toHaveBeenCalled();

      return createPromise('test3');
    });

    const results = await sequentialAllSettled([one, two, three]);

    expect(results).toStrictEqual([
      { status: 'fulfilled', value: 'test1' },
      { status: 'fulfilled', value: 'test2' },
      { status: 'fulfilled', value: 'test3' },
    ]);

    done();
  });
});
