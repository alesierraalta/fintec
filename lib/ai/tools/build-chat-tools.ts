import { tool } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppRepository } from '@/repositories/contracts';
import type { Account } from '@/types/domain';
import { toolsResolvers } from './resolvers';
import * as schemas from './schemas';
import { formatAccountBalance } from './formatters';
import {
  shouldRequestApproval,
  requestApproval as productionRequestApproval,
  waitForApproval as productionWaitForApproval,
} from '@/lib/ai/hitl';

/**
 * HITL approval port. `requestApproval`/`waitForApproval`
 * (lib/ai/hitl/approval.ts:13,29) construct their own request-scoped
 * Supabase client internally and accept no injected client, so they are
 * NOT injectable through `ToolContext` alone. This port lets a caller
 * (e.g. the eval harness) substitute a deterministic implementation while
 * production continues to bind to the real `approval.ts` functions.
 */
export interface ApprovalsPort {
  requestApproval: typeof productionRequestApproval;
  waitForApproval: typeof productionWaitForApproval;
}

export interface BuildChatToolsDeps {
  userId: string;
  threadId: string;
  repository: AppRepository;
  supabase: SupabaseClient;
  baseCurrencyCode: string;
  /** Accounts preloaded by the chat route; injected to avoid a duplicate query. */
  accounts?: Account[];
  /**
   * Optional HITL port. Defaults to the real `lib/ai/hitl/approval.ts`
   * functions when omitted — production behavior is unchanged.
   */
  approvals?: ApprovalsPort;
}

/**
 * Builds the five HITL-wrapped chat tools bound to a request's user/thread/
 * repository/supabase context. Extracted verbatim (no logic changes) from
 * the inline `tools` object previously defined at
 * app/api/chat/route.ts:110-194.
 */
export function buildChatTools(deps: BuildChatToolsDeps) {
  const { userId, threadId, repository, supabase, baseCurrencyCode, accounts } =
    deps;
  const approvals = deps.approvals ?? {
    requestApproval: productionRequestApproval,
    waitForApproval: productionWaitForApproval,
  };

  return {
    createTransaction: tool({
      description: 'Create a new financial transaction (expense or income).',
      inputSchema: schemas.createTransactionSchema,
      execute: async (args: any) => {
        // HITL Check
        if (shouldRequestApproval('createTransaction', args)) {
          const requestId = await approvals.requestApproval({
            userId,
            threadId,
            actionType: 'createTransaction',
            actionData: args,
            riskLevel: 'MEDIUM',
            message: `Approve transaction: ${args.type} of ${args.amount} for ${args.category}?`,
          });

          // Wait for approval (blocking for now, ideal: return special status)
          // Note: If timeout, it throws. AI will report error to user.
          const { approved } = await approvals.waitForApproval(
            requestId,
            45000
          ); // 45s timeout to fit in maxDuration
          if (!approved) throw new Error('Transaction rejected by user.');
        }
        return toolsResolvers.createTransaction(args, {
          userId,
          repository,
        });
      },
    }),
    queryTransactions: tool({
      description:
        'Filter and aggregate transactions by date range, amount range, category, or account (sum, count, average, or group-by breakdown). Use this for questions like "how much did I spend on X" or "break down my spending by category" — NOT for fuzzy/typo-tolerant lookups.',
      inputSchema: schemas.queryTransactionsSchema,
      execute: async (args: any) =>
        toolsResolvers.queryTransactions(args, {
          userId,
          repository,
          supabase,
          baseCurrencyCode,
        }),
    }),
    searchTransactions: tool({
      description:
        'Fuzzy/semantic search over past transactions by merchant name or description (typo-tolerant, accent-insensitive). Use this for questions like "find my Netflix charges" — NOT for aggregates like totals or averages.',
      inputSchema: schemas.searchTransactionsSchema,
      execute: async (args: any) =>
        toolsResolvers.searchTransactions(args, {
          userId,
          repository,
          supabase,
        }),
    }),
    getAccountBalance: tool({
      description: 'Check the balance of specific or all accounts.',
      inputSchema: schemas.getAccountBalanceSchema,
      outputSchema: schemas.accountBalanceResultSchema,
      execute: async (args: any) =>
        toolsResolvers.getAccountBalance(args, {
          userId,
          repository,
          accounts,
        }),
      toModelOutput: ({ output }) => ({
        type: 'text',
        value:
          output.status === 'success'
            ? formatAccountBalance(
                output.accounts.map(({ name, balanceMinor, currencyCode }) => ({
                  name,
                  balance: balanceMinor,
                  currencyCode,
                }))
              )
            : output.message,
      }),
    }),
    createGoal: tool({
      description: 'Create a new financial goal.',
      inputSchema: schemas.createGoalSchema,
      execute: async (args: any) => {
        // Critical Action: Always require approval defined in policy
        if (shouldRequestApproval('createGoal', args)) {
          const requestId = await approvals.requestApproval({
            userId,
            threadId,
            actionType: 'createGoal',
            actionData: args,
            riskLevel: 'HIGH',
            message: `Approve new goal: ${args.name} for amount ${args.targetAmount}?`,
          });
          const { approved } = await approvals.waitForApproval(
            requestId,
            45000
          );
          if (!approved) throw new Error('Goal creation rejected by user.');
        }
        return toolsResolvers.createGoal(args, {
          userId,
          repository,
          baseCurrencyCode,
        });
      },
    }),
  };
}
