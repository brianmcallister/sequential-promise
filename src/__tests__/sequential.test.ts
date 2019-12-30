import { sequential } from '../sequential';

describe('sequential', () => {
  it('should handle a list functions that all resolve', async () => {
    const promises = [
      () => Promise.resolve('test1'),
      () => Promise.resolve('test2'),
    ];

    const results = await sequential(promises);

    expect(results).toStrictEqual(['test1', 'test2']);
  });

  it('should handle a list of functions where some reject', async () => {
    const promises = [
      () => Promise.reject('failed'),
      () => Promise.resolve('test2'),
    ];

    try {
      await sequential(promises);
    } catch (err) {
      expect(err).toStrictEqual('failed');
    }
  });

  it('should run all promises sequentially', async (done) => {
    const createPromise = (val: string) => new Promise(resolve => {
      setTimeout(resolve.bind(null, val), 1);
    });
    const one = jest.fn(list => {
      expect(list).toStrictEqual([]);
      expect(two).not.toHaveBeenCalled();
      expect(three).not.toHaveBeenCalled();

      return createPromise('test1');
    });
    const two = jest.fn(list => {
      expect(list).toStrictEqual(['test1']);
      expect(one).toHaveBeenCalled();
      expect(three).not.toHaveBeenCalled();

      return createPromise('test2');
    });
    const three = jest.fn(list => {
      expect(list).toStrictEqual(['test1', 'test2']);
      expect(one).toHaveBeenCalled();
      expect(two).toHaveBeenCalled();

      return createPromise('test3');
    });

    const results = await sequential([one, two, three]);

    expect(results).toStrictEqual(['test1', 'test2', 'test3']);

    done();
  });
});
