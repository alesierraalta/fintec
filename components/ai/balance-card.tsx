import { formatCurrency } from '@/lib/ai/tools/formatters';

interface BalanceCardProps {
  accounts: Array<{ name: string; balanceMinor: number; currencyCode: string }>;
  /** Present only when at least one USD account matched; no invented zero. */
  usdSubtotalMinor?: number;
}

/**
 * Balance-specific card for validated `tool-getAccountBalance` output.
 * Separate-currency rows in integer minor units plus an optional USD subtotal.
 * No interactive elements: nothing to tap, nothing to focus.
 */
export function BalanceCard({ accounts, usdSubtotalMinor }: BalanceCardProps) {
  return (
    <div className="mt-2 w-full min-w-0 rounded-xl border border-border/50 bg-muted/40 p-3">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Saldo
      </h3>
      <ul className="space-y-1.5">
        {accounts.map((account) => (
          <li
            key={account.name}
            className="flex min-w-0 items-baseline justify-between gap-3"
          >
            <span className="min-w-0 truncate text-sm text-foreground">
              {account.name}
            </span>
            <span className="flex flex-shrink-0 items-baseline gap-1.5">
              <span className="text-sm font-semibold tabular-nums">
                {formatCurrency(account.balanceMinor, account.currencyCode)}
              </span>
              <span className="text-xs text-muted-foreground">
                {account.currencyCode}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {usdSubtotalMinor !== undefined && (
        <div className="mt-2 flex min-w-0 items-baseline justify-between gap-3 border-t border-border/50 pt-2">
          <span className="text-xs font-medium text-muted-foreground">
            Subtotal USD
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(usdSubtotalMinor, 'USD')}
          </span>
        </div>
      )}
    </div>
  );
}
