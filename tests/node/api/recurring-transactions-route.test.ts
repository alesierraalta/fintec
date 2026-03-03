import { DELETE, PUT } from '@/app/api/recurring-transactions/route';
import { createClient } from '@/lib/supabase/server';
import { createServerAppRepository } from '@/repositories/factory';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerAppRepository: jest.fn(),
}));

describe('PUT /api/recurring-transactions', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCreateServerAppRepository =
    createServerAppRepository as jest.MockedFunction<
      typeof createServerAppRepository
    >;

  const findById = jest.fn();
  const update = jest.fn();
  const remove = jest.fn();

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
      recurringTransactions: {
        findById,
        update,
        delete: remove,
      },
    } as any);
  });

  it('updates a recurring transaction with valid payload', async () => {
    findById.mockResolvedValue({ id: 'rec-1', userId: 'user-1' });
    update.mockResolvedValue({
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
    expect(findById).toHaveBeenCalledWith('rec-1', 'user-1');
    expect(update).toHaveBeenCalledWith(
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
    expect(findById).not.toHaveBeenCalled();
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
    expect(body.details[0]).toEqual(
      expect.objectContaining({
        field: expect.any(String),
        message: expect.any(String),
      })
    );
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
    expect(body.error).toBe('Invalid recurring transaction update payload');
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'endDate',
          message: 'endDate must be greater than or equal to startDate',
        }),
      ])
    );
    expect(findById).not.toHaveBeenCalled();
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
    expect(body.error).toBe('Invalid recurring transaction update payload');
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'startDate',
          message: 'Date must be a valid calendar date',
        }),
      ])
    );
    expect(findById).not.toHaveBeenCalled();
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
    expect(body.error).toBe('Invalid recurring transaction update payload');
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'amountMinor',
          message: 'Amount must be positive',
        }),
      ])
    );
    expect(findById).not.toHaveBeenCalled();
  });

  it('returns 400 when amountMinor is negative', async () => {
    const response = await PUT(
      new Request('http://localhost/api/recurring-transactions', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'rec-1',
          amountMinor: -1,
        }),
      }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid recurring transaction update payload');
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'amountMinor',
          message: 'Amount must be positive',
        }),
      ])
    );
    expect(findById).not.toHaveBeenCalled();
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
    expect(body.error).toBe('Invalid recurring transaction update payload');
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'amountMinor',
          message: 'Amount must be an integer',
        }),
      ])
    );
    expect(findById).not.toHaveBeenCalled();
  });

  it('returns 404 when target recurring transaction does not exist', async () => {
    findById.mockResolvedValue(null);

    const response = await PUT(
      new Request('http://localhost/api/recurring-transactions', {
        method: 'PUT',
        body: JSON.stringify({ id: 'rec-missing', name: 'Rent' }),
      }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Recurring transaction not found');
    expect(update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/recurring-transactions', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCreateServerAppRepository =
    createServerAppRepository as jest.MockedFunction<
      typeof createServerAppRepository
    >;

  const findById = jest.fn();
  const remove = jest.fn();

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
      recurringTransactions: {
        findById,
        delete: remove,
      },
    } as any);
  });

  it('deletes an existing recurring transaction', async () => {
    findById.mockResolvedValue({ id: 'rec-1', userId: 'user-1' });
    remove.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request('http://localhost/api/recurring-transactions?id=rec-1', {
        method: 'DELETE',
      }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(findById).toHaveBeenCalledWith('rec-1', 'user-1');
    expect(remove).toHaveBeenCalledWith('rec-1', 'user-1');
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

    const response = await DELETE(
      new Request('http://localhost/api/recurring-transactions?id=rec-1', {
        method: 'DELETE',
      }) as any
    );

    expect(response.status).toBe(401);
    expect(findById).not.toHaveBeenCalled();
  });

  it('returns stable 400 when delete query is invalid', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/recurring-transactions', {
        method: 'DELETE',
      }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Invalid recurring transaction delete parameters');
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details[0]).toEqual(
      expect.objectContaining({
        field: expect.any(String),
        message: expect.any(String),
      })
    );
  });

  it('returns 404 when target recurring transaction does not exist', async () => {
    findById.mockResolvedValue(null);

    const response = await DELETE(
      new Request(
        'http://localhost/api/recurring-transactions?id=rec-missing',
        {
          method: 'DELETE',
        }
      ) as any
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Recurring transaction not found');
    expect(remove).not.toHaveBeenCalled();
  });
});
