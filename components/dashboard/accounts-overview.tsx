import { memo, useMemo } from 'react';
import {
  CreditCard,
  Wallet,
  Banknote,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { fromMinorUnits } from '@/lib/money';
import { useBCVRates } from '@/hooks/use-bcv-rates';

export const AccountsOverview = memo(function AccountsOverview() {
  const {
    accounts: rawAccounts,
    transactions: rawTransactions,
    loading,
  } = useOptimizedData();
  const bcvRates = useBCVRates();

  // Memoized formatted accounts with real percentage changes
  const { accounts, totalBalance, totalBalanceChange } = useMemo(() => {
    if (!rawAccounts.length)
      return { accounts: [], totalBalance: 0, totalBalanceChange: null };

    const now = new Date();

    // Generate prefixes like "YYYY-MM" to avoid timezone parsing issues with "YYYY-MM-DD"
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const previousMonthDate = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );
    const lastMonthPrefix = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Calculate transactions per account for current and previous month
    const accountTransactions = rawTransactions.reduce(
      (acc, t) => {
        const isCurrentMonth = t.date && t.date.startsWith(currentMonthPrefix);
        const isLastMonth = t.date && t.date.startsWith(lastMonthPrefix);
        const accountId = t.accountId;

        if (!acc[accountId]) {
          acc[accountId] = { currentMonth: 0, lastMonth: 0 };
        }

        // Convert to major units with proper currency handling
        const amountMajor = fromMinorUnits(t.amountMinor, t.currencyCode);
        let amountUSD = amountMajor;

        // Convert VES to USD for consistent calculation
        if (t.currencyCode === 'VES') {
          amountUSD = amountMajor / bcvRates.usd;
        }

        const amount = amountUSD;

        if (isCurrentMonth) {
          acc[accountId].currentMonth += amount;
        } else if (isLastMonth) {
          acc[accountId].lastMonth += amount;
        }

        return acc;
      },
      {} as Record<string, { currentMonth: number; lastMonth: number }>
    );

    // Mapear las cuentas para la UI con cambios reales
    const formattedAccounts = rawAccounts.map((account) => {
      const balanceMinor = Number(account.balance) || 0;
      const balanceMajor = fromMinorUnits(balanceMinor, account.currencyCode);

      const accountTxs = accountTransactions[account.id];
      let change = 'Nuevo';
      let changeType: 'positive' | 'negative' | 'neutral' = 'neutral';

      if (accountTxs && accountTxs.lastMonth !== 0) {
        // Calculate balance at start of current month
        const previousBalance = balanceMajor - accountTxs.currentMonth;

        if (previousBalance !== 0) {
          const percentChange =
            ((balanceMajor - previousBalance) / Math.abs(previousBalance)) *
            100;
          change =
            percentChange >= 0
              ? `+${percentChange.toFixed(1)}%`
              : `${percentChange.toFixed(1)}%`;
          changeType = percentChange >= 0 ? 'positive' : 'negative';
        }
      } else if (accountTxs && accountTxs.currentMonth !== 0) {
        // Has transactions this month but not last month - show growth
        const previousBalance = balanceMajor - accountTxs.currentMonth;
        if (previousBalance !== 0 && balanceMajor !== previousBalance) {
          const percentChange =
            ((balanceMajor - previousBalance) / Math.abs(previousBalance)) *
            100;
          change =
            percentChange >= 0
              ? `+${percentChange.toFixed(1)}%`
              : `${percentChange.toFixed(1)}%`;
          changeType = percentChange >= 0 ? 'positive' : 'negative';
        }
      }

      return {
        id: account.id,
        name: account.name,
        type: account.type || 'Cuenta',
        balance:
          account.currencyCode === 'VES'
            ? `Bs.${balanceMajor.toFixed(2)} VES`
            : `$${balanceMajor.toFixed(2)} ${account.currencyCode}`,
        icon:
          account.type === 'CARD'
            ? CreditCard
            : account.type === 'CASH'
              ? Banknote
              : Wallet,
        changeType,
        change,
        active: account.active,
      };
    });

    // Calcular balance total actual (con conversión BCV como header)
    const total = rawAccounts.reduce((sum, acc) => {
      const balanceMinor = Number(acc.balance) || 0;
      const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);

      // Apply BCV conversion for VES currency (same as header)
      if (acc.currencyCode === 'VES') {
        return sum + balanceMajor / bcvRates.usd;
      }
      return sum + balanceMajor;
    }, 0);

    // Calculate total balance change comparing current vs previous month
    let balanceChange = null;
    if (rawTransactions.length > 0) {
      const totalCurrentMonthTransactions = rawTransactions
        .filter((t) => t.date && t.date.startsWith(currentMonthPrefix))
        .reduce((sum, t) => {
          const amountMajor = fromMinorUnits(t.amountMinor, t.currencyCode);
          // Convert VES to USD for consistent calculation
          if (t.currencyCode === 'VES') {
            return sum + amountMajor / bcvRates.usd;
          }
          return sum + amountMajor;
        }, 0);

      const totalLastMonthTransactions = rawTransactions
        .filter((t) => t.date && t.date.startsWith(lastMonthPrefix))
        .reduce((sum, t) => {
          const amountMajor = fromMinorUnits(t.amountMinor, t.currencyCode);
          // Convert VES to USD for consistent calculation
          if (t.currencyCode === 'VES') {
            return sum + amountMajor / bcvRates.usd;
          }
          return sum + amountMajor;
        }, 0);

      const previousBalance = total - totalCurrentMonthTransactions;

      if (previousBalance !== 0 && totalLastMonthTransactions !== 0) {
        const percentChange =
          ((total - previousBalance) / Math.abs(previousBalance)) * 100;
        balanceChange =
          percentChange >= 0
            ? `+${percentChange.toFixed(1)}%`
            : `${percentChange.toFixed(1)}%`;
      }
    }

    return {
      accounts: formattedAccounts,
      totalBalance: total,
      totalBalanceChange: balanceChange,
    };
  }, [rawAccounts, rawTransactions, bcvRates.usd]);

  return (
    <div className="space-y-6">
      {/* iOS-style Header */}
      <div className="text-center">
        <p className="mb-2 text-ios-caption font-medium uppercase tracking-wide text-muted-foreground">
          Cuentas
        </p>
        <h3 className="text-ios-title font-semibold text-foreground">
          Resumen General
        </h3>
      </div>

      <div className="space-y-3">
        {accounts.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-muted/20 backdrop-blur-sm">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="mb-3 text-ios-headline font-medium text-foreground">
              Sin cuentas registradas
            </h3>
            <p className="mb-6 text-ios-body text-muted-foreground">
              Configura tu primera cuenta para comenzar
            </p>
            <button className="transition-ios rounded-xl bg-primary/10 px-4 py-2 text-ios-body font-medium text-primary backdrop-blur-sm hover:bg-primary/20">
              Crear cuenta
            </button>
          </div>
        ) : (
          accounts.map((account) => {
            const getAccountColor = (type: string) => {
              switch (type) {
                case 'CARD':
                  return {
                    bg: 'bg-blue-500/10',
                    border: 'border-blue-500/20',
                    icon: 'text-blue-600',
                  };
                case 'CASH':
                  return {
                    bg: 'bg-green-500/10',
                    border: 'border-green-500/20',
                    icon: 'text-green-600',
                  };
                default:
                  return {
                    bg: 'bg-purple-500/10',
                    border: 'border-purple-500/20',
                    icon: 'text-purple-600',
                  };
              }
            };
            const colors = getAccountColor(account.type);

            return (
              <div
                key={account.id}
                className="transition-ios flex items-center justify-between rounded-2xl border border-border/15 bg-card/40 p-4 shadow-ios-sm backdrop-blur-xl hover:scale-[1.01] hover:bg-card/60 hover:shadow-ios-md"
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`rounded-xl p-3 ${colors.bg} border ${colors.border} shadow-ios-sm backdrop-blur-sm`}
                  >
                    <account.icon className={`h-5 w-5 ${colors.icon}`} />
                  </div>
                  <div>
                    <p className="mb-0.5 text-ios-body font-semibold text-foreground">
                      {account.name}
                    </p>
                    <p className="text-ios-caption text-muted-foreground">
                      {account.type}
                    </p>
                    {!account.active && (
                      <span className="mt-1 inline-block rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-1 text-ios-caption text-orange-600 backdrop-blur-sm">
                        Inactiva
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="amount-emphasis-main text-ios-body font-semibold">
                    {account.balance}
                  </p>
                  <div className="mt-1 flex items-center justify-end">
                    {account.change !== 'Nuevo' && (
                      <>
                        {account.changeType === 'positive' ? (
                          <TrendingUp className="mr-1 h-3 w-3 text-success" />
                        ) : account.changeType === 'negative' ? (
                          <TrendingDown className="mr-1 h-3 w-3 text-error" />
                        ) : null}
                        <p
                          className={`text-ios-caption font-medium ${
                            account.changeType === 'positive'
                              ? 'text-success'
                              : account.changeType === 'negative'
                                ? 'text-error'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {account.change}
                        </p>
                      </>
                    )}
                    {account.change === 'Nuevo' && (
                      <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-ios-caption font-medium text-blue-600">
                        Nuevo
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* iOS-style Total Balance */}
      <div className="border-t border-border/10 pt-6">
        <div className="ios-card bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 text-center">
          <p className="mb-3 text-ios-caption font-semibold uppercase tracking-wide text-muted-foreground">
            Balance Total
          </p>
          <p className="amount-emphasis-main text-ios-large-title font-bold">
            ${totalBalance.toFixed(2)}
          </p>
          {totalBalanceChange && (
            <div className="mt-2 flex items-center justify-center">
              {totalBalanceChange.startsWith('+') ? (
                <TrendingUp className="mr-2 h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="mr-2 h-4 w-4 text-error" />
              )}
              <p
                className={`text-ios-caption font-medium ${
                  totalBalanceChange.startsWith('+')
                    ? 'text-success'
                    : 'text-error'
                }`}
              >
                {totalBalanceChange} este mes
              </p>
            </div>
          )}
          {!totalBalanceChange && (
            <p className="mt-2 text-ios-caption text-muted-foreground">
              Primer mes
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
