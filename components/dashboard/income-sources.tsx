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
      { id: string; name: string; amount: number; color?: string }
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
        color: category?.color,
      });
    });

    return Array.from(sourceMap.values()).sort((a, b) => b.amount - a.amount);
  }, [transactions, categories, activeUsdVesRate, convert]);
  const totalIncome = sources.reduce((sum, source) => sum + source.amount, 0);
  const fallbackColors = [
    'hsl(var(--primary))',
    'hsl(var(--success))',
    'hsl(var(--accent))',
  ];

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
        <>
          <div
            className="glass-card space-y-3 rounded-2xl p-4"
            data-testid="income-sources-chart"
            role="list"
            aria-label="Distribución de ingresos por categoría"
          >
            {sources.map((source, index) => {
              const percentage =
                totalIncome > 0 ? (source.amount / totalIncome) * 100 : 0;
              const percentageLabel = `${new Intl.NumberFormat('en-US', {
                maximumFractionDigits: 1,
              }).format(percentage)}%`;

              return (
                <div key={source.id} className="space-y-1.5" role="listitem">
                  <div className="flex items-center justify-between gap-3 text-ios-caption">
                    <span className="min-w-0 truncate font-medium text-foreground">
                      {source.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {percentageLabel}
                    </span>
                  </div>
                  <div
                    className="h-2.5 w-full overflow-hidden rounded-full bg-muted/50"
                    role="progressbar"
                    aria-label={`${source.name}: ${percentageLabel}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Number(percentage.toFixed(1))}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor:
                          source.color || fallbackColors[index % fallbackColors.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

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
        </>
      )}
    </section>
  );
}

export const IncomeSources = memo(IncomeSourcesComponent);
export default IncomeSources;
