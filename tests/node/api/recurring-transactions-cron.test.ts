import { GET, POST } from '@/app/api/cron/recurring-transactions/route';
import { createServiceClient } from '@/lib/supabase/admin';
import { createServerAppRepository } from '@/repositories/factory';
import { RequestContext } from '@/lib/cache/request-context';
import { logger } from '@/lib/utils/logger';

jest.mock('@/lib/supabase/admin', () => ({
  createServiceClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerAppRepository: jest.fn(),
}));

jest.mock('@/lib/cache/request-context');

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Recurring Transactions Cron Route', () => {
  const originalEnv = process.env;
  let mockServiceClient: any;
  let mockAdminRepo: any;
  let mockUserRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: 'super-secret-cron-key' };

    mockServiceClient = {
      from: jest.fn(),
    };
    (createServiceClient as jest.Mock).mockReturnValue(mockServiceClient);

    mockAdminRepo = {
      recurringTransactions: {
        findDueForExecution: jest.fn().mockResolvedValue([]),
      },
    };

    mockUserRepo = {
      recurringTransactions: {
        executeDue: jest.fn(),
      },
      exchangeRates: {
        getRateWithFallback: jest.fn(),
      },
    };

    (createServerAppRepository as jest.Mock).mockImplementation((opts: any) => {
      // If no requestContext is specified, it represents the admin repo
      if (!opts?.requestContext) {
        return mockAdminRepo;
      }
      return mockUserRepo;
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 401 if CRON_SECRET header is missing or incorrect', async () => {
    const request = new Request('http://localhost/api/cron/recurring-transactions', {
      headers: {
        Authorization: 'Bearer wrong-key',
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('runs successfully with empty due transactions list', async () => {
    const request = new Request('http://localhost/api/cron/recurring-transactions', {
      headers: {
        Authorization: 'Bearer super-secret-cron-key',
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.failed).toBe(0);
  });

  it('executes due transactions successfully', async () => {
    const mockDue = [
      {
        id: 'rec-1',
        userId: 'user-123',
        currencyCode: 'USD',
        amountMinor: 10000,
        nextExecutionDate: '2026-06-08',
        frequency: 'monthly',
      },
    ];
    mockAdminRepo.recurringTransactions.findDueForExecution.mockResolvedValueOnce(mockDue);
    mockUserRepo.recurringTransactions.executeDue.mockResolvedValueOnce('new-tx-1');

    const request = new Request('http://localhost/api/cron/recurring-transactions', {
      headers: {
        Authorization: 'Bearer super-secret-cron-key',
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(1);
    expect(body.failed).toBe(0);
    expect(body.results[0].id).toBe('rec-1');
    expect(body.results[0].status).toBe('success');

    // Verify user context was instantiated
    expect(RequestContext).toHaveBeenCalledWith('user-123');
    expect(createServerAppRepository).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase: mockServiceClient,
        requestContext: expect.any(Object),
      })
    );
  });

  it('handles exchange rate loading for VES transactions', async () => {
    const mockDue = [
      {
        id: 'rec-ves',
        userId: 'user-ves',
        currencyCode: 'VES',
        amountMinor: 40000, // 400.00 VES
        nextExecutionDate: '2026-06-08',
        frequency: 'weekly',
      },
    ];
    mockAdminRepo.recurringTransactions.findDueForExecution.mockResolvedValueOnce(mockDue);
    mockUserRepo.exchangeRates.getRateWithFallback.mockResolvedValueOnce({ rate: 40.0 });
    mockUserRepo.recurringTransactions.executeDue.mockResolvedValueOnce('new-ves-tx');

    const request = new Request('http://localhost/api/cron/recurring-transactions', {
      headers: {
        Authorization: 'Bearer super-secret-cron-key',
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.processed).toBe(1);
    expect(mockUserRepo.exchangeRates.getRateWithFallback).toHaveBeenCalledWith('USD', 'VES');
    expect(mockUserRepo.recurringTransactions.executeDue).toHaveBeenCalledWith(
      'rec-ves',
      1000, // 40000 / 40
      40.0,
      '2026-06-08',
      expect.any(String), // nextExecutionDate should be calculated
      'user-ves'
    );
  });

  it('continues processing remaining transactions if one fails', async () => {
    const mockDue = [
      {
        id: 'rec-fail',
        userId: 'user-fail',
        currencyCode: 'USD',
        amountMinor: 5000,
        nextExecutionDate: '2026-06-08',
        frequency: 'daily',
      },
      {
        id: 'rec-success',
        userId: 'user-success',
        currencyCode: 'USD',
        amountMinor: 8000,
        nextExecutionDate: '2026-06-08',
        frequency: 'daily',
      },
    ];
    mockAdminRepo.recurringTransactions.findDueForExecution.mockResolvedValueOnce(mockDue);
    mockUserRepo.recurringTransactions.executeDue
      .mockRejectedValueOnce(new Error('RPC failed'))
      .mockResolvedValueOnce('success-tx');

    const request = new Request('http://localhost/api/cron/recurring-transactions', {
      headers: {
        Authorization: 'Bearer super-secret-cron-key',
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.processed).toBe(1);
    expect(body.failed).toBe(1);
    expect(body.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'rec-fail', status: 'failed', error: 'RPC failed' }),
        expect.objectContaining({ id: 'rec-success', status: 'success' }),
      ])
    );

    expect(logger.error).toHaveBeenCalled();
  });
});
