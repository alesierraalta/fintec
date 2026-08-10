const mockLoggerError = jest.fn();

jest.mock('next/server', () => ({
  after: (task: () => Promise<unknown>) => {
    mockAfter(task);
  },
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockAfter = jest.fn();

describe('scheduleBackgroundRateRefresh (issue #50)', () => {
  beforeEach(() => {
    jest.resetModules();
    mockAfter.mockReset();
    mockLoggerError.mockReset();
  });

  const reload = async () => {
    const mod = await import('@/lib/rates/rate-refresh');
    return mod.scheduleBackgroundRateRefresh;
  };

  it('schedules the refresh through after() so it is not a floating promise', async () => {
    const schedule = await reload();
    const task = jest.fn().mockResolvedValue(undefined);

    schedule('bcv', task);

    expect(mockAfter).toHaveBeenCalledTimes(1);
    const afterTask = mockAfter.mock.calls[0][0];
    await afterTask();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent stale refreshes per key into one execution', async () => {
    const schedule = await reload();
    let resolveFirst: (() => void) | undefined;
    const task = jest.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        })
    );

    schedule('bcv', task);
    schedule('bcv', task);
    expect(mockAfter).toHaveBeenCalledTimes(2);

    const [firstAfter, secondAfter] = mockAfter.mock.calls.map(
      (call) => call[0]
    );

    const firstRun = firstAfter();
    await Promise.resolve();
    expect(task).toHaveBeenCalledTimes(1);

    const secondRun = secondAfter();
    await Promise.resolve();
    expect(task).toHaveBeenCalledTimes(1);

    resolveFirst?.();
    await Promise.all([firstRun, secondRun]);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('allows independent refreshes for different keys', async () => {
    const schedule = await reload();
    const bcvTask = jest.fn().mockResolvedValue(undefined);
    const binanceTask = jest.fn().mockResolvedValue(undefined);

    schedule('bcv', bcvTask);
    schedule('binance', binanceTask);

    const afterTasks = mockAfter.mock.calls.map((call) => call[0]);
    await Promise.all(afterTasks.map((run) => run()));

    expect(bcvTask).toHaveBeenCalledTimes(1);
    expect(binanceTask).toHaveBeenCalledTimes(1);
  });

  it('logs a failed refresh without throwing and keeps stale data served', async () => {
    const schedule = await reload();
    const task = jest
      .fn()
      .mockRejectedValue(new Error('upstream scrape failed'));

    schedule('bcv', task);
    const afterTask = mockAfter.mock.calls[0][0];

    await expect(afterTask()).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining('[rate-refresh]'),
      expect.any(Error)
    );
  });

  it('allows a new refresh for the same key after the previous one settles', async () => {
    const schedule = await reload();
    const firstTask = jest.fn().mockResolvedValue(undefined);

    schedule('bcv', firstTask);
    await mockAfter.mock.calls[0][0]();

    const secondTask = jest.fn().mockResolvedValue(undefined);
    schedule('bcv', secondTask);
    await mockAfter.mock.calls[1][0]();

    expect(firstTask).toHaveBeenCalledTimes(1);
    expect(secondTask).toHaveBeenCalledTimes(1);
  });
});
