import { createClient } from '@/lib/supabase/server';
import { streamText } from 'ai';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { createServerAppRepository } from '@/repositories/factory';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('ai', () => ({
  streamText: jest.fn(),
  tool: jest.fn((config) => config),
  convertToModelMessages: jest.fn(async (messages) => messages),
  NoSuchToolError: { isInstance: () => false },
  InvalidToolInputError: { isInstance: () => false },
  stepCountIs: jest.fn(() => 'stop'),
}));

jest.mock('@/lib/ai/tools/resolvers', () => ({
  toolsResolvers: {
    createTransaction: jest.fn(),
    getTransactions: jest.fn(),
    getAccountBalance: jest.fn(),
    createGoal: jest.fn(),
  },
}));

jest.mock('@/lib/ai/tools/schemas', () => ({
  createTransactionSchema: {},
  getTransactionsSchema: {},
  getAccountBalanceSchema: {},
  createGoalSchema: {},
}));

jest.mock('@/lib/ai/rate-limiter', () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock('@/lib/ai/config', () => ({
  AI_CONFIG: { provider: 'openai', temperature: 0.2 },
  buildSystemPrompt: jest.fn(() => 'system'),
  getAIModel: jest.fn(() => 'model'),
  getGoogleModelFallbackChain: jest.fn(() => ({
    primary: 'g1',
    fallbacks: [],
  })),
  isQuotaExceededError: jest.fn(() => false),
}));

jest.mock('@ai-sdk/google', () => ({
  google: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerAppRepository: jest.fn(() => ({
    accounts: {
      findByUserId: jest.fn().mockResolvedValue([]),
    },
  })),
}));

jest.mock('@/lib/ai/recovery/circuit-breaker', () => ({
  CircuitBreaker: jest.fn().mockImplementation(() => ({
    execute: (fn: () => Promise<any>) => fn(),
  })),
}));

jest.mock('@/lib/ai/recovery/retry', () => ({
  retryWithBackoff: jest.fn((fn: () => Promise<any>) => fn()),
}));

jest.mock('@/lib/ai/verification', () => ({
  verify: jest.fn(),
}));

jest.mock('@/lib/ai/state/checkpointer', () => ({
  SupabaseCheckpointer: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/lib/ai/hitl', () => ({
  shouldRequestApproval: jest.fn(() => false),
  requestApproval: jest.fn(),
  waitForApproval: jest.fn(),
}));

describe('chat route', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockStreamText = streamText as jest.MockedFunction<typeof streamText>;
  const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<
    typeof checkRateLimit
  >;
  const mockCreateServerAppRepository =
    createServerAppRepository as jest.MockedFunction<
      typeof createServerAppRepository
    >;

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
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
    } as any);
  });

  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'expired' },
        }),
      },
    } as any);

    const { POST } = await import('@/app/api/chat/route');
    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [] }),
      })
    );

    expect(response.status).toBe(401);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      limit: 20,
      remaining: 0,
    } as any);

    const { POST } = await import('@/app/api/chat/route');
    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [] }),
      })
    );

    expect(response.status).toBe(429);
  });

  it('returns 500 when request parsing fails after auth and rate-limit checks', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const response = await POST({
      json: jest.fn().mockRejectedValue(new Error('invalid json')),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.details).toBe('invalid json');
  });

  it('streams a successful authenticated chat response with account context', async () => {
    const mockFindByUserId = jest
      .fn()
      .mockResolvedValue([{ name: 'Main Wallet', currencyCode: 'USD' }]);
    mockCreateServerAppRepository.mockReturnValue({
      accounts: {
        findByUserId: mockFindByUserId,
      },
    } as any);
    mockStreamText.mockReturnValue({
      toUIMessageStreamResponse: jest.fn(() =>
        Response.json({ ok: true }, { status: 200 })
      ),
    } as any);

    const { POST } = await import('@/app/api/chat/route');
    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'How much do I have?' }],
          threadId: 'thread-123',
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockFindByUserId).toHaveBeenCalledWith('user-1');
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'system',
        messages: [{ role: 'user', content: 'How much do I have?' }],
      })
    );
  });
});
