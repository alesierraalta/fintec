import { createClient } from '@/lib/supabase/server';
import { streamText, tool, convertToModelMessages, NoSuchToolError, InvalidToolInputError, stepCountIs } from 'ai';
import { z } from 'zod';
import { toolsResolvers } from '@/lib/ai/tools/resolvers';
import * as schemas from '@/lib/ai/tools/schemas';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { AI_CONFIG, buildSystemPrompt, getAIModel, getGoogleModelFallbackChain, isQuotaExceededError } from '@/lib/ai/config';
import { google } from '@ai-sdk/google';
import { SupabaseAccountsRepository } from '@/repositories/supabase/accounts-repository-impl';

// Priority 1 Components
import { CircuitBreaker } from '@/lib/ai/recovery/circuit-breaker';
import { retryWithBackoff } from '@/lib/ai/recovery/retry';
import { verify } from '@/lib/ai/verification';
import { SupabaseCheckpointer } from '@/lib/ai/state/checkpointer';
import { shouldRequestApproval, requestApproval, waitForApproval } from '@/lib/ai/hitl';

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
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('[AI Chat Auth Error]', authError);
            return Response.json({ error: 'Unauthorized', details: authError?.message }, { status: 401 });
        }
        userId = user.id;

        // 2. Rate Limiting
        const { success, limit, remaining } = await checkRateLimit(user.id);

        if (!success) {
            return Response.json(
                { error: 'Rate limit exceeded', limit, remaining, message: 'Max messages per hour reached.' },
                { status: 429 }
            );
        }

        // 3. Parse request & Initialize State
        const { messages, threadId: reqThreadId } = await req.json();
        threadId = reqThreadId || `thread_${user.id}_${Date.now()}`;

        // Load Checkpoint (Resume State)
        const checkpoint = await checkpointer.load(threadId, user.id);
        if (checkpoint) {
            console.log('[AI Chat] Resuming from checkpoint', checkpoint.stepNumber);
            // In a real agent loop, we would restore context from checkpoint. 
            // For this implementation, we just log it and proceed with provided messages 
            // as the frontend sends full history.
        }

        // 4. Build user context
        const accountsRepo = new SupabaseAccountsRepository();
        const accounts = await accountsRepo.findByUserId(user.id);
        const userContext = {
            userId: user.id,
            accounts: accounts.map(a => ({ name: a.name, currencyCode: a.currencyCode })),
        };

        // 5. Define tools with HITL wrappers
        const tools = {
            createTransaction: tool({
                description: 'Create a new financial transaction (expense or income).',
                inputSchema: schemas.createTransactionSchema,
                execute: async (args) => {
                    // HITL Check
                    if (shouldRequestApproval('createTransaction', args)) {
                        const requestId = await requestApproval({
                            userId: user.id,
                            threadId,
                            actionType: 'createTransaction',
                            actionData: args,
                            riskLevel: 'MEDIUM',
                            message: `Approve transaction: ${args.type} of ${args.amount} for ${args.category}?`
                        });

                        // Wait for approval (blocking for now, ideal: return special status)
                        // Note: If timeout, it throws. AI will report error to user.
                        const { approved, response } = await waitForApproval(requestId, 45000); // 45s timeout to fit in maxDuration
                        if (!approved) throw new Error('Transaction rejected by user.');
                    }
                    return toolsResolvers.createTransaction(args, { userId: user.id, supabase });
                },
            }),
            getTransactions: tool({
                description: 'Search for past transactions by date, category, or semantic query.',
                inputSchema: schemas.getTransactionsSchema,
                execute: async (args) => toolsResolvers.getTransactions(args, { userId: user.id, supabase }),
            }),
            getAccountBalance: tool({
                description: 'Check the balance of specific or all accounts.',
                inputSchema: schemas.getAccountBalanceSchema,
                execute: async (args) => toolsResolvers.getAccountBalance(args, { userId: user.id, supabase }),
            }),
            createGoal: tool({
                description: 'Create a new financial goal.',
                inputSchema: schemas.createGoalSchema,
                execute: async (args) => {
                    // Critical Action: Always require approval defined in policy
                    if (shouldRequestApproval('createGoal', args)) {
                        const requestId = await requestApproval({
                            userId: user.id,
                            threadId,
                            actionType: 'createGoal',
                            actionData: args,
                            riskLevel: 'HIGH',
                            message: `Approve new goal: ${args.name} for amount ${args.targetAmount}?`
                        });
                        const { approved } = await waitForApproval(requestId, 45000);
                        if (!approved) throw new Error('Goal creation rejected by user.');
                    }
                    return toolsResolvers.createGoal(args, { userId: user.id, supabase });
                },
            }),
        };

        // 6. Execute with Recovery & State
        const result = await circuitBreaker.execute(() =>
            retryWithBackoff(async () => {
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
                                messages: [...messages, { role: 'assistant', content: completion.text }],
                                toolCalls: completion.toolCalls,
                                metadata: { timestamp: new Date().toISOString() }
                            }
                        });

                        // Verify Response
                        await verify(
                            completion.text,
                            messages[messages.length - 1].content as string, // User prompt
                            `${threadId}_${Date.now()}`,
                            user.id
                        );
                    }
                });
                return streamResult;
            }, { maxAttempts: 3, baseDelay: 1000, maxDelay: 10000, backoff: 'exponential' })
        );

        return result.toUIMessageStreamResponse({
            onError: (error) => {
                console.error('[AI Chat] Stream Error:', error);
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
        console.error('[AI Chat] Error:', error);
        return Response.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

async function streamWithFallback(params: {
    model: any;
    messages: any[];
    system: string;
    tools: any;
    temperature: number;
    userId: string;
    onFinish?: (completion: any) => Promise<void>;
}) {
    const provider = AI_CONFIG.provider;

    // Only apply provider fallback for Google
    if (provider !== 'google') {
        return streamText({
            model: params.model,
            system: params.system,
            messages: params.messages,
            tools: params.tools,
            temperature: params.temperature,
            onFinish: params.onFinish,
            stopWhen: stepCountIs(5), // Prevent infinite tool loops
        });
    }

    const fallbackChain = getGoogleModelFallbackChain();
    const modelsToTry = [fallbackChain.primary, ...fallbackChain.fallbacks];
    let lastError: Error | null = null;

    for (let i = 0; i < modelsToTry.length; i++) {
        const modelName = modelsToTry[i];

        try {
            if (i > 0) console.log(`[AI Chat] Fallback to: ${modelName}`);

            const result = streamText({
                model: i === 0 ? params.model : google(modelName),
                system: params.system,
                messages: params.messages,
                tools: params.tools,
                temperature: params.temperature,
                onFinish: params.onFinish,
                stopWhen: stepCountIs(5), // Prevent infinite tool loops
            });

            return result;

        } catch (error) {
            lastError = error as Error;
            if (isQuotaExceededError(error)) {
                console.warn(`[AI Chat] Quota exceeded for ${modelName}`);
                if (i === modelsToTry.length - 1) throw new Error('All AI models exhausted.');
                continue;
            }
            throw error;
        }
    }
    throw lastError || new Error('Fallback failed');
}
