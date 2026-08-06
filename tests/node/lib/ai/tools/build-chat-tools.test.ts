/**
 * Unit tests for `buildChatTools` (extracted from the inline `tools` object
 * at app/api/chat/route.ts:110-194 — a PURE move, no logic changes).
 *
 * Covers:
 *   - The five wrapped tools are returned with the same names, and the
 *     HITL gating behavior on `createTransaction`/`createGoal` is preserved.
 *   - An injectable `approvals` port makes HITL testable outside a Next
 *     request scope (requestApproval/waitForApproval construct their own
 *     Supabase client internally at lib/ai/hitl/approval.ts:16,33 and are
 *     NOT injectable via ToolContext alone).
 *   - When `approvals` is omitted, production defaults to the real
 *     `lib/ai/hitl/approval.ts` functions (verified via the module mock
 *     below, which stands in for "the real implementation").
 */

const mockRequestApproval = jest.fn();
const mockWaitForApproval = jest.fn();
const mockShouldRequestApproval = jest.fn();

jest.mock('@/lib/ai/hitl', () => ({
  shouldRequestApproval: (...args: unknown[]) =>
    mockShouldRequestApproval(...args),
  requestApproval: (...args: unknown[]) => mockRequestApproval(...args),
  waitForApproval: (...args: unknown[]) => mockWaitForApproval(...args),
}));

jest.mock('@/lib/ai/tools/resolvers', () => ({
  toolsResolvers: {
    createTransaction: jest.fn().mockResolvedValue('tx created'),
    queryTransactions: jest.fn().mockResolvedValue('query result'),
    searchTransactions: jest.fn().mockResolvedValue('search result'),
    getAccountBalance: jest.fn().mockResolvedValue('balance result'),
    createGoal: jest.fn().mockResolvedValue('goal created'),
  },
}));

import { buildChatTools } from '@/lib/ai/tools/build-chat-tools';
import { toolsResolvers } from '@/lib/ai/tools/resolvers';

function makeDeps(overrides: Partial<any> = {}) {
  return {
    userId: 'user-1',
    threadId: 'thread-1',
    repository: { some: 'repo' } as any,
    supabase: { rpc: jest.fn() } as any,
    baseCurrencyCode: 'USD',
    ...overrides,
  };
}

describe('buildChatTools — returns the same five wrapped tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns createTransaction, queryTransactions, searchTransactions, getAccountBalance, createGoal', () => {
    const tools = buildChatTools(makeDeps());

    expect(Object.keys(tools).sort()).toEqual(
      [
        'createTransaction',
        'queryTransactions',
        'searchTransactions',
        'getAccountBalance',
        'createGoal',
      ].sort()
    );
  });

  it('createTransaction skips approval and calls the resolver directly when shouldRequestApproval is false', async () => {
    mockShouldRequestApproval.mockReturnValue(false);
    const tools = buildChatTools(makeDeps());

    await (tools.createTransaction as any).execute({
      amount: 10,
      description: 'Coffee',
      category: 'Food',
      type: 'EXPENSE',
    });

    expect(mockRequestApproval).not.toHaveBeenCalled();
    expect(toolsResolvers.createTransaction).toHaveBeenCalled();
  });

  it('createTransaction blocks on rejected approval and never calls the resolver', async () => {
    mockShouldRequestApproval.mockReturnValue(true);
    mockRequestApproval.mockResolvedValue('req-1');
    mockWaitForApproval.mockResolvedValue({ approved: false, response: null });
    const tools = buildChatTools(makeDeps());

    await expect(
      (tools.createTransaction as any).execute({
        amount: 500,
        description: 'Big purchase',
        category: 'Shopping',
        type: 'EXPENSE',
      })
    ).rejects.toThrow(/rejected/i);

    expect(toolsResolvers.createTransaction).not.toHaveBeenCalled();
  });
});

describe('buildChatTools — approvals port', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the injected approvals port instead of the real approval.ts functions when provided', async () => {
    const injectedRequestApproval = jest.fn().mockResolvedValue('injected-req-1');
    const injectedWaitForApproval = jest
      .fn()
      .mockResolvedValue({ approved: true, response: null });
    mockShouldRequestApproval.mockReturnValue(true);

    const tools = buildChatTools(
      makeDeps({
        approvals: {
          requestApproval: injectedRequestApproval,
          waitForApproval: injectedWaitForApproval,
        },
      })
    );

    await (tools.createGoal as any).execute({
      name: 'Vacation',
      targetAmount: 1000,
      deadline: '2030-01-01',
    });

    expect(injectedRequestApproval).toHaveBeenCalledTimes(1);
    expect(injectedWaitForApproval).toHaveBeenCalledTimes(1);
    expect(mockRequestApproval).not.toHaveBeenCalled();
    expect(mockWaitForApproval).not.toHaveBeenCalled();
  });

  it('binds to the real approval.ts functions in production (approvals omitted)', async () => {
    mockShouldRequestApproval.mockReturnValue(true);
    mockRequestApproval.mockResolvedValue('req-2');
    mockWaitForApproval.mockResolvedValue({ approved: true, response: null });

    const tools = buildChatTools(makeDeps());

    await (tools.createGoal as any).execute({
      name: 'Vacation',
      targetAmount: 1000,
      deadline: '2030-01-01',
    });

    expect(mockRequestApproval).toHaveBeenCalledTimes(1);
    expect(mockWaitForApproval).toHaveBeenCalledTimes(1);
  });
});
