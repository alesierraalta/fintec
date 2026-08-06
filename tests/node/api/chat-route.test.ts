import { createClient } from '@/lib/supabase/server';
import { streamText } from 'ai';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { createServerAppRepository } from '@/repositories/factory';
import { buildChatTools } from '@/lib/ai/tools/build-chat-tools';
import { logger } from '@/lib/utils/logger';
import { getAIModel, AIConfigurationError } from '@/lib/ai/config';

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
    queryTransactions: jest.fn(),
    searchTransactions: jest.fn(),
    getAccountBalance: jest.fn(),
    createGoal: jest.fn(),
  },
}));

jest.mock('@/lib/ai/tools/schemas', () => ({
  createTransactionSchema: {},
  queryTransactionsSchema: {},
  searchTransactionsSchema: {},
  getAccountBalanceSchema: {},
  createGoalSchema: {},
}));

jest.mock('@/lib/ai/rate-limiter', () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock('@/lib/ai/config', () => {
  class AIConfigurationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'AIConfigurationError';
    }
  }
  return {
    AI_CONFIG: { provider: 'openai', temperature: 0.2 },
    buildSystemPrompt: jest.fn(() => 'system'),
    getAIModel: jest.fn(() => 'model'),
    AIConfigurationError,
    getGoogleModelFallbackChain: jest.fn(() => ({
      primary: 'g1',
      fallbacks: [],
    })),
    isQuotaExceededError: jest.fn(() => false),
  };
});

jest.mock('@/lib/ai/providers', () => ({
  getProviderAdapter: jest.fn(() => ({
    id: 'openai',
    modelId: 'gpt-4o',
    createModel: jest.fn(),
    fallbackModels: [],
    isTransient: jest.fn(() => false),
  })),
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

jest.mock('@/lib/ai/tools/build-chat-tools', () => ({
  buildChatTools: jest.fn(() => ({})),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

/**
 * Builds a Supabase client mock whose `from('users').select().eq().single()`
 * chain resolves to the supplied PostgrestSingleResponse-shaped value.
 *
 * `supabase-js` does NOT throw on query failure: it resolves with
 * `{ data: null, error }`. Tests rely on that contract here so the route's
 * error handling is exercised the way production actually behaves.
 */
function buildSupabaseClientMock(profileResult: {
  data: { base_currency?: string | null } | null;
  error: { message: string } | null;
}) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue(profileResult),
        })),
      })),
    })),
  };
}

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
  const mockBuildChatTools = buildChatTools as jest.MockedFunction<
    typeof buildChatTools
  >;
  const mockGetAIModel = getAIModel as jest.MockedFunction<typeof getAIModel>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

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
    mockGetAIModel.mockReturnValue('model');
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

  it('returns 500 with a safe generic response when request parsing fails', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const response = await POST({
      json: jest.fn().mockRejectedValue(new Error('invalid json')),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error. Please try again later.');
    expect(JSON.stringify(body)).not.toContain('invalid json');
  });

  it('returns 503 without leaking the raw message on provider configuration errors', async () => {
    mockGetAIModel.mockImplementation(() => {
      throw new AIConfigurationError(
        'OPENAI_API_KEY is not configured. Raw value: sk-secret-123'
      );
    });
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
          messages: [{ role: 'user', content: 'Hi' }],
          threadId: 'thread-1',
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe(
      'AI provider is not configured correctly. Please try again later.'
    );
    expect(JSON.stringify(body)).not.toContain('OPENAI_API_KEY');
    expect(JSON.stringify(body)).not.toContain('sk-secret-123');
    expect(JSON.stringify(body)).not.toContain('Raw value:');
    // The raw error is still logged server-side for debugging.
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('[AI Chat] Error:'),
      expect.anything()
    );
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

  describe('base currency resolution', () => {
    const okStreamResponse = () =>
      ({
        toUIMessageStreamResponse: jest.fn(() =>
          Response.json({ ok: true }, { status: 200 })
        ),
      }) as any;

    const postChat = async () => {
      const { POST } = await import('@/app/api/chat/route');
      return POST(
        new Request('http://localhost/api/chat', {
          method: 'POST',
          body: JSON.stringify({ messages: [], threadId: 'thread-1' }),
        })
      );
    };

    it("passes the user's profile base currency to the chat tools", async () => {
      mockCreateClient.mockResolvedValue(
        buildSupabaseClientMock({
          data: { base_currency: 'COP' },
          error: null,
        }) as any
      );
      mockStreamText.mockReturnValue(okStreamResponse());

      await postChat();

      expect(mockBuildChatTools).toHaveBeenCalledWith(
        expect.objectContaining({ baseCurrencyCode: 'COP' })
      );
    });

    it('warns and falls back to USD when the profile lookup returns an error', async () => {
      mockCreateClient.mockResolvedValue(
        buildSupabaseClientMock({
          data: null,
          error: { message: 'permission denied' },
        }) as any
      );
      mockStreamText.mockReturnValue(okStreamResponse());

      await postChat();

      // supabase-js resolves (never throws) on a failed query, so the route
      // must inspect `error` explicitly. Falling back silently would convert
      // a non-USD user's amounts against the wrong currency.
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('base_currency'),
        expect.anything()
      );
      expect(mockBuildChatTools).toHaveBeenCalledWith(
        expect.objectContaining({ baseCurrencyCode: 'USD' })
      );
    });
  });
});
