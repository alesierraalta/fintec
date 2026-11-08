import { toMinorUnits } from '@/lib/money';
import type { ScannedReceiptResult } from '@/lib/ai/receipt-scanner/types';
import { TransactionType, type CreateTransactionDTO } from '@/types/domain';
import {
  isGenericPendingName,
  type PendingReceiptMatch,
  type PendingReceiptSlot,
} from './match-pending';

export function receiptCurrenciesMatch(left: string, right: string): boolean {
  const normalize = (currency: string) => currency === 'USDT' ? 'USD' : currency;
  return normalize(left) === normalize(right);
}

export interface PlannedReceiptTransaction {
  pendingId: string;
  transaction: CreateTransactionDTO;
}

/**
 * Turns matched receipts into the expenses the user announced without
 * amounts. A receipt is only ready when it lands on an account whose
 * currency is the receipt's currency; otherwise the user picks the account.
 */
export function planReceiptTransactions(params: {
  pending: PendingReceiptSlot[];
  scans: Array<{ index: number; result: ScannedReceiptResult }>;
  assignments: PendingReceiptMatch['assignments'];
  accounts: Array<{ id: string; currencyCode: string }>;
  /** Accounts the user picked per pending id. */
  accountOverrides: Record<string, string>;
  baseCurrency: string;
  usdVesRate?: number;
}): { ready: PlannedReceiptTransaction[]; needsAccount: string[]; needsRate: string[] } {
  const ready: PlannedReceiptTransaction[] = [];
  const needsAccount: string[] = [];
  const needsRate: string[] = [];

  for (const assignment of params.assignments) {
    const pending = params.pending.find((p) => p.id === assignment.pendingId);
    const scan = params.scans.find((s) => s.index === assignment.scanIndex);
    if (!pending || !scan) continue;
    const { result } = scan;

    const accountId =
      params.accountOverrides[pending.id] ?? result.suggestedAccountId;
    const account = params.accounts.find((a) => a.id === accountId);
    if (!account || !receiptCurrenciesMatch(account.currencyCode, result.currency)) {
      needsAccount.push(pending.id);
      continue;
    }

    const needsConversion = !receiptCurrenciesMatch(account.currencyCode, params.baseCurrency);
    const rate = params.usdVesRate;
    const supportedPair =
      (receiptCurrenciesMatch(account.currencyCode, 'VES') && receiptCurrenciesMatch(params.baseCurrency, 'USD')) ||
      (receiptCurrenciesMatch(account.currencyCode, 'USD') && receiptCurrenciesMatch(params.baseCurrency, 'VES'));
    if (needsConversion && (!supportedPair || rate === undefined || !Number.isFinite(rate) || rate <= 0)) {
      needsRate.push(pending.id);
      continue;
    }

    ready.push({
      pendingId: pending.id,
      transaction: {
        type: TransactionType.EXPENSE,
        accountId: account.id,
        categoryId: result.suggestedCategoryId,
        currencyCode: account.currencyCode,
        amountMinor: toMinorUnits(result.amount, account.currencyCode),
        ...(needsConversion ? { exchangeRate: rate } : {}),
        date: result.date.slice(0, 10),
        description: isGenericPendingName(pending.name)
          ? result.suggestedDescription
          : pending.name,
        note: result.formattedNotes,
      },
    });
  }

  return { ready, needsAccount, needsRate };
}
