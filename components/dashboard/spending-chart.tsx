'use client';

import React, { useState, useMemo, memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  DollarSign,
  ShoppingCart,
  Car,
  Film,
  Zap,
  Heart,
  Package,
  GraduationCap,
  Home,
  ShoppingBag,
  Receipt,
  MoreHorizontal,
} from 'lucide-react';
import { useOptimizedTransactions } from '@/hooks/use-optimized-data';
import { useCurrencyConverter } from '@/hooks/use-currency-converter';
import { useActiveUsdVesRate } from '@/lib/rates';
import { fromMinorUnits } from '@/lib/money';
import { Skeleton } from '@/components/ui/skeleton';
import dayjs from '@/lib/dates/dayjs';
import type { Transaction, Category } from '@/types';

export type SpendingPeriod =
  | 'this_month'
  | 'last_month'
  | 'last_30_days'
  | 'all';

export interface SpendingChartProps {
  transactions?: Transaction[];
  categories?: Category[];
  loading?: boolean;
  initialPeriod?: SpendingPeriod;
  className?: string;
}

const PERIOD_OPTIONS: { id: SpendingPeriod; label: string }[] = [
  { id: 'this_month', label: 'Este mes' },
  { id: 'last_month', label: 'Mes anterior' },
  { id: 'last_30_days', label: 'Últimos 30 días' },
  { id: 'all', label: 'Histórico' },
];

const HIGH_CONTRAST_PALETTE = [
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#f59e0b',
  '#f43f5e',
  '#06b6d4',
  '#6366f1',
  '#f97316',
  '#14b8a6',
  '#ec4899',
  '#84cc16',
  '#a855f7',
];

const STANDARD_CATEGORY_COLORS: Record<string, string> = {
  alimentacion: '#10b981',
  comida: '#10b981',
  supermercado: '#10b981',
  transporte: '#3b82f6',
  gasolina: '#3b82f6',
  entretenimiento: '#8b5cf6',
  ocio: '#8b5cf6',
  salud: '#f43f5e',
  farmacia: '#f43f5e',
  educacion: '#f59e0b',
  hogar: '#06b6d4',
  servicios: '#06b6d4',
  ropa: '#ec4899',
  compras: '#ec4899',
  facturas: '#6366f1',
  finanzas: '#6366f1',
  otras: '#64748b',
  otros: '#64748b',
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatUSD = (amount: number): string =>
  currencyFormatter.format(amount);

export function getCategoryColor(categoryName: string): string {
  const normalized = categoryName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  for (const [key, color] of Object.entries(STANDARD_CATEGORY_COLORS)) {
    if (normalized.includes(key)) {
      return color;
    }
  }

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % HIGH_CONTRAST_PALETTE.length;
  return HIGH_CONTRAST_PALETTE[index];
}

export function getCategoryIcon(
  categoryName: string
): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  const normalized = categoryName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (
    normalized.includes('aliment') ||
    normalized.includes('comid') ||
    normalized.includes('super')
  ) {
    return ShoppingCart;
  }
  if (
    normalized.includes('transp') ||
    normalized.includes('auto') ||
    normalized.includes('gasolin')
  ) {
    return Car;
  }
  if (
    normalized.includes('entreten') ||
    normalized.includes('ocio') ||
    normalized.includes('film')
  ) {
    return Film;
  }
  if (
    normalized.includes('salud') ||
    normalized.includes('medic') ||
    normalized.includes('farmac')
  ) {
    return Heart;
  }
  if (
    normalized.includes('educa') ||
    normalized.includes('curso') ||
    normalized.includes('estudio')
  ) {
    return GraduationCap;
  }
  if (normalized.includes('hogar') || normalized.includes('casa')) {
    return Home;
  }
  if (
    normalized.includes('servici') ||
    normalized.includes('luz') ||
    normalized.includes('electr')
  ) {
    return Zap;
  }
  if (
    normalized.includes('ropa') ||
    normalized.includes('compra') ||
    normalized.includes('shop')
  ) {
    return ShoppingBag;
  }
  if (
    normalized.includes('factur') ||
    normalized.includes('financ') ||
    normalized.includes('banc')
  ) {
    return Receipt;
  }
  if (normalized.includes('otr')) {
    return MoreHorizontal;
  }
  return DollarSign;
}

export function SpendingChartSkeleton() {
  return (
    <div
      data-testid="spending-chart-skeleton"
      className="animate-pulse space-y-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36 rounded-lg" />
          <Skeleton className="h-3.5 w-24 rounded-md" />
        </div>
        <Skeleton className="h-8 w-64 rounded-xl" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/20 bg-card/40 p-4">
          <Skeleton className="mb-2 h-3.5 w-20 rounded" />
          <Skeleton className="h-6 w-28 rounded-lg" />
        </div>
        <div className="rounded-2xl border border-border/20 bg-card/40 p-4">
          <Skeleton className="mb-2 h-3.5 w-20 rounded" />
          <Skeleton className="h-6 w-12 rounded-lg" />
        </div>
      </div>

      <div className="relative flex h-72 items-center justify-center">
        <div className="h-52 w-52 rounded-full border-[18px] border-muted/50" />
        <div className="absolute flex flex-col items-center justify-center space-y-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-3 w-12 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-2xl border border-border/20 bg-card/40 p-4"
          >
            <div className="flex items-center space-x-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            </div>
            <div className="space-y-1.5 text-right">
              <Skeleton className="ml-auto h-4 w-16 rounded" />
              <Skeleton className="ml-auto h-3 w-10 rounded" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-border/20 pt-6">
        <div className="rounded-2xl border border-border/20 bg-card/30 p-3 text-center">
          <Skeleton className="mx-auto mb-1 h-5 w-10 rounded" />
          <Skeleton className="mx-auto h-3 w-24 rounded" />
        </div>
        <div className="rounded-2xl border border-border/20 bg-card/30 p-3 text-center">
          <Skeleton className="mx-auto mb-1 h-5 w-16 rounded" />
          <Skeleton className="mx-auto h-3 w-28 rounded" />
        </div>
      </div>
    </div>
  );
}

const MAX_VISIBLE_CATEGORIES = 6;

function SpendingChartComponent({
  transactions: customTransactions,
  categories: customCategories,
  loading: customLoading,
  initialPeriod = 'this_month',
  className = '',
}: SpendingChartProps) {
  const {
    expenseTransactions: hookExpenses,
    categories: hookCategories,
    loading: hookLoading,
  } = useOptimizedTransactions();

  const activeUsdVesRate = useActiveUsdVesRate();
  const { convert } = useCurrencyConverter();

  const [selectedPeriod, setSelectedPeriod] =
    useState<SpendingPeriod>(initialPeriod);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const rawExpenses = useMemo(() => {
    if (customTransactions) {
      return customTransactions.filter((t) => t.type === 'EXPENSE');
    }
    return hookExpenses;
  }, [customTransactions, hookExpenses]);

  const categories = customCategories || hookCategories;
  const isLoading = customLoading !== undefined ? customLoading : hookLoading;

  const filteredExpenses = useMemo(() => {
    if (!rawExpenses || rawExpenses.length === 0) return [];
    const now = dayjs();

    return rawExpenses.filter((tx) => {
      if (selectedPeriod === 'all') return true;
      if (!tx.date) return true;

      const txDate = dayjs(tx.date);
      if (!txDate.isValid()) return true;

      switch (selectedPeriod) {
        case 'this_month':
          return txDate.isSame(now, 'month') && txDate.isSame(now, 'year');
        case 'last_month': {
          const prev = now.subtract(1, 'month');
          return txDate.isSame(prev, 'month') && txDate.isSame(prev, 'year');
        }
        case 'last_30_days': {
          const thirtyDaysAgo = now.subtract(30, 'day').startOf('day');
          return (
            txDate.isSameOrAfter(thirtyDaysAgo) &&
            txDate.isSameOrBefore(now.endOf('day'))
          );
        }
        default:
          return true;
      }
    });
  }, [rawExpenses, selectedPeriod]);

  const convertExpenseToUSD = (tx: Transaction): number => {
    const currency = tx.currencyCode || 'USD';
    const amountMajor = fromMinorUnits(Math.abs(tx.amountMinor ?? 0), currency);

    if (currency === 'VES') {
      if (activeUsdVesRate > 0) {
        return amountMajor / activeUsdVesRate;
      }
      if (convert) {
        return convert(Math.abs(tx.amountMinor ?? 0), 'VES', 'USD');
      }
      return amountMajor;
    }

    if (currency === 'USD') {
      return amountMajor;
    }

    if (convert) {
      return convert(Math.abs(tx.amountMinor ?? 0), currency, 'USD');
    }

    return amountMajor;
  };

  const { spendingData, totalSpending } = useMemo(() => {
    if (filteredExpenses.length === 0) {
      return { spendingData: [], totalSpending: 0 };
    }

    const categoryMap = new Map<string, number>();
    let total = 0;

    filteredExpenses.forEach((expense) => {
      const category = categories.find((c) => c.id === expense.categoryId);
      const categoryName = category?.name || 'Sin categoría';
      const amountUSD = convertExpenseToUSD(expense);

      total += amountUSD;
      categoryMap.set(
        categoryName,
        (categoryMap.get(categoryName) || 0) + amountUSD
      );
    });

    const sortedEntries = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    let aggregatedList: { name: string; value: number }[] = [];

    if (sortedEntries.length > MAX_VISIBLE_CATEGORIES) {
      const topItems = sortedEntries.slice(0, MAX_VISIBLE_CATEGORIES - 1);
      const surplusItems = sortedEntries.slice(MAX_VISIBLE_CATEGORIES - 1);
      const surplusTotal = surplusItems.reduce(
        (acc, curr) => acc + curr.value,
        0
      );

      aggregatedList = [...topItems, { name: 'Otras', value: surplusTotal }];
    } else {
      aggregatedList = sortedEntries;
    }

    const items = aggregatedList.map((item) => ({
      name: item.name,
      value: item.value,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
      color: getCategoryColor(item.name),
      icon: getCategoryIcon(item.name),
    }));

    return { spendingData: items, totalSpending: total };
  }, [filteredExpenses, categories, activeUsdVesRate, convert]);

  if (isLoading) {
    return <SpendingChartSkeleton />;
  }

  const activeCategory =
    activeIndex !== null && spendingData[activeIndex]
      ? spendingData[activeIndex]
      : null;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-ios-title font-bold text-foreground">
            Gastos por Categoría
          </h3>
          <p className="text-ios-caption text-muted-foreground">
            Distribución de tus egresos
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Filtro de período de gastos"
          className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-border/30 bg-muted/40 p-1 backdrop-blur-sm"
        >
          {PERIOD_OPTIONS.map((period) => {
            const isSelected = selectedPeriod === period.id;
            return (
              <button
                key={period.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  setSelectedPeriod(period.id);
                  setActiveIndex(null);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {period.label}
              </button>
            );
          })}
        </div>
      </div>

      {spendingData.length === 0 ? (
        <div className="rounded-3xl border border-border/20 bg-card/30 py-12 text-center backdrop-blur-sm">
          <div className="mx-auto mb-4 w-fit rounded-2xl border border-border/20 bg-muted/50 p-4 backdrop-blur-sm">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-ios-body font-semibold text-foreground">
            Sin gastos registrados
          </h3>
          <p className="text-ios-caption text-muted-foreground">
            Cuando tengas gastos en este período, aparecerán aquí organizados
            por categoría.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border/20 bg-card/50 p-4 backdrop-blur-sm">
              <p className="text-ios-caption text-muted-foreground">
                Total gastado
              </p>
              <p className="text-ios-title font-bold text-foreground">
                {formatUSD(totalSpending)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/20 bg-card/50 p-4 backdrop-blur-sm">
              <p className="text-ios-caption text-muted-foreground">
                Categorías
              </p>
              <p className="text-ios-title font-bold text-foreground">
                {spendingData.length}
              </p>
            </div>
          </div>

          <div className="relative w-full">
            <div className="h-80 min-h-[320px] w-full min-w-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spendingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={115}
                    paddingAngle={spendingData.length > 1 ? 3 : 0}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={600}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {spendingData.map((entry, index) => {
                      const isHighlighted =
                        activeIndex === null || activeIndex === index;
                      return (
                        <Cell
                          key={`cell-${entry.name}-${index}`}
                          fill={entry.color}
                          opacity={isHighlighted ? 1 : 0.35}
                          stroke={
                            activeIndex === index
                              ? 'hsl(var(--foreground))'
                              : 'transparent'
                          }
                          strokeWidth={activeIndex === index ? 2 : 0}
                          className="cursor-pointer transition-all duration-200"
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-2xl border border-border/40 bg-card/95 p-3 shadow-ios-md backdrop-blur-xl">
                            <div className="flex items-center space-x-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="font-semibold text-foreground">
                                {item.name}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-bold text-foreground">
                              {formatUSD(item.value)}
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                ({item.percentage}%)
                              </span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl border border-border/20 bg-card/85 p-3.5 text-center shadow-ios-sm backdrop-blur-xl transition-all duration-200">
                {activeCategory ? (
                  <>
                    <div
                      className="mx-auto mb-1.5 w-fit rounded-xl border p-2 transition-colors duration-200"
                      style={{
                        backgroundColor: `${activeCategory.color}15`,
                        borderColor: `${activeCategory.color}30`,
                      }}
                    >
                      <activeCategory.icon
                        className="h-5 w-5"
                        style={{ color: activeCategory.color }}
                      />
                    </div>
                    <p className="text-ios-title font-bold text-foreground">
                      {formatUSD(activeCategory.value)}
                    </p>
                    <p className="max-w-[130px] truncate text-ios-caption font-medium text-muted-foreground">
                      {activeCategory.name} ({activeCategory.percentage}%)
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mb-1.5 w-fit rounded-xl border border-primary/20 bg-primary/10 p-2">
                      <DollarSign className="mx-auto h-5 w-5 text-primary" />
                    </div>
                    <p className="text-ios-title font-bold text-foreground">
                      {formatUSD(totalSpending)}
                    </p>
                    <p className="text-ios-caption text-muted-foreground">
                      Total gastado
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {spendingData.map((item, index) => {
              const Icon = item.icon;
              const isSelected = activeIndex === index;
              return (
                <div
                  key={item.name}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 backdrop-blur-sm transition-all duration-200 ${
                    isSelected
                      ? 'scale-[1.02] border-primary/40 bg-card/90 shadow-ios-md'
                      : 'border-border/20 bg-card/60 hover:border-border/40 hover:bg-card/80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="rounded-xl border p-2.5 backdrop-blur-sm"
                      style={{
                        backgroundColor: `${item.color}15`,
                        borderColor: `${item.color}30`,
                      }}
                    >
                      <Icon className="h-4 w-4" style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="text-ios-body font-medium text-foreground">
                        {item.name}
                      </p>
                      <p className="text-ios-caption text-muted-foreground">
                        {item.percentage}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-ios-body font-semibold text-foreground">
                      {formatUSD(item.value)}
                    </p>
                    <div className="flex items-center justify-end space-x-1.5">
                      <div
                        className="h-2 w-2 rounded-full shadow-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-ios-caption text-muted-foreground">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border/20 pt-6">
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-3 text-center backdrop-blur-sm">
              <p className="text-ios-body font-bold text-primary">
                {spendingData.length}
              </p>
              <p className="text-ios-caption text-muted-foreground">
                Categorías activas
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-500/10 bg-neutral-500/5 p-3 text-center backdrop-blur-sm dark:border-neutral-400/10 dark:bg-neutral-400/5">
              <p className="text-ios-body font-bold text-neutral-600 dark:text-neutral-400">
                {spendingData.length > 0
                  ? formatUSD(totalSpending / spendingData.length)
                  : '$0.00'}
              </p>
              <p className="text-ios-caption text-muted-foreground">
                Promedio por categoría
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const SpendingChart = memo(SpendingChartComponent);
export default SpendingChart;
