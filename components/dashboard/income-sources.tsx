'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { ArrowDownToLine, DollarSign, Package } from 'lucide-react';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { useCurrencyConverter } from '@/hooks/use-currency-converter';
import { useActiveUsdVesRate } from '@/lib/rates';
import { fromMinorUnits } from '@/lib/money';
import { cn } from '@/lib/utils';
import dayjs from '@/lib/dates/dayjs';
import {
  filterByDashboardPeriod,
  getDashboardPeriodLabel,
} from '@/lib/dates/dashboard-periods';
import type { Category, Transaction } from '@/types';
import type { DashboardPeriodFilterProps } from './dashboard-period-props';

interface IncomeSourcesProps extends DashboardPeriodFilterProps {
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
const percentageFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});
const fallbackColors = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--accent))',
];

function IncomeSourcesComponent({
  transactions: customTransactions,
  categories: customCategories,
  loading: customLoading,
  className,
  period = 'this_month',
  referenceNow: providedReferenceNow,
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
  const [fallbackReferenceNow] = useState(() => dayjs());
  const referenceNow = providedReferenceNow ?? fallbackReferenceNow;
  const periodLabel = getDashboardPeriodLabel(period);

  const sources = useMemo(() => {
    const periodTransactions = filterByDashboardPeriod(
      transactions,
      period,
      referenceNow
    );
    const sourceMap = new Map<
      string,
      { id: string; name: string; amount: number; color?: string }
    >();

    periodTransactions.forEach((transaction) => {
      if (transaction.type !== 'INCOME') return;

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
  }, [
    transactions,
    categories,
    period,
    referenceNow,
    activeUsdVesRate,
    convert,
  ]);
  const totalIncome = sources.reduce((sum, source) => sum + source.amount, 0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  useEffect(() => {
    setActiveIndex(null);
    setSelectedIndex(null);
  }, [sources]);
  const displayedIndex = activeIndex ?? selectedIndex;
  const activeSource = displayedIndex === null ? null : sources[displayedIndex];
  const formatPercentage = (amount: number) =>
    `${percentageFormatter.format(
      totalIncome > 0 ? (amount / totalIncome) * 100 : 0
    )}%`;

  return (
    <section
      className={cn('space-y-6', className)}
      aria-labelledby="income-sources-title"
    >
      <div className="flex items-start gap-2.5">
        <ArrowDownToLine
          className="mt-1 h-4 w-4 shrink-0 text-success"
          aria-hidden="true"
        />
        <div>
          <h3
            id="income-sources-title"
            className="text-ios-title font-bold text-foreground"
          >
            ¿De dónde vienen tus ingresos?
          </h3>
          <p className="text-ios-caption text-muted-foreground">
            {periodLabel}, por categoría
          </p>
        </div>
      </div>

      {isLoading ? (
        <div
          className="h-[280px] animate-pulse bg-muted/30"
          aria-label="Cargando ingresos"
        />
      ) : sources.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Package className="mx-auto mb-4 h-12 w-12" aria-hidden="true" />
          <p className="text-balance text-ios-caption">
            Todavía no hay ingresos registrados para {periodLabel.toLowerCase()}
            .
          </p>
        </div>
      ) : (
        <>
          <div
            className="relative mx-auto h-[280px] w-full max-w-[300px]"
            data-testid="income-sources-chart"
          >
            <div
              className="relative h-[280px] w-full"
              role="img"
              aria-label="Distribución de ingresos por categoría"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sources}
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="84%"
                    animationBegin={0}
                    animationDuration={600}
                    paddingAngle={sources.length > 1 ? 3 : 0}
                    dataKey="amount"
                    nameKey="name"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(selectedIndex)}
                    onClick={(_, index) => {
                      const nextIndex = selectedIndex === index ? null : index;
                      setSelectedIndex(nextIndex);
                      setActiveIndex(nextIndex);
                    }}
                  >
                    {sources.map((source, index) => (
                      <Cell
                        key={source.id}
                        fill={
                          source.color ||
                          fallbackColors[index % fallbackColors.length]
                        }
                        opacity={
                          activeIndex === null || activeIndex === index
                            ? 1
                            : 0.35
                        }
                        stroke="hsl(var(--foreground))"
                        strokeWidth={activeIndex === index ? 3 : 1}
                        className="cursor-pointer transition-all duration-200"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="text-ios-title font-bold text-foreground">
                    {currencyFormatter.format(
                      activeSource?.amount ?? totalIncome
                    )}
                  </p>
                  <p className="max-w-[130px] truncate text-ios-caption text-muted-foreground">
                    {activeSource
                      ? `${activeSource.name} · ${formatPercentage(activeSource.amount)}`
                      : 'Total de ingresos'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            className="w-full divide-y divide-border/30 sm:grid sm:grid-cols-2 sm:gap-x-4 sm:gap-y-1 sm:divide-y-0"
            role="list"
            aria-label="Detalle de fuentes de ingresos"
          >
            {sources.map((source, index) => {
              const isSelected = displayedIndex === index;
              return (
                <div
                  key={source.id}
                  onClick={() => {
                    const nextIndex = selectedIndex === index ? null : index;
                    setSelectedIndex(nextIndex);
                    setActiveIndex(nextIndex);
                  }}
                  className={cn(
                    'flex min-h-[44px] min-w-0 cursor-pointer items-center justify-between rounded-lg px-2 py-3 transition-colors',
                    isSelected
                      ? 'bg-primary/10'
                      : 'hover:bg-muted/40 active:bg-muted/60'
                  )}
                  role="listitem"
                  tabIndex={0}
                  aria-selected={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const nextIndex = selectedIndex === index ? null : index;
                      setSelectedIndex(nextIndex);
                      setActiveIndex(nextIndex);
                    }
                  }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <DollarSign
                      className="h-4 w-4 shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <span className="truncate text-ios-body font-medium text-foreground">
                      {source.name}
                    </span>
                  </div>
                  <span className="ml-3 min-w-0 shrink-0 text-right text-base font-semibold tabular-nums text-foreground">
                    {currencyFormatter.format(source.amount)}
                    <span className="ml-1 text-ios-caption font-normal text-muted-foreground">
                      ({formatPercentage(source.amount)})
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export const IncomeSources = memo(IncomeSourcesComponent);
export default IncomeSources;
