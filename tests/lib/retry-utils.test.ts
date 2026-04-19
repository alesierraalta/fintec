import { withExponentialBackoff } from '../../lib/utils/retry-utils';

describe('lib/utils/retry-utils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await withExponentialBackoff(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('FAIL'))
      .mockResolvedValueOnce('SUCCESS');

    const promise = withExponentialBackoff(fn, { attempts: 2, baseDelay: 100 });
    
    // Attempt 1 happens immediately
    await Promise.resolve(); 
    // Wait for the microtask to finish and trigger setTimeout
    await Promise.resolve();

    jest.runAllTimers();
    
    const result = await promise;
    expect(result).toBe('SUCCESS');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should fail after max attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('STILL_FAILING'));
    
    const promise = withExponentialBackoff(fn, { attempts: 3, baseDelay: 100 });
    
    // Attempt 1 fails -> wait
    await Promise.resolve();
    await Promise.resolve();
    jest.runAllTimers();

    // Attempt 2 fails -> wait
    await Promise.resolve();
    await Promise.resolve();
    jest.runAllTimers();

    await expect(promise).rejects.toThrow('STILL_FAILING');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff delay', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('FAIL1'))
      .mockRejectedValueOnce(new Error('FAIL2'))
      .mockResolvedValue('OK');

    const promise = withExponentialBackoff(fn, { 
      attempts: 3, 
      baseDelay: 1000, 
      maxDelay: 10000 
    });

    await Promise.resolve(); // first call
    await Promise.resolve(); // trigger setTimeout
    
    // Wait for first delay (1000ms)
    expect(global.setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000);
    jest.advanceTimersByTime(1000);
    
    await Promise.resolve(); // second call
    await Promise.resolve(); // trigger setTimeout
    
    // Wait for second delay (2000ms)
    expect(global.setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 2000);
    jest.advanceTimersByTime(2000);

    const result = await promise;
    expect(result).toBe('OK');
  });
});
