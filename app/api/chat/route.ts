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

    // Load Checkpoint (Resume State)
    const checkpoint = await checkpointer.load(threadId, user.id);
    if (checkpoint) {
      logger.info('[AI Chat] Resuming from checkpoint', checkpoint.stepNumber);
      // In a real agent loop, we would restore context from checkpoint.
      // For this implementation, we just log it and proceed with provided messages
      // as the frontend sends full history.
    }

    // 4. Build user context
    const repository = createServerAppRepository({ supabase });
    const accounts = await repository.accounts.findByUserId(user.id);
    const userContext = {
      userId: user.id,
      accounts: accounts.map((a) => ({
        name: a.name,
        currencyCode: a.currencyCode,
      })),
    };

    // Base currency (profile `base_currency`, defaults to 'USD' — mirrors
    // contexts/auth-context.tsx:93,117-122's client-side equivalent fetch).
    // A lookup failure must not fail the whole chat request, but it must never
    // pass unnoticed either: base currency drives minor-unit conversion for
    // query filter bounds and goal targets, so a wrong fallback silently
    // misconverts amounts for any user whose base currency is not USD.
    // `supabase-js` resolves with `{ data, error }` instead of throwing, so the
    // error is inspected explicitly rather than relying on the catch block.
    const DEFAULT_BASE_CURRENCY = 'USD';
    let baseCurrencyCode = DEFAULT_BASE_CURRENCY;
    try {
      const { data: profileRow, error: profileError } = await supabase
        .from('users')
        .select('base_currency')
        .eq('id', user.id)
        .single();

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
    } catch (thrownError) {
      logger.warn(
        '[AI Chat] base_currency lookup threw; falling back to USD',
        thrownError
      );
    }

    // 5. Define tools with HITL wrappers (production default: real
    // approval.ts functions, since `approvals` is omitted here).
    const tools = buildChatTools({
      userId: user.id,
      threadId,
      repository,
      supabase,
      baseCurrencyCode,
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
