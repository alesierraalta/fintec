'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { QuickActions } from './quick-actions';
import { RecentTransactions } from './recent-transactions';
import { LazySpendingChart } from './lazy-spending-chart';
import { IncomeSources } from './income-sources';
import { AccountsOverview } from './accounts-overview';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { fromMinorUnits } from '@/lib/money';
import {
  deriveFreshness,
  formatDisplayMoney,
  liveMoney,
} from '@/lib/currency-display-policy';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { FreeLimitWarning } from '@/components/subscription/free-limit-warning';
import type { DashboardPeriodControllerProps } from './dashboard-period-props';
import {
  TrendingUp,
  TrendingDown,
  Heart,
  Smile,
  Eye,
  EyeOff,
} from 'lucide-react';

export function MobileDashboard(props: DashboardPeriodControllerProps) {
  const {
    accounts: rawAccounts,
    transactions: rawTransactions,
    loading,
    loadAllData,
  } = useOptimizedData();
  const usdEquivalentType = useAppStore((s) => s.selectedRateSource);
  const shouldFetchBinanceRates = usdEquivalentType === 'binance';
  const shouldFetchBcvRates = !shouldFetchBinanceRates;
  const bcvRates = useBCVRates({ enabled: shouldFetchBcvRates });
  const { rates: binanceRates } = useBinanceRates({
    enabled: shouldFetchBinanceRates,
  });

  // Use global rate source
  const [showBalances, setShowBalances] = useState(true);

  const scrollToQuickActions = useCallback(() => {
    document
      .getElementById('quick-actions')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Helper functions for rate calculation
  const getRateName = useCallback((rateType: string) => {
    switch (rateType) {
      case 'binance':
        return 'Binance';
      case 'bcv_usd':
        return 'BCV USD';
      case 'bcv_eur':
        return 'BCV EUR';
      default:
        return 'BCV USD';
    }
  }, []);

  const getExchangeRate = useCallback(
    (rateType: string) => {
      switch (rateType) {
        case 'binance':
          return binanceRates?.usd_ves || 1;
        case 'bcv_usd':
          return bcvRates?.usd || 1;
        case 'bcv_eur':
          return bcvRates?.eur || 1;
        default:
          return bcvRates?.usd || 1;
      }
    },
    [bcvRates, binanceRates]
  );

  // Live projection disclosure: the converted total is a CURRENT-rate estimate,
  // never equivalent to the historical totals. Classify it via the display
  // policy so source + freshness are visible to the beginner.
  const rateObservedAt = shouldFetchBcvRates
    ? bcvRates?.lastUpdated
    : binanceRates?.lastUpdated;
  const liveProjection = (amountMajor: number, rate: number) =>
    formatDisplayMoney(
      liveMoney({
        amountMinor: Math.round(amountMajor * 100),
        currencyCode: 'USD',
        rate,
        source: getRateName(usdEquivalentType),
        observedAt: rateObservedAt ?? new Date().toISOString(),
        freshness: deriveFreshness(rateObservedAt, Date.now()),
      })
    );

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Memoized total balance calculation
  const { totalBalance, totalBalanceVES, totalBalanceUSD } = useMemo(() => {
    if (!rawAccounts.length)
      return { totalBalance: 0, totalBalanceVES: 0, totalBalanceUSD: 0 };

    const balance = rawAccounts.reduce((sum, acc) => {
      const balanceMinor = Number(acc.balance) || 0;
      const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);

      // Apply dynamic conversion for VES currency
      if (acc.currencyCode === 'VES') {
        const rate = getExchangeRate(usdEquivalentType);
        return sum + balanceMajor / rate;
      }
      return sum + balanceMajor;
    }, 0);

    const balanceVES = rawAccounts
      .filter((acc) => acc.currencyCode === 'VES')
      .reduce((sum, acc) => {
        const balanceMinor = Number(acc.balance) || 0;
        return sum + fromMinorUnits(balanceMinor, acc.currencyCode);
      }, 0);

    const balanceUSD = rawAccounts
      .filter((acc) => acc.currencyCode === 'USD')
      .reduce((sum, acc) => {
        const balanceMinor = Number(acc.balance) || 0;
        return sum + fromMinorUnits(balanceMinor, acc.currencyCode);
      }, 0);

    return {
      totalBalance: balance,
      totalBalanceVES: balanceVES,
      totalBalanceUSD: balanceUSD,
    };
  }, [rawAccounts, usdEquivalentType, getExchangeRate]);

  // Memoized monthly calculations
  const {
    monthlyIncome,
    monthlyExpenses,
    monthlyIncomeVES,
    monthlyIncomeUSD,
    monthlyExpensesVES,
    monthlyExpensesUSD,
  } = useMemo(() => {
    if (!rawTransactions.length)
      return {
        monthlyIncome: 0,
        monthlyExpenses: 0,
        monthlyIncomeVES: 0,
        monthlyIncomeUSD: 0,
        monthlyExpensesVES: 0,
        monthlyExpensesUSD: 0,
      };

    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const monthTransactions = rawTransactions.filter(
      (t) => t.date && t.date.startsWith(currentMonthPrefix)
    );

    const income = monthTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => {
        const amountMajor = fromMinorUnits(t.amountMinor, t.currencyCode);
        // Convert VES to USD using dynamic rate
        if (t.currencyCode === 'VES') {
          const rate = getExchangeRate(usdEquivalentType);
          return sum + amountMajor / rate;
        }
        return sum + amountMajor;
      }, 0);

    const expenses = monthTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => {
        const amountMajor = fromMinorUnits(t.amountMinor, t.currencyCode);
        // Convert VES to USD using dynamic rate
        if (t.currencyCode === 'VES') {
          const rate = getExchangeRate(usdEquivalentType);
          return sum + Math.abs(amountMajor) / rate;
        }
        return sum + Math.abs(amountMajor);
      }, 0);

    // Calculate by currency
    const incomeVES = monthTransactions
      .filter((t) => t.type === 'INCOME' && t.currencyCode === 'VES')
      .reduce(
        (sum, t) => sum + fromMinorUnits(t.amountMinor, t.currencyCode),
        0
      );

    const incomeUSD = monthTransactions
      .filter((t) => t.type === 'INCOME' && t.currencyCode === 'USD')
      .reduce(
        (sum, t) => sum + fromMinorUnits(t.amountMinor, t.currencyCode),
        0
      );

    const expensesVES = monthTransactions
      .filter((t) => t.type === 'EXPENSE' && t.currencyCode === 'VES')
      .reduce(
        (sum, t) =>
          sum + Math.abs(fromMinorUnits(t.amountMinor, t.currencyCode)),
        0
      );

    const expensesUSD = monthTransactions
      .filter((t) => t.type === 'EXPENSE' && t.currencyCode === 'USD')
      .reduce(
        (sum, t) =>
          sum + Math.abs(fromMinorUnits(t.amountMinor, t.currencyCode)),
        0
      );

    return {
      monthlyIncome: income,
      monthlyExpenses: expenses,
      monthlyIncomeVES: incomeVES,
      monthlyIncomeUSD: incomeUSD,
      monthlyExpensesVES: expensesVES,
      monthlyExpensesUSD: expensesUSD,
    };
  }, [rawTransactions, usdEquivalentType, getExchangeRate]);

  return (
    <div className="space-y-6">
      {/* Free User Limit Warnings */}
      <FreeLimitWarning />

      {/* Compact Mobile Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">
            Centro de control financiero
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>{getRateName(usdEquivalentType)}</span>
        </div>
      </div>

      {/* Balance Total Card */}
      <div className="glass-card rounded-2xl border border-border/50 bg-card/80 p-5 shadow-ios-md">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-primary"></div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Balance Total
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowBalances(!showBalances)}
            aria-pressed={showBalances}
            className="focus-ring flex min-h-[44px] min-w-[44px] items-center space-x-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {showBalances ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            <span>{showBalances ? 'Ocultar' : 'Mostrar'}</span>
          </button>
        </div>

        <div className="py-1 text-center">
          {showBalances ? (
            <div className="space-y-1.5">
              {totalBalanceVES > 0 && totalBalanceUSD > 0 ? (
                <>
                  <p className="amount-emphasis-white text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                    ${totalBalance.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Desglose: ${totalBalanceUSD.toFixed(2)} + Bs.{' '}
                    {totalBalanceVES.toLocaleString('es-VE', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    ({getRateName(usdEquivalentType)})
                  </p>
                </>
              ) : totalBalanceVES > 0 ? (
                <>
                  <p className="amount-emphasis-white text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                    Bs.{' '}
                    {totalBalanceVES.toLocaleString('es-VE', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ≈ ${totalBalance.toFixed(2)} USD (
                    {getRateName(usdEquivalentType)})
                  </p>
                </>
              ) : (
                <p className="amount-emphasis-white text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                  ${totalBalanceUSD.toFixed(2)}
                </p>
              )}
            </div>
          ) : (
            <p className="mb-2 text-3xl font-light text-foreground">••••••</p>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="glass-card grid grid-cols-1 gap-3 rounded-2xl border border-border/50 bg-card/80 p-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0 py-2">
          <div className="mb-2 flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ingresos del Mes
            </h3>
          </div>
          <div className="space-y-1">
            {monthlyIncomeVES > 0 && monthlyIncomeUSD > 0 ? (
              <>
                <p className="amount-positive text-2xl font-bold tabular-nums">
                  ${monthlyIncome.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ${monthlyIncomeUSD.toFixed(2)} + Bs.{' '}
                  {monthlyIncomeVES.toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </>
            ) : monthlyIncomeVES > 0 ? (
              <>
                <p className="amount-positive text-2xl font-bold tabular-nums">
                  Bs.{' '}
                  {monthlyIncomeVES.toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  ≈ ${monthlyIncome.toFixed(2)} USD
                </p>
              </>
            ) : (
              <p className="amount-positive text-2xl font-bold tabular-nums">
                ${monthlyIncomeUSD.toFixed(2)}
              </p>
            )}
          </div>
          <div className="mt-2 flex items-center space-x-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-600">
              Ingresos
            </span>
          </div>
        </div>

        <div className="min-w-0 py-2">
          <div className="mb-2 flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-red-500"></div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gastos del Mes
            </h3>
          </div>
          <div className="space-y-1">
            {monthlyExpensesVES > 0 && monthlyExpensesUSD > 0 ? (
              <>
                <p className="amount-negative text-2xl font-bold tabular-nums">
                  ${monthlyExpenses.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ${monthlyExpensesUSD.toFixed(2)} + Bs.{' '}
                  {monthlyExpensesVES.toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </>
            ) : monthlyExpensesVES > 0 ? (
              <>
                <p className="amount-negative text-2xl font-bold tabular-nums">
                  Bs.{' '}
                  {monthlyExpensesVES.toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  ≈ ${monthlyExpenses.toFixed(2)} USD
                </p>
              </>
            ) : (
              <p className="amount-negative text-2xl font-bold tabular-nums">
                ${monthlyExpensesUSD.toFixed(2)}
              </p>
            )}
          </div>
          <div className="mt-2 flex items-center space-x-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-red-600" />
            <span className="text-xs font-medium text-red-600">Gastos</span>
          </div>
        </div>

        <div className="min-w-0 py-4">
          <div className="mb-4 flex items-center space-x-2">
            <div
              className={`h-2 w-2 ${monthlyIncome - monthlyExpenses >= 0 ? 'bg-green-500' : 'bg-red-500'} animate-pulse rounded-full`}
            ></div>
            <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
              BALANCE MES
            </h3>
          </div>
          <div className="space-y-1">
            {(() => {
              const netTotal = monthlyIncome - monthlyExpenses;
              const isPositive = netTotal >= 0;
              const netVES = monthlyIncomeVES - monthlyExpensesVES;
              const netUSD = monthlyIncomeUSD - monthlyExpensesUSD;
              const hasMixed =
                (monthlyIncomeVES > 0 || monthlyExpensesVES > 0) &&
                (monthlyIncomeUSD > 0 || monthlyExpensesUSD > 0);
              const onlyVES =
                (monthlyIncomeVES > 0 || monthlyExpensesVES > 0) &&
                monthlyIncomeUSD === 0 &&
                monthlyExpensesUSD === 0;

              if (hasMixed) {
                return (
                  <>
                    <p
                      className={`text-2xl font-bold tabular-nums ${isPositive ? 'amount-positive' : 'amount-negative'}`}
                    >
                      {netTotal > 0 ? '+' : ''}${netTotal.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Desglose: {netUSD > 0 ? '+' : ''}${netUSD.toFixed(2)} +{' '}
                      {netVES > 0 ? '+' : ''}Bs.{' '}
                      {Math.abs(netVES).toLocaleString('es-VE', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </>
                );
              }
              if (onlyVES) {
                return (
                  <>
                    <p
                      className={`text-2xl font-bold tabular-nums ${isPositive ? 'amount-positive' : 'amount-negative'}`}
                    >
                      {netVES > 0 ? '+' : ''}Bs.{' '}
                      {Math.abs(netVES).toLocaleString('es-VE', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ≈ ${netTotal.toFixed(2)} USD (
                      {getRateName(usdEquivalentType)})
                    </p>
                  </>
                );
              }
              return (
                <p
                  className={`text-2xl font-bold tabular-nums ${isPositive ? 'amount-positive' : 'amount-negative'}`}
                >
                  {netUSD > 0 ? '+' : ''}${netUSD.toFixed(2)}
                </p>
              );
            })()}
          </div>
          <div className="mt-2 flex items-center space-x-2">
            {monthlyIncome - monthlyExpenses >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span
              className={`text-ios-footnote font-medium ${monthlyIncome - monthlyExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {monthlyIncome - monthlyExpenses >= 0 ? 'Positivo' : 'Negativo'}
            </span>
          </div>
        </div>
      </div>

      {/* iOS-style Quick Actions */}
      <div
        id="quick-actions"
        className="glass-card rounded-2xl border border-border/50 bg-card/80 p-6"
      >
        <div className="mb-6 flex items-center space-x-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
          <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
            ACCIONES RÁPIDAS
          </h3>
        </div>
        <QuickActions />
      </div>

      {/* Spending and income sources */}
      <div className="space-y-6">
        <div className="glass-card rounded-2xl border border-border/50 bg-card/80 p-4 sm:p-6">
          <LazySpendingChart {...props} />
        </div>
        <div className="glass-card rounded-2xl border border-border/50 bg-card/80 p-4 sm:p-6">
          <IncomeSources
            period={props.period}
            referenceNow={props.referenceNow}
          />
        </div>
      </div>

      {/* iOS-style Recent Transactions */}
      <div className="glass-card rounded-2xl border border-border/50 bg-card/80 p-6">
        <RecentTransactions
          transactions={rawTransactions}
          bcvRates={bcvRates}
          binanceRates={binanceRates}
          accounts={rawAccounts}
        />
      </div>

      {/* iOS-style Accounts Overview */}
      <div className="glass-card rounded-2xl border border-border/50 bg-card/80 p-6">
        <div className="mb-6 flex items-center space-x-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500"></div>
          <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
            RESUMEN DE CUENTAS
          </h3>
        </div>
        <AccountsOverview />
      </div>

      {/* iOS-style Mobile Insights */}
      <div className="glass-card rounded-2xl border border-border/50 bg-card/80 p-6">
        <div className="mb-4 flex items-center space-x-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-gradient-to-r from-primary to-blue-500"></div>
          <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
            PERSPECTIVA FINANCIERA
          </h3>
        </div>
        <p className="mb-4 text-ios-body leading-relaxed text-foreground/80">
          Tu gestión financiera está en buen camino. Mantén el equilibrio entre
          ingresos y gastos.
        </p>
        <div className="flex items-center space-x-2">
          <Heart className="h-4 w-4 text-primary" />
          <span className="text-ios-footnote font-medium text-primary">
            Excelente trabajo
          </span>
        </div>
      </div>
    </div>
  );
}
