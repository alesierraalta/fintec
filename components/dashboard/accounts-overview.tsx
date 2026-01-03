import { memo, useMemo } from 'react';
import { CreditCard, Wallet, Banknote, TrendingUp, TrendingDown } from 'lucide-react';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { fromMinorUnits } from '@/lib/money';
import { useBCVRates } from '@/hooks/use-bcv-rates';

export const AccountsOverview = memo(function AccountsOverview() {
  const { accounts: rawAccounts, transactions: rawTransactions, loading } = useOptimizedData();
  const bcvRates = useBCVRates();

  // Memoized formatted accounts with real percentage changes
  const { accounts, totalBalance, totalBalanceChange } = useMemo(() => {
    if (!rawAccounts.length) return { accounts: [], totalBalance: 0, totalBalanceChange: null };

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    // Calculate transactions per account for current and previous month
    const accountTransactions = rawTransactions.reduce((acc, t) => {
      const date = new Date(t.date);
      const month = date.getMonth();
      const year = date.getFullYear();
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

      if (month === thisMonth && year === thisYear) {
        acc[accountId].currentMonth += amount;
      } else if (month === lastMonth && year === lastMonthYear) {
        acc[accountId].lastMonth += amount;
      }

      return acc;
    }, {} as Record<string, { currentMonth: number; lastMonth: number }>);

    // Mapear las cuentas para la UI con cambios reales
    const formattedAccounts = rawAccounts.map(account => {
      const balanceMinor = Number(account.balance) || 0;
      const balanceMajor = fromMinorUnits(balanceMinor, account.currencyCode);

      const accountTxs = accountTransactions[account.id];
      let change = 'Nuevo';
      let changeType: 'positive' | 'negative' | 'neutral' = 'neutral';

      if (accountTxs && accountTxs.lastMonth !== 0) {
        // Calculate balance at start of current month
        const previousBalance = balanceMajor - accountTxs.currentMonth;

        if (previousBalance !== 0) {
          const percentChange = ((balanceMajor - previousBalance) / Math.abs(previousBalance)) * 100;
          change = percentChange >= 0 ? `+${percentChange.toFixed(1)}%` : `${percentChange.toFixed(1)}%`;
          changeType = percentChange >= 0 ? 'positive' : 'negative';
        }
      } else if (accountTxs && accountTxs.currentMonth !== 0) {
        // Has transactions this month but not last month - show growth
        const previousBalance = balanceMajor - accountTxs.currentMonth;
        if (previousBalance !== 0 && balanceMajor !== previousBalance) {
          const percentChange = ((balanceMajor - previousBalance) / Math.abs(previousBalance)) * 100;
          change = percentChange >= 0 ? `+${percentChange.toFixed(1)}%` : `${percentChange.toFixed(1)}%`;
          changeType = percentChange >= 0 ? 'positive' : 'negative';
        }
      }

      return {
        id: account.id,
        name: account.name,
        type: account.type || 'Cuenta',
        balance: account.currencyCode === 'VES' ? `Bs.${balanceMajor.toFixed(2)} VES` : `$${balanceMajor.toFixed(2)} ${account.currencyCode}`,
        icon: account.type === 'CARD' ? CreditCard :
          account.type === 'CASH' ? Banknote : Wallet,
        changeType,
        change,
        active: account.active
      };
    });

    // Calcular balance total actual (con conversión BCV como header)
    const total = rawAccounts.reduce((sum, acc) => {
      const balanceMinor = Number(acc.balance) || 0;
      const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);

      // Apply BCV conversion for VES currency (same as header)
      if (acc.currencyCode === 'VES') {
        return sum + (balanceMajor / bcvRates.usd);
      }
      return sum + balanceMajor;
    }, 0);

    // Calculate total balance change comparing current vs previous month
    let balanceChange = null;
    if (rawTransactions.length > 0) {
      const totalCurrentMonthTransactions = rawTransactions
        .filter(t => {
          const date = new Date(t.date);
          return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
        })
        .reduce((sum, t) => {
          const amountMajor = fromMinorUnits(t.amountMinor, t.currencyCode);
          // Convert VES to USD for consistent calculation
          if (t.currencyCode === 'VES') {
            return sum + (amountMajor / bcvRates.usd);
          }
          return sum + amountMajor;
        }, 0);

      const totalLastMonthTransactions = rawTransactions
        .filter(t => {
          const date = new Date(t.date);
          return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        })
        .reduce((sum, t) => {
          const amountMajor = fromMinorUnits(t.amountMinor, t.currencyCode);
          // Convert VES to USD for consistent calculation
          if (t.currencyCode === 'VES') {
            return sum + (amountMajor / bcvRates.usd);
          }
          return sum + amountMajor;
        }, 0);

      const previousBalance = total - totalCurrentMonthTransactions;

      if (previousBalance !== 0 && totalLastMonthTransactions !== 0) {
        const percentChange = ((total - previousBalance) / Math.abs(previousBalance)) * 100;
        balanceChange = percentChange >= 0 ? `+${percentChange.toFixed(1)}%` : `${percentChange.toFixed(1)}%`;
      }
    }

    return { accounts: formattedAccounts, totalBalance: total, totalBalanceChange: balanceChange };
  }, [rawAccounts, rawTransactions, bcvRates.usd]);

  return (
    <div className="space-y-6">
      {/* iOS-style Header */}
      <div className="text-center">
        <p className="text-ios-caption font-medium tracking-wide text-muted-foreground uppercase mb-2">Cuentas</p>
        <h3 className="text-ios-title font-semibold text-foreground">Resumen General</h3>
      </div>

      <div className="space-y-3">
        {accounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-muted/20 rounded-full mx-auto mb-6 flex items-center justify-center backdrop-blur-sm">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-ios-headline font-medium text-foreground mb-3">Sin cuentas registradas</h3>
            <p className="text-ios-body text-muted-foreground mb-6">Configura tu primera cuenta para comenzar</p>
            <button className="text-ios-body text-primary font-medium bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-xl transition-ios backdrop-blur-sm">
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
                    icon: 'text-blue-600'
                  };
                case 'CASH':
                  return {
                    bg: 'bg-green-500/10',
                    border: 'border-green-500/20',
                    icon: 'text-green-600'
                  };
                default:
                  return {
                    bg: 'bg-purple-500/10',
                    border: 'border-purple-500/20',
                    icon: 'text-purple-600'
                  };
              }
            };
            const colors = getAccountColor(account.type);

            return (
              <div key={account.id} className="flex items-center justify-between p-4 bg-card/40 rounded-2xl border border-border/15 backdrop-blur-xl hover:bg-card/60 transition-ios shadow-ios-sm hover:shadow-ios-md hover:scale-[1.01]">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl ${colors.bg} border ${colors.border} backdrop-blur-sm shadow-ios-xs`}>
                    <account.icon className={`h-5 w-5 ${colors.icon}`} />
                  </div>
                  <div>
                    <p className="text-ios-body font-semibold text-foreground mb-0.5">{account.name}</p>
                    <p className="text-ios-caption text-muted-foreground">{account.type}</p>
                    {!account.active && (
                      <span className="text-ios-caption text-orange-600 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20 backdrop-blur-sm mt-1 inline-block">Inactiva</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-ios-body font-semibold amount-emphasis-white text-white">{account.balance}</p>
                  <div className="flex items-center justify-end mt-1">
                    {account.change !== 'Nuevo' && (
                      <>
                        {account.changeType === 'positive' ? (
                          <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                        ) : account.changeType === 'negative' ? (
                          <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                        ) : null}
                        <p className={`text-ios-caption font-medium ${account.changeType === 'positive' ? 'text-green-600' :
                          account.changeType === 'negative' ? 'text-red-600' :
                            'text-muted-foreground'
                          }`}>
                          {account.change}
                        </p>
                      </>
                    )}
                    {account.change === 'Nuevo' && (
                      <span className="text-ios-caption text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 font-medium">
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
      <div className="pt-6 border-t border-border/10">
        <div className="text-center bg-gradient-to-br from-blue-500/8 to-purple-500/8 rounded-2xl p-6 backdrop-blur-xl border border-blue-500/15 shadow-ios-sm">
          <p className="text-ios-caption font-semibold uppercase tracking-wide text-muted-foreground mb-3">Balance Total</p>
          <p className="text-ios-large-title font-bold amount-emphasis-white text-white">${totalBalance.toFixed(2)}</p>
          {totalBalanceChange && (
            <div className="flex items-center justify-center mt-2">
              {totalBalanceChange.startsWith('+') ? (
                <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600 mr-2" />
              )}
              <p className={`text-ios-caption font-medium ${totalBalanceChange.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                {totalBalanceChange} este mes
              </p>
            </div>
          )}
          {!totalBalanceChange && (
            <p className="text-ios-caption text-muted-foreground mt-2">Primer mes</p>
          )}
        </div>
      </div>
    </div>
  );
});
