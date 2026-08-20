import { DELETE, GET, POST, PUT } from '@/app/api/recurring-transactions/route';
import { createClient } from '@/lib/supabase/server';
import { createServerAppRepository } from '@/repositories/factory';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerAppRepository: jest.fn(),
}));

describe('recurring transactions route handlers', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCreateServerAppRepository =
    createServerAppRepository as jest.MockedFunction<
      typeof createServerAppRepository
    >;

  const recurringTransactions = {
    findByUserId: jest.fn(),
    getSummary: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const transactions = {
    create: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    } as any);

    mockCreateServerAppRepository.mockReturnValue({
      recurringTransactions,
      transactions,
    } as any);
  });

  describe('GET /api/recurring-transactions', () => {
    it('returns transactions and summary for authenticated user', async () => {
      recurringTransactions.findByUserId.mockResolvedValue([{ id: 'rec-1' }]);
      recurringTransactions.getSummary.mockResolvedValue({ total: 1 });

      const response = await GET(
        new Request('http://localhost/api/recurring-transactions') as any
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(recurringTransactions.findByUserId).toHaveBeenCalledWith('user-1');
      expect(recurringTransactions.getSummary).toHaveBeenCalledWith('user-1');
      expect(body.data.summary).toEqual({ total: 1 });
    });

    it('returns 401 when user is not authenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
      } as any);

      const response = await GET(
        new Request('http://localhost/api/recurring-transactions') as any
      );

      expect(response.status).toBe(401);
    });

    it('returns 500 when summary lookup fails', async () => {
      recurringTransactions.findByUserId.mockResolvedValue([]);
      recurringTransactions.getSummary.mockRejectedValue(new Error('boom'));

      const response = await GET(
        new Request('http://localhost/api/recurring-transactions') as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.details).toBe('boom');
    });
  });

  describe('POST /api/recurring-transactions', () => {
    it('creates a recurring transaction with valid payload', async () => {
      recurringTransactions.create.mockResolvedValue({ id: 'rec-1' });

      const response = await POST(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Rent',
            type: 'EXPENSE',
            accountId: 'acc-1',
            currencyCode: 'USD',
            amountMinor: 1000,
            frequency: 'monthly',
            startDate: '2026-06-01',
          }),
        }) as any
      );

      expect(response.status).toBe(201);
      expect(recurringTransactions.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Rent' }),
        'user-1'
      );
    });

    it('returns 401 when user is not authenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
      } as any);

      const response = await POST(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'POST',
          body: JSON.stringify({}),
        }) as any
      );

      expect(response.status).toBe(401);
    });

    it('returns 400 for missing required fields', async () => {
      const response = await POST(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'POST',
          body: JSON.stringify({ name: 'Rent' }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Missing required fields');
    });

    it('returns 500 when creation fails', async () => {
      recurringTransactions.create.mockRejectedValue(
        new Error('insert failed')
      );

      const response = await POST(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Rent',
            type: 'EXPENSE',
            accountId: 'acc-1',
            currencyCode: 'USD',
            amountMinor: 1000,
            frequency: 'monthly',
            startDate: '2026-06-01',
          }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.details).toBe('insert failed');
    });
  });

  describe('POST /api/recurring-transactions — durable rule-first creation', () => {
    const validBody = {
      name: 'Rent',
      type: 'EXPENSE',
      accountId: 'acc-1',
      currencyCode: 'USD',
      amountMinor: 1000,
      frequency: 'monthly',
      startDate: '2026-06-01',
    };

    const ruleFixture = { id: 'rec-1', name: 'Rent', userId: 'user-1' };

    beforeEach(() => {
      recurringTransactions.create.mockResolvedValue(ruleFixture);
      transactions.create.mockResolvedValue({ id: 'tx-1' });
    });

    it('persists the rule before the first operation when registerFirstOperation is true', async () => {
      const response = await POST(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'POST',
          body: JSON.stringify({ ...validBody, registerFirstOperation: true }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.outcome).toBe('first-operation-created');
      // Rule-first: the recurring rule must be persisted and the first operation
      // created only after it, so the rule id is available in the same request.
      expect(recurringTransactions.create).toHaveBeenCalledTimes(1);
      expect(transactions.create).toHaveBeenCalledTimes(1);
    });

    it('does NOT register a first operation when registerFirstOperation is false', async () => {
      const response = await POST(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'POST',
          body: JSON.stringify({ ...validBody, registerFirstOperation: false }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.outcome).toBe('rule-created');
      expect(recurringTransactions.create).toHaveBeenCalledTimes(1);
      expect(transactions.create).not.toHaveBeenCalled();
    });

    it('computes nextExecutionDate as the first occurrence when no immediate operation', async () => {
      await POST(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'POST',
          body: JSON.stringify({ ...validBody, registerFirstOperation: false }),
        }) as any
      );

      expect(recurringTransactions.create).toHaveBeenCalledWith(
        expect.objectContaining({ nextExecutionDate: '2026-06-01' }),
        'user-1'
      );
    });

    it('computes nextExecutionDate as a later occurrence after an immediate operation', async () => {
      await POST(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'POST',
          body: JSON.stringify({ ...validBody, registerFirstOperation: true }),
        }) as any
      );

      // startDate 2026-06-01 + one month = 2026-07-01, strictly later than the
      // immediate operation so cron never re-executes it.
      expect(recurringTransactions.create).toHaveBeenCalledWith(
        expect.objectContaining({ nextExecutionDate: '2026-07-01' }),
        'user-1'
      );
    });

    it('returns Spanish actionable error when rule creation fails and nothing follows', async () => {
      recurringTransactions.create.mockRejectedValue(
        new Error('insert failed')
      );

      const response = await POST(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'POST',
          body: JSON.stringify({ ...validBody, registerFirstOperation: true }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error).toContain('No se pudo guardar');
      expect(recurringTransactions.create).toHaveBeenCalledTimes(1);
      // Nothing follows a failed rule creation.
      expect(transactions.create).not.toHaveBeenCalled();
    });

    it('retains the rule and reports partial failure in Spanish when the first operation fails', async () => {
      transactions.create.mockRejectedValue(new Error('write failed'));

      const response = await POST(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'POST',
          body: JSON.stringify({ ...validBody, registerFirstOperation: true }),
        }) as any
      );
      const body = await response.json();

      // The rule was persisted, so we must not claim full success.
      expect(recurringTransactions.create).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(202);
      expect(body.outcome).toBe('partial-failure');
      expect(body.success).toBe(false);
      expect(body.data).toEqual(ruleFixture);
      expect(body.error).toContain('No se pudo registrar la primera');
    });
  });

  describe('PUT /api/recurring-transactions', () => {
    it('updates a recurring transaction with valid payload', async () => {
      recurringTransactions.findById.mockResolvedValue({
        id: 'rec-1',
        userId: 'user-1',
      });
      recurringTransactions.update.mockResolvedValue({
        id: 'rec-1',
        userId: 'user-1',
        name: 'Rent',
        amountMinor: 120000,
      });

      const response = await PUT(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'PUT',
          body: JSON.stringify({
            id: 'rec-1',
            name: 'Rent',
            amountMinor: 120000,
          }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(recurringTransactions.findById).toHaveBeenCalledWith(
        'rec-1',
        'user-1'
      );
      expect(recurringTransactions.update).toHaveBeenCalledWith(
        'rec-1',
        { name: 'Rent', amountMinor: 120000 },
        'user-1'
      );
      expect(body.success).toBe(true);
    });

    it('returns 401 when user is not authenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      } as any);

      const response = await PUT(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'PUT',
          body: JSON.stringify({ id: 'rec-1', name: 'Rent' }),
        }) as any
      );

      expect(response.status).toBe(401);
      expect(recurringTransactions.findById).not.toHaveBeenCalled();
    });

    it('returns stable 400 when payload is invalid', async () => {
      const response = await PUT(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'PUT',
          body: JSON.stringify({ amountMinor: 1000 }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid recurring transaction update payload');
      expect(Array.isArray(body.details)).toBe(true);
    });

    it('returns 400 when request body is invalid JSON', async () => {
      const response = await PUT({
        json: jest.fn().mockRejectedValue(new Error('invalid json')),
      } as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.details).toEqual([
        { field: 'request', message: 'Request body must be valid JSON' },
      ]);
    });

    it('returns 400 when endDate is earlier than startDate', async () => {
      const response = await PUT(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'PUT',
          body: JSON.stringify({
            id: 'rec-1',
            startDate: '2026-06-10',
            endDate: '2026-06-09',
          }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'endDate',
            message: 'endDate must be greater than or equal to startDate',
          }),
        ])
      );
    });

    it('returns 400 when startDate is not a valid calendar date', async () => {
      const response = await PUT(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'PUT',
          body: JSON.stringify({
            id: 'rec-1',
            startDate: '2026-02-30',
          }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'startDate',
            message: 'Date must be a valid calendar date',
          }),
        ])
      );
    });

    it('returns 400 when amountMinor is zero', async () => {
      const response = await PUT(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'PUT',
          body: JSON.stringify({
            id: 'rec-1',
            amountMinor: 0,
          }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'amountMinor',
            message: 'Amount must be positive',
          }),
        ])
      );
    });

    it('returns 400 when amountMinor is decimal', async () => {
      const response = await PUT(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'PUT',
          body: JSON.stringify({
            id: 'rec-1',
            amountMinor: 100.5,
          }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'amountMinor',
            message: 'Amount must be an integer',
          }),
        ])
      );
    });

    it('returns 404 when target recurring transaction does not exist', async () => {
      recurringTransactions.findById.mockResolvedValue(null);

      const response = await PUT(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'PUT',
          body: JSON.stringify({ id: 'rec-missing', name: 'Rent' }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Recurring transaction not found');
      expect(recurringTransactions.update).not.toHaveBeenCalled();
    });

    it('normalizes repository not-found errors to 404', async () => {
      recurringTransactions.findById.mockRejectedValue(
        new Error('PGRST116 no rows returned')
      );

      const response = await PUT(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'PUT',
          body: JSON.stringify({ id: 'rec-1', name: 'Rent' }),
        }) as any
      );

      expect(response.status).toBe(404);
    });

    it('returns 500 when repository update fails', async () => {
      recurringTransactions.findById.mockResolvedValue({ id: 'rec-1' });
      recurringTransactions.update.mockRejectedValue(new Error('write failed'));

      const response = await PUT(
        new Request('http://localhost/api/recurring-transactions', {
          method: 'PUT',
          body: JSON.stringify({ id: 'rec-1', name: 'Rent' }),
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.details).toBe('write failed');
    });
  });

  describe('DELETE /api/recurring-transactions', () => {
    it('deletes a recurring transaction with valid id', async () => {
      recurringTransactions.findById.mockResolvedValue({ id: 'rec-1' });

      const response = await DELETE(
        new Request(
          'http://localhost/api/recurring-transactions?id=rec-1'
        ) as any
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(recurringTransactions.delete).toHaveBeenCalledWith(
        'rec-1',
        'user-1'
      );
      expect(body.message).toBe('Recurring transaction deleted successfully');
    });

    it('returns 401 when user is not authenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
      } as any);

      const response = await DELETE(
        new Request(
          'http://localhost/api/recurring-transactions?id=rec-1'
        ) as any
      );

      expect(response.status).toBe(401);
    });

    it('returns 400 when query params are invalid', async () => {
      const response = await DELETE(
        new Request('http://localhost/api/recurring-transactions') as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe(
        'Invalid recurring transaction delete parameters'
      );
    });

    it('returns 404 when recurring transaction is missing', async () => {
      recurringTransactions.findById.mockResolvedValue(null);

      const response = await DELETE(
        new Request(
          'http://localhost/api/recurring-transactions?id=rec-404'
        ) as any
      );
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Recurring transaction not found');
      expect(recurringTransactions.delete).not.toHaveBeenCalled();
    });

    it('returns 500 when repository deletion fails', async () => {
      recurringTransactions.findById.mockResolvedValue({ id: 'rec-1' });
      recurringTransactions.delete.mockRejectedValue(
        new Error('delete failed')
      );

      const response = await DELETE(
        new Request(
          'http://localhost/api/recurring-transactions?id=rec-1'
        ) as any
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.details).toBe('delete failed');
    });
  });
});
