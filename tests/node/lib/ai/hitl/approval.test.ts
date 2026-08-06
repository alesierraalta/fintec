/**
 * Unit tests for the optional injected-`supabase` dependency on
 * `requestApproval`/`waitForApproval` (lib/ai/hitl/approval.ts).
 *
 * Why this seam exists: `createClient()` (@/lib/supabase/server) depends on
 * Next.js request scope (`cookies()`/`headers()`), so it cannot run inside
 * a Jest test or a standalone eval script. Rather than duplicating the
 * polling loop (forbidden by ai-eval-harness req. 1 — "MUST NOT define a
 * ... duplicate HITL poller"), these functions gain ONE optional `deps`
 * parameter so the eval harness can inject an already-authenticated client
 * while route.ts's unmodified call sites keep calling `createClient()`
 * exactly as before (regression-safe default).
 */

const mockCreateClient = jest.fn();
const mockRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  markTimeout: jest.fn(),
};
const mockCreateServerApprovalRequestsRepository = jest.fn(
  () => mockRepository
);

jest.mock('@/lib/supabase/server', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

jest.mock('@/repositories/factory', () => ({
  createServerApprovalRequestsRepository: (...args: unknown[]) =>
    mockCreateServerApprovalRequestsRepository(...args),
}));

import { requestApproval, waitForApproval } from '@/lib/ai/hitl/approval';

describe('requestApproval / waitForApproval — injected supabase dependency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses createClient() by default when no supabase client is injected (unchanged production behavior)', async () => {
    const fakeProductionClient = { production: true };
    mockCreateClient.mockResolvedValue(fakeProductionClient);
    mockRepository.create.mockResolvedValue('req-1');

    await requestApproval({
      userId: 'u1',
      threadId: 't1',
      actionType: 'createGoal',
      actionData: {},
      riskLevel: 'HIGH',
      message: 'msg',
    });

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateServerApprovalRequestsRepository).toHaveBeenCalledWith({
      supabase: fakeProductionClient,
    });
  });

  it('uses the injected supabase client and never calls createClient() when provided', async () => {
    const injectedClient = { injected: true };
    mockRepository.create.mockResolvedValue('req-2');

    await requestApproval(
      {
        userId: 'u1',
        threadId: 't1',
        actionType: 'createGoal',
        actionData: {},
        riskLevel: 'HIGH',
        message: 'msg',
      },
      { supabase: injectedClient as any }
    );

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockCreateServerApprovalRequestsRepository).toHaveBeenCalledWith({
      supabase: injectedClient,
    });
  });

  it('waitForApproval uses createClient() by default when no supabase client is injected (unchanged production behavior)', async () => {
    const fakeProductionClient = { production: true };
    mockCreateClient.mockResolvedValue(fakeProductionClient);
    mockRepository.findById.mockResolvedValue({
      status: 'approved',
      responseData: null,
    });

    const result = await waitForApproval('req-4', 5000);

    expect(result).toEqual({ approved: true, response: null });
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateServerApprovalRequestsRepository).toHaveBeenCalledWith({
      supabase: fakeProductionClient,
    });
  });

  it('waitForApproval uses the injected supabase client and never calls createClient()', async () => {
    const injectedClient = { injected: true };
    mockRepository.findById.mockResolvedValue({
      status: 'approved',
      responseData: null,
    });

    const result = await waitForApproval('req-3', 5000, {
      supabase: injectedClient as any,
    });

    expect(result).toEqual({ approved: true, response: null });
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockCreateServerApprovalRequestsRepository).toHaveBeenCalledWith({
      supabase: injectedClient,
    });
  });
});
