import { tool } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppRepository } from '@/repositories/contracts';
import type { Account } from '@/types/domain';
import { toolsResolvers } from './resolvers';
import * as schemas from './schemas';
import { formatAccountBalance, formatTransactionCreated } from './formatters';
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
      outputSchema: schemas.createTransactionResultSchema,
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
      toModelOutput: ({ output }) => ({
        type: 'text',
        value:
          typeof output === 'string'
            ? output
            : output.status === 'success'
              ? formatTransactionCreated({
                  description: output.transaction.description,
                  amountBaseMinor: output.transaction.amountMinor,
                  currencyCode: output.transaction.currencyCode,
                  type: output.transaction.type,
                  categoryName: output.transaction.categoryName,
                  date: output.transaction.date,
                })
              : output.message,
      }),
    }),
    createTransfer: tool({
      description:
        "Move money between two of the user's OWN accounts (e.g. Zelle to Binance, Banesco to Mercantil, cash deposit into a bank). Use this, NEVER createTransaction, whenever money only changes account. Paying a third party is an expense, not a transfer.",
      inputSchema: schemas.createTransferSchema,
      outputSchema: schemas.createTransferResultSchema,
      execute: async (args: any) => {
        if (shouldRequestApproval('createTransfer', args)) {
          const requestId = await approvals.requestApproval({
            userId,
            threadId,
            actionType: 'createTransfer',
            actionData: args,
            riskLevel: 'MEDIUM',
            message: `Transferir ${args.amount} de ${args.fromAccountName} a ${args.toAccountName}?`,
          });
          const { approved } = await approvals.waitForApproval(
            requestId,
            45000
          );
          if (!approved) throw new Error('Transfer rejected by user.');
        }
        return toolsResolvers.createTransfer(args, { userId, repository });
      },
      toModelOutput: ({ output }) => ({
        type: 'text',
        value:
          output.status === 'success'
            ? `Transfer created: ${output.transfer.fromAccountName} -> ${output.transfer.toAccountName} (${output.transfer.fromAmountMinor ?? ''} ${output.transfer.fromCurrency ?? ''} minor units). No expense was recorded.`
            : output.message,
      }),
    }),
    reclassifyExpenseAsTransfer: tool({
      description:
        'Repair a transfer between own accounts that was recorded as an expense: converts that expense into a transfer so both balances become correct without a manual reconciliation.',
      inputSchema: schemas.reclassifyExpenseAsTransferSchema,
      outputSchema: schemas.reclassifyExpenseAsTransferResultSchema,
      execute: async (args: any) => {
        if (shouldRequestApproval('reclassifyExpenseAsTransfer', args)) {
          const requestId = await approvals.requestApproval({
            userId,
            threadId,
            actionType: 'reclassifyExpenseAsTransfer',
            actionData: args,
            riskLevel: 'HIGH',
            message: `Convertir el gasto de ${args.amount} en ${args.fromAccountName} en una transferencia a ${args.toAccountName}?`,
          });
          const { approved } = await approvals.waitForApproval(
            requestId,
            45000
          );
          if (!approved) throw new Error('Conversion rejected by user.');
        }
        return toolsResolvers.reclassifyExpenseAsTransfer(args, {
          userId,
          repository,
        });
      },
      toModelOutput: ({ output }) => ({
        type: 'text',
        value:
          output.status === 'success'
            ? `Expense ${output.converted.transactionId} (${output.converted.date}) converted into a transfer ${output.converted.fromAccountName} -> ${output.converted.toAccountName}. Both balances are now correct.`
            : output.message,
      }),
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
