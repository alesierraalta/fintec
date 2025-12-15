import { createClient } from '@/lib/supabase/server';
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { toolsResolvers } from '@/lib/ai/tools/resolvers';
import * as schemas from '@/lib/ai/tools/schemas';
import { RateLimiter } from '@/lib/ai/redis';
import { AI_CONFIG } from '@/lib/ai/config';
import { SupabaseAccountsRepository } from '@/repositories/supabase/accounts-repository-impl';
import { z } from 'zod'; // Import z for z.infer

export const maxDuration = 60; // Allow longer timeout for AI

export async function POST(req: Request) {
  const { messages } = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { success } = await RateLimiter.check(user.id);
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  // Context Injection
  const accountsRepo = new SupabaseAccountsRepository();
  const accounts = await accountsRepo.findByUserId(user.id);
  const accountContext = accounts.map(a => `${a.name} (${a.currencyCode})`).join(', ');

  type CreateTransactionArgs = z.infer<typeof schemas.createTransactionSchema>;
  type GetTransactionsArgs = z.infer<typeof schemas.getTransactionsSchema>;
  type GetAccountBalanceArgs = z.infer<typeof schemas.getAccountBalanceSchema>;

  const tools: any = {
      createTransaction: (tool as any)({
        description: 'Create a new financial transaction (expense or income).',
        parameters: schemas.createTransactionSchema,
        execute: async (args: CreateTransactionArgs): Promise<string> => JSON.stringify(await toolsResolvers.createTransaction(args, { userId: user.id })),
      }),
      getTransactions: (tool as any)({
        description: 'Search for past transactions by date, category, or semantic query.',
        parameters: schemas.getTransactionsSchema,
        execute: async (args: GetTransactionsArgs): Promise<string> => JSON.stringify(await toolsResolvers.getTransactions(args, { userId: user.id })),
      }),
      getAccountBalance: (tool as any)({
        description: 'Check the balance of specific or all accounts.',
        parameters: schemas.getAccountBalanceSchema,
        execute: async (args: GetAccountBalanceArgs): Promise<string> => JSON.stringify(await toolsResolvers.getAccountBalance(args, { userId: user.id })),
      }),
    };

  const result = streamText({
    model: openai(AI_CONFIG.model),
    system: `You are a specialized financial AI agent for the FinTec platform.
    
    User Context:
    - User ID: ${user.id}
    - Current Time: ${new Date().toLocaleString()}
    - Active Accounts: ${accountContext || 'None'}
    
    Capabilities:
    - You can create transactions, check balances, and search history.
    - If the user says "I spent $X on Y", infer the category or ask if unsure.
    - Always prefer using Tools over explaining how to do it.
    
    Style:
    - Concise, professional, and helpful.
    - Use emojis sparingly.`,
    messages,
    tools,
  });

  return result.toTextStreamResponse(); // Renamed
}
