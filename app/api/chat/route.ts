import { createClient } from '@/lib/supabase/server';
import {
  convertToModelMessages,
  NoSuchToolError,
  InvalidToolInputError,
} from 'ai';
import { buildChatTools } from '@/lib/ai/tools/build-chat-tools';
import { streamWithFallback } from '@/lib/ai/stream-with-fallback';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import {
  AI_CONFIG,
  AIConfigurationError,
  buildSystemPrompt,
  getAIModel,
} from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';
import { createServerAppRepository } from '@/repositories/factory';

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
    const { messages, threadId: reqThreadId } = await req.json();
    threadId = reqThreadId || `thread_${user.id}_${Date.now()}`;

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

    const [checkpoint, accounts, profileResult] = await Promise.all([
      checkpointer.load(threadId, user.id).catch((err) => {
        logger.warn('[AI Chat] Checkpoint load failed; continuing', err);
        return null;
      }),
      repository.accounts.findByUserId(user.id).catch((err) => {
        logger.warn('[AI Chat] Accounts lookup failed', err);
        return [];
      }),
      fetchBaseCurrency(),
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
    });

    // 6. Execute with Recovery & State
    const result = await circuitBreaker.execute(() =>
      retryWithBackoff(
        async () => {
          const streamResult = await streamWithFallback({
            model: getAIModel(),
            system: buildSystemPrompt(userContext),
            messages: await convertToModelMessages(messages),
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

    return result.toUIMessageStreamResponse({
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
