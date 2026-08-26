'use client';

import { memo, useMemo } from 'react';
import { ArrowDownToLine, DollarSign, Package } from 'lucide-react';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { useCurrencyConverter } from '@/hooks/use-currency-converter';
import { useActiveUsdVesRate } from '@/lib/rates';
import { fromMinorUnits } from '@/lib/money';
import { cn } from '@/lib/utils';
import dayjs from '@/lib/dates/dayjs';
import type { Category, Transaction } from '@/types';

interface IncomeSourcesProps {
  transactions?: Transaction[];
  categories?: Category[];
  loading?: boolean;
  className?: string;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function IncomeSourcesComponent({
  transactions: customTransactions,
  categories: customCategories,
  loading: customLoading,
  className,
}: IncomeSourcesProps) {
  const {
    transactions: hookTransactions,
    categories: hookCategories,
    loading: hookLoading,
  } = useOptimizedData();
  const activeUsdVesRate = useActiveUsdVesRate();
  const { convert } = useCurrencyConverter();
  const transactions = customTransactions ?? hookTransactions;
  const categories = customCategories ?? hookCategories;
  const isLoading = customLoading ?? hookLoading;

  const sources = useMemo(() => {
    const now = dayjs();
    const sourceMap = new Map<
      string,
      { id: string; name: string; amount: number }
    >();

    transactions.forEach((transaction) => {
      if (
        transaction.type !== 'INCOME' ||
        !transaction.date ||
        !dayjs(transaction.date).isSame(now, 'month') ||
        !dayjs(transaction.date).isSame(now, 'year')
      ) {
        return;
      }

      const currency = transaction.currencyCode || 'USD';
      const amountMajor = fromMinorUnits(
        Math.abs(transaction.amountMinor ?? 0),
        currency
      );
      const amount =
        currency === 'USD'
          ? amountMajor
          : currency === 'VES' && activeUsdVesRate > 0
            ? amountMajor / activeUsdVesRate
            : convert
              ? convert(Math.abs(transaction.amountMinor ?? 0), currency, 'USD')
              : amountMajor;
      const category = categories.find(
        (item) => item.id === transaction.categoryId
      );
      const key = category?.id || 'uncategorized';
      const current = sourceMap.get(key);
      sourceMap.set(key, {
        id: key,
        name: category?.name || 'Sin categoría',
        amount: (current?.amount || 0) + amount,
      });
    });

    return Array.from(sourceMap.values()).sort((a, b) => b.amount - a.amount);
  }, [transactions, categories, activeUsdVesRate, convert]);

  return (
    <section
      className={cn('space-y-4', className)}
      aria-labelledby="income-sources-title"
    >
      <div className="flex items-center gap-2">
        <ArrowDownToLine className="h-4 w-4 text-success" aria-hidden="true" />
        <div>
          <h3
            id="income-sources-title"
            className="text-ios-headline font-semibold text-foreground"
          >
            ¿De dónde vienen tus ingresos?
          </h3>
          <p className="text-ios-caption text-muted-foreground">
            Este mes, por categoría
          </p>
        </div>
      </div>

      {isLoading ? (
        <div
          className="h-20 animate-pulse rounded-2xl bg-muted/40"
          aria-label="Cargando ingresos"
        />
      ) : sources.length === 0 ? (
        <div className="glass-card flex items-center gap-3 rounded-2xl p-4 text-muted-foreground">
          <Package className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-ios-caption">
            Todavía no hay ingresos registrados este mes.
          </p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className="glass-card transition-smooth flex min-h-[44px] items-center justify-between rounded-2xl px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <DollarSign
                  className="h-4 w-4 shrink-0 text-success"
                  aria-hidden="true"
                />
                <span className="truncate text-ios-body text-foreground">
                  {source.name}
                </span>
              </div>
              <span className="amount-positive ml-3 whitespace-nowrap text-ios-body font-semibold">
                {currencyFormatter.format(source.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export const IncomeSources = memo(IncomeSourcesComponent);
export default IncomeSources;
