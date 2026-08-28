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
  useEffect(() => {
        setActiveIndex(null);
        setSelectedIndex(null);
      }, [sources]);

      const totalIncome = sources.reduce((sum, source) => sum + source.amount, 0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const displayedIndex = activeIndex ?? selectedIndex;
  const activeSource = displayedIndex === null ? null : sources[displayedIndex];
  const formatPercentage = (amount: number) =>
    `${percentageFormatter.format(
      totalIncome > 0 ? (amount / totalIncome) * 100 : 0
    )}%`;

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
            {periodLabel}, por categoría
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
            Todavía no hay ingresos registrados para {periodLabel.toLowerCase()}
            .
          </p>
        </div>
      ) : (
        <>
          <div
            className="glass-card relative rounded-3xl border border-border/30 bg-card/45 p-3 shadow-ios backdrop-blur-xl"
            data-testid="income-sources-chart"
          >
            <div
              className="relative h-[260px] w-full sm:h-[300px]"
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
                    outerRadius="82%"
                    paddingAngle={sources.length > 1 ? 3 : 0}
                    dataKey="amount"
                    nameKey="name"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(selectedIndex)}
                    onClick={(_, index) => {
                      setSelectedIndex(index);
                      setActiveIndex(index);
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
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-2xl border border-border/30 bg-background/55 px-5 py-3 text-center shadow-lg backdrop-blur-md">
                  <p className="text-ios-title font-bold text-foreground">
                    {currencyFormatter.format(
                      activeSource?.amount ?? totalIncome
                    )}
                  </p>
                  <p className="max-w-[150px] truncate text-ios-caption text-muted-foreground">
                    {activeSource
                      ? `${activeSource.name} · ${formatPercentage(activeSource.amount)}`
                      : 'Total de ingresos'}
                  </p>
                </div>
              </div>
            </div>

          <div
            className="mt-2 grid gap-2 border-t border-border/20 pt-2 sm:grid-cols-2"
            role="list"
            aria-label="Detalle de fuentes de ingresos"
          >
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex min-h-[44px] items-center justify-between border-t border-border/20 px-2 py-3 first:border-t-0"
                role="listitem"
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
                <span className="ml-3 whitespace-nowrap text-right text-ios-body font-semibold text-foreground">
                  {currencyFormatter.format(source.amount)}
                  <span className="ml-1 text-ios-caption font-normal text-muted-foreground">
                    ({formatPercentage(source.amount)})
                  </span>
                </span>
              </div>
            ))}
          </div>
          </div>
        </>
      )}
    </section>
  );
}

export const IncomeSources = memo(IncomeSourcesComponent);
export default IncomeSources;
