export type AgentIntent =
  | 'create_expense'
  | 'create_income'
  | 'create_transfer'
  | 'deferred_expenses'
  | 'query'
  | 'search'
  | 'balance'
  | 'ambiguous_needs_clarification';

export const AGENT_INTENTS: AgentIntent[] = [
  'create_expense',
  'create_income',
  'create_transfer',
  'deferred_expenses',
  'query',
  'search',
  'balance',
  'ambiguous_needs_clarification',
];

export type AgentCurrency = 'USD' | 'VES' | 'USDT';

export interface AgentEvalCase {
  id: string;
  utterance: string;
  intent: AgentIntent;
  /** Hand-written hard case (true) or template-generated (false). */
  hard: boolean;
  expected: {
    type?: 'INCOME' | 'EXPENSE';
    category?: string;
    /** Account the money leaves (expense/transfer) or enters (income). */
    account?: string;
    /** Destination account of a transfer. */
    toAccount?: string;
    amount?: number;
    currency?: AgentCurrency;
    /** Number of amount-less expenses announced (deferred_expenses). */
    count?: number;
  };
}

/** Tool the agent is expected to call for each intent; null = ask, no write. */
export const EXPECTED_TOOL: Record<AgentIntent, string | null> = {
  create_expense: 'createTransaction',
  create_income: 'createTransaction',
  create_transfer: 'createTransfer',
  deferred_expenses: 'createPendingExpenses',
  query: 'queryTransactions',
  search: 'searchTransactions',
  balance: 'getAccountBalance',
  ambiguous_needs_clarification: null,
};
