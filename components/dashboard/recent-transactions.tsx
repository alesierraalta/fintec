'use client';

import { memo, useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Transaction, TransactionType, Account } from '@/types/domain';
import { formatCurrency } from '@/lib/money';
import { getTransactionDisplayName } from '@/lib/transactions/display';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
} from 'lucide-react';
import dayjs from '@/lib/dates/dayjs';
import { useMediaQuery } from '@/hooks';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onViewAll?: () => void;
  onTransactionClick?: (transaction: Transaction) => void;
  isLoading?: boolean;
  bcvRates?: { usd: number; eur: number };
  binanceRates?: { usd_ves: number };
  accounts?: Account[];
}

export const RecentTransactions = memo(function RecentTransactions({
  transactions,
  onViewAll,
  onTransactionClick,
  isLoading = false,
  bcvRates,
  binanceRates,
  accounts,
}: RecentTransactionsProps) {
  const [hoveredTransaction, setHoveredTransaction] = useState<string | null>(
    null
  );
  const isMobile = useMediaQuery('(max-width: 768px)');
  const usdEquivalentType = useAppStore((s) => s.selectedRateSource);

  // Map for fast accountId → accountName resolution
  const accountIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    (accounts || []).forEach((acc) => {
      map[acc.id] = acc.name;
    });
    return map;
  }, [accounts]);

  // Helper function to get exchange rate
  const getExchangeRate = useMemo(() => {
    if (!bcvRates || !binanceRates) return 1;

    switch (usdEquivalentType) {
      case 'binance':
        return binanceRates.usd_ves || 1;
      case 'bcv_usd':
        return bcvRates.usd || 1;
      case 'bcv_eur':
        return bcvRates.eur || 1;
      default:
        return bcvRates.usd || 1;
    }
  }, [bcvRates, binanceRates, usdEquivalentType]);

  const formatAmount = (transaction: Transaction) => {
    const isNegative =
      transaction.type === TransactionType.EXPENSE ||
      transaction.type === TransactionType.TRANSFER_OUT;

    // Format in original currency
    const formattedAmount = formatCurrency(
      transaction.amountMinor,
      transaction.currencyCode,
      { showSymbol: true, showCode: false }
    );

    // Add USD equivalent if VES and rates are available
    if (transaction.currencyCode === 'VES' && bcvRates && binanceRates) {
      const amountMajor = transaction.amountMinor / 100;
      const usdEquivalent = amountMajor / getExchangeRate;
      const usdFormatted = `$${usdEquivalent.toFixed(2)}`;

      return isNegative
        ? `-${formattedAmount} (~${usdFormatted})`
        : `${formattedAmount} (~${usdFormatted})`;
    }

    return isNegative ? `-${formattedAmount}` : formattedAmount;
  };

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.INCOME:
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case TransactionType.EXPENSE:
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case TransactionType.TRANSFER_OUT:
      case TransactionType.TRANSFER_IN:
        return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getTransactionBadge = (type: TransactionType) => {
    switch (type) {
      case TransactionType.INCOME:
        return (
          <Badge
            variant="default"
            className="border-0 bg-green-600/20 text-green-600 dark:bg-green-500/20 dark:text-green-400"
          >
            Ingreso
          </Badge>
        );
      case TransactionType.EXPENSE:
        return (
          <Badge
            variant="default"
            className="border-0 bg-red-600/20 text-red-600 dark:bg-red-500/20 dark:text-red-400"
          >
            Gasto
          </Badge>
        );
      case TransactionType.TRANSFER_OUT:
        return (
          <Badge
            variant="default"
            className="border-0 bg-blue-600/20 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
          >
            Transferencia
          </Badge>
        );
      case TransactionType.TRANSFER_IN:
        return (
          <Badge
            variant="default"
            className="border-0 bg-blue-600/20 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
          >
            Transferencia
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Movimientos Recientes
          </h2>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-center justify-between rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-muted"></div>
                <div className="space-y-1">
                  <div className="h-4 w-24 rounded bg-muted"></div>
                  <div className="h-3 w-16 rounded bg-muted"></div>
                </div>
              </div>
              <div className="h-4 w-20 rounded bg-muted"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Movimientos Recientes
        </h2>
        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-primary hover:text-primary/80"
          >
            Ver todas
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="py-8 text-center">
          <div className="mb-2 text-muted-foreground">
            <TrendingUp className="mx-auto h-12 w-12" />
          </div>
          <p className="text-sm text-muted-foreground">
            No hay transacciones recientes
          </p>
          <p className="text-xs text-muted-foreground">
            Las transacciones aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.slice(0, 5).map((transaction) => (
            <div
              key={transaction.id}
              className={`${isMobile ? 'p-4' : 'flex items-center justify-between p-4'} cursor-pointer rounded-lg border border-border bg-card transition-all duration-200 ${
                hoveredTransaction === transaction.id
                  ? 'border-primary/50 bg-card/80 shadow-md dark:bg-primary/10'
                  : 'hover:border-border/80 hover:shadow-sm'
              }`}
              onMouseEnter={() => setHoveredTransaction(transaction.id)}
              onMouseLeave={() => setHoveredTransaction(null)}
              onClick={() => onTransactionClick?.(transaction)}
            >
              {isMobile ? (
                // Mobile layout: vertical stack
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-2 break-words text-sm font-medium text-foreground">
                        {getTransactionDisplayName(transaction)}
                      </p>
                      <div className="mb-2">
                        {getTransactionBadge(transaction.type)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <span>{dayjs(transaction.date).fromNow()}</span>
                      {transaction.categoryId && (
                        <>
                          <span>•</span>
                          <span className="break-words">Categoría</span>
                        </>
                      )}
                    </div>
                    {transaction.accountId && (
                      <div className="break-words">
                        Cuenta:{' '}
                        {accountIdToName[transaction.accountId] ?? 'Cuenta'}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border/20 pt-2">
                    <p
                      className={`text-lg font-bold ${
                        transaction.type === TransactionType.INCOME ||
                        transaction.type === TransactionType.TRANSFER_IN
                          ? 'amount-positive'
                          : 'amount-negative'
                      }`}
                    >
                      {formatAmount(transaction)}
                    </p>
                    {transaction.pending && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Pendiente
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                // Desktop layout: horizontal
                <>
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center space-x-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {getTransactionDisplayName(transaction)}
                        </p>
                        {getTransactionBadge(transaction.type)}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>{dayjs(transaction.date).fromNow()}</span>
                        {transaction.categoryId && (
                          <>
                            <span>•</span>
                            <span>Categoría</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        transaction.type === TransactionType.INCOME ||
                        transaction.type === TransactionType.TRANSFER_IN
                          ? 'amount-positive'
                          : 'amount-negative'
                      }`}
                    >
                      {formatAmount(transaction)}
                    </p>
                    {transaction.pending && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Pendiente
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
