import { createClient } from '@/lib/supabase/server';
import {
  convertToModelMessages,
  NoSuchToolError,
  InvalidToolInputError,
  type UIMessage,
} from 'ai';
import { buildChatTools } from '@/lib/ai/tools/build-chat-tools';
import {
  buildHistoryHints,
  HISTORY_LOOKBACK,
} from '@/lib/ai/voice-capture/history-hints';
import {
  streamWithFallback,
  createResilientStreamResponse,
} from '@/lib/ai/stream-with-fallback';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import {
  AI_CONFIG,
  AIConfigurationError,
  buildSystemPrompt,
  getAIModel,
} from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';
import { createServerAppRepository } from '@/repositories/factory';
import { isFallbackSource } from '@/lib/services/rates-fallback';

// Priority 1 Components
import { CircuitBreaker } from '@/lib/ai/recovery/circuit-breaker';
import { retryWithBackoff } from '@/lib/ai/recovery/retry';
import { verify } from '@/lib/ai/verification';
import { SupabaseCheckpointer } from '@/lib/ai/state/checkpointer';

// Initialize core components
const circuitBreaker = new CircuitBreaker(`${AI_CONFIG.provider}_api`);
const checkpointer = new SupabaseCheckpointer();

// Allow longer timeout for AI responses (and HITL polling)
export const maxDuration = 60;

/**
 * Trims message history to a sliding window of the most recent messages,
 * ensuring the window starts on a user message for coherent dialogue context.
 * Drastically reduces input token consumption and speeds up TTFT on long sessions.
 */
export function trimMessageHistory<T>(
  messages: T[],
  maxMessages: number = 10
): T[] {
  if (!Array.isArray(messages) || messages.length <= maxMessages) {
    return messages;
  }
  const slice = messages.slice(-maxMessages);
  const firstUserIdx = slice.findIndex((m: any) => m?.role === 'user');
  if (firstUserIdx > 0) {
    return slice.slice(firstUserIdx);
  }
  return slice;
}

/**
 * POST /api/ai/chat
 *
 * AI chat endpoint with streaming responses.
 * Enhanced with Priority 1: Verification, Recovery, Durable Execution, HITL.
 */
export async function POST(req: Request) {
  let threadId = '';
  let userId = '';

  try {
    // 1. Authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.error('[AI Chat Auth Error]', authError);
      return Response.json(
        { error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      );
    }
    userId = user.id;

    // 2. Rate Limiting
    const { success, limit, remaining } = await checkRateLimit(user.id);

    if (!success) {
      return Response.json(
        {
          error: 'Rate limit exceeded',
          limit,
          remaining,
          message: 'Max messages per hour reached.',
        },
        { status: 429 }
      );
    }

    // 3. Parse request & Initialize State
    const {
      messages,
      threadId: reqThreadId,
      rateSource = 'binance',
    } = await req.json();
    threadId = reqThreadId || `thread_${user.id}_${Date.now()}`;
    const recentMessages = trimMessageHistory(messages as UIMessage[], 10);

    // 4. Concurrently load checkpoint, accounts, and base_currency to minimize TTFT
    const repository = createServerAppRepository({ supabase });
    const DEFAULT_BASE_CURRENCY = 'USD';

    const fetchBaseCurrency = async () => {
      try {
        if (typeof supabase?.from !== 'function') {
          return { data: null, error: null };
        }
        return await supabase
          .from('users')
          .select('base_currency')
          .eq('id', user.id)
          .single();
      } catch (thrownError) {
        logger.warn(
          '[AI Chat] base_currency lookup threw; falling back to USD',
          thrownError
        );
        return { data: null, error: thrownError };
      }
    };

    const fetchActiveRate = async (): Promise<number | undefined> => {
      const table =
        rateSource === 'binance'
          ? 'binance_rate_history'
          : rateSource === 'bcv_usd' || rateSource === 'bcv_eur'
            ? 'bcv_rate_history'
            : undefined;
      if (!table || typeof supabase?.from !== 'function') return undefined;
      try {
        const { data, error } = await supabase
          .from(table)
          .select('usd, source')
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error || !data || !data.source || isFallbackSource(data.source))
          return undefined;
        const rate = Number(data.usd);
        return Number.isFinite(rate) && rate > 0 ? rate : undefined;
      } catch (error) {
        logger.warn('[AI Chat] Exchange rate lookup failed', error);
        return undefined;
      }
    };

    const [
      checkpoint,
      accounts,
      categories,
      pastTransactions,
      profileResult,
      usdVesRate,
    ] = await Promise.all([
      checkpointer.load(threadId, user.id).catch((err) => {
        logger.warn('[AI Chat] Checkpoint load failed; continuing', err);
        return null;
      }),
      repository.accounts.findByUserId(user.id).catch((err) => {
        logger.warn('[AI Chat] Accounts lookup failed', err);
        return [];
      }),
      repository.categories.findAll().catch((err) => {
        logger.warn('[AI Chat] Categories lookup failed', err);
        return [];
      }),
      // History only improves categories: a failure must not block the chat.
      Promise.resolve()
        .then(() => repository.transactions.findAll(HISTORY_LOOKBACK))
        .catch((err) => {
          logger.warn('[AI Chat] History lookup failed', err);
          return [];
        }),
      fetchBaseCurrency(),
      fetchActiveRate(),
    ]);

    if (checkpoint) {
      logger.info('[AI Chat] Resuming from checkpoint', checkpoint.stepNumber);
    }

    const userContext = {
      userId: user.id,
      accounts: (accounts || []).map((a) => ({
        name: a.name,
        currencyCode: a.currencyCode,
      })),
      categories: (categories || [])
        .filter(
          (c) =>
            c.active !== false && (c.userId === null || c.userId === user.id)
        )
        .map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
      history: buildHistoryHints(pastTransactions || [], categories || []),
    };

    let baseCurrencyCode = DEFAULT_BASE_CURRENCY;
    const { data: profileRow, error: profileError } = profileResult || {};
    if (profileError) {
      logger.warn(
        '[AI Chat] base_currency lookup failed; falling back to USD',
        profileError
      );
    } else if (!profileRow?.base_currency) {
      logger.warn(
        '[AI Chat] base_currency missing on profile; falling back to USD',
        { userId: user.id }
      );
    } else {
      baseCurrencyCode = profileRow.base_currency;
    }

    // 5. Define tools with HITL wrappers (production default: real
    // approval.ts functions, since `approvals` is omitted here).
    const tools = buildChatTools({
      userId: user.id,
      threadId,
      repository,
      supabase,
      baseCurrencyCode,
      accounts,
      usdVesRate,
    });

    // 6. Execute with Recovery & State
    const result = await circuitBreaker.execute(() =>
      retryWithBackoff(
        async () => {
          const streamResult = await streamWithFallback({
            model: getAIModel(),
            system: buildSystemPrompt(userContext),
            messages: await convertToModelMessages(recentMessages),
            tools,
            temperature: AI_CONFIG.temperature,
            userId: user.id,
            onFinish: async (completion) => {
              // 7. Auto-Verification & Checkpointing (Async)

              // Save Checkpoint
              await checkpointer.save({
                threadId,
                userId: user.id,
                stepNumber: (checkpoint?.stepNumber || 0) + 1,
                data: {
                  messages: [
                    ...messages,
                    { role: 'assistant', content: completion.text },
                  ],
                  toolCalls: completion.toolCalls,
                  metadata: { timestamp: new Date().toISOString() },
                },
              });

              // Verify Response
              await verify(
                completion.text,
                messages[messages.length - 1].content as string, // User prompt
                `${threadId}_${Date.now()}`,
                user.id
              );
            },
          });
          return streamResult;
        },
        {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoff: 'exponential',
        }
      )
    );

    return createResilientStreamResponse(result, {
      onError: (error) => {
        logger.error('[AI Chat] Stream Error:', error);
        if (NoSuchToolError.isInstance(error)) {
          return 'The AI tried to use an unknown tool. Please try rephrasing your request.';
        } else if (InvalidToolInputError.isInstance(error)) {
          return 'The AI provided invalid inputs to a tool. Please try again.';
        } else {
          return 'An error occurred while processing your request. Please try again.';
        }
      },
    });
  } catch (error) {
    // Never leak internal error messages to the client. The actual error is
    // logged server-side; provider configuration failures map to a safe 503.
    logger.error('[AI Chat] Error:', error);
    if (error instanceof AIConfigurationError) {
      return Response.json(
        {
          error:
            'AI provider is not configured correctly. Please try again later.',
        },
        { status: 503 }
      );
    }
    return Response.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}
