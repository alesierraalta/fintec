import { GET as GET_APPROVALS } from '@/app/api/hitl/approvals/route';
import { POST as RESPOND } from '@/app/api/hitl/respond/route';
import { createClient } from '@/lib/supabase/server';
import { createServerApprovalRequestsRepository } from '@/repositories/factory';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerApprovalRequestsRepository: jest.fn(),
}));

describe('HITL approval routes', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCreateServerApprovalRequestsRepository =
    createServerApprovalRequestsRepository as jest.MockedFunction<
      typeof createServerApprovalRequestsRepository
    >;

  const repository = {
    listByUserId: jest.fn(),
    findByIdForUser: jest.fn(),
    respond: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    } as any);
    mockCreateServerApprovalRequestsRepository.mockReturnValue(
      repository as any
    );
  });

  it('lists approvals for authenticated users', async () => {
    repository.listByUserId.mockResolvedValue([{ id: 'req-1' }]);

    const response = await GET_APPROVALS(
      new Request('http://localhost/api/hitl/approvals') as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([{ id: 'req-1' }]);
  });

  it('returns 401 and 500 for approvals auth/service failures', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);
    repository.listByUserId.mockRejectedValueOnce(new Error('repo failed'));

    const unauthorized = await GET_APPROVALS(
      new Request('http://localhost/api/hitl/approvals') as any
    );
    const failure = await GET_APPROVALS(
      new Request('http://localhost/api/hitl/approvals') as any
    );

    expect(unauthorized.status).toBe(401);
    expect(failure.status).toBe(500);
  });

  it('responds to approval requests', async () => {
    repository.findByIdForUser.mockResolvedValue({ id: 'req-1' });

    const response = await RESPOND(
      new Request('http://localhost/api/hitl/respond', {
        method: 'POST',
        body: JSON.stringify({
          requestId: 'req-1',
          status: 'approved',
          responseData: { note: 'ok' },
        }),
      }) as any
    );

    expect(response.status).toBe(200);
    expect(repository.respond).toHaveBeenCalledWith(
      'req-1',
      'user-1',
      'approved',
      { note: 'ok' }
    );
  });

  it('validates malformed response payloads', async () => {
    const response = await RESPOND(
      new Request('http://localhost/api/hitl/respond', {
        method: 'POST',
        body: JSON.stringify({ requestId: 'req-1', status: 'maybe' }),
      }) as any
    );

    expect(response.status).toBe(400);
  });

  it('returns 404 when approval request is not owned by the user', async () => {
    repository.findByIdForUser.mockResolvedValue(null);

    const response = await RESPOND(
      new Request('http://localhost/api/hitl/respond', {
        method: 'POST',
        body: JSON.stringify({ requestId: 'req-404', status: 'rejected' }),
      }) as any
    );

    expect(response.status).toBe(404);
  });

  it('returns 500 when approval response persistence fails', async () => {
    repository.findByIdForUser.mockResolvedValue({ id: 'req-1' });
    repository.respond.mockRejectedValue(new Error('write failed'));

    const response = await RESPOND(
      new Request('http://localhost/api/hitl/respond', {
        method: 'POST',
        body: JSON.stringify({ requestId: 'req-1', status: 'approved' }),
      }) as any
    );

    expect(response.status).toBe(500);
  });
});
