'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { formatCurrency } from '@/lib/money';
import {
  DEBT_PORTFOLIO_MODE,
  filterTransactionsByDebtMode,
  OPERATIONAL_DEBT_MODE,
} from '@/lib/reports/transaction-reporting-boundaries';
import { DebtDirection, DebtStatus } from '@/types';
import {
  PieChart,
  BarChart3,
  Target,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  CreditCard,
  HandCoins,
} from 'lucide-react';

export function MobileReports() {
  const { user, baseCurrency } = useAuth();
  const { transactions, categories, accounts, loading, loadAllData } =
    useOptimizedData();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [customRange, setCustomRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedCurrency, setSelectedCurrency] = useState('ALL');
  const [selectedTab, setSelectedTab] = useState('overview');

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const availableCurrencies = React.useMemo(() => {
    const currencies = new Set<string>();
    transactions.forEach((t) => currencies.add(t.currencyCode));
    return ['ALL', ...Array.from(currencies)];
  }, [transactions]);

  const periods = [
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'year', label: 'Año' },
    { id: 'custom', label: 'Personalizado' },
  ];

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: PieChart },
    { id: 'categories', label: 'Categorías', icon: BarChart3 },
    { id: 'trends', label: 'Tendencias', icon: Target },
    { id: 'debts', label: 'Deudas', icon: HandCoins },
  ];

  const getPeriodStartDate = (period: string): Date => {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        return new Date(
          now.getFullYear(),
          Math.floor(now.getMonth() / 3) * 3,
          1
        );
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  };

  const filteredTransactions = (() => {
    let start = new Date();
    let end = new Date(); // Default end is now, but for custom range it matters.

    // Default end for standard periods is technically "now" or end of year etc,
    // but the original logic was just ">= start".
    // For custom range, we need strict start AND end.

    if (selectedPeriod === 'custom') {
      start = new Date(customRange.start);
      end = new Date(customRange.end);
      end.setHours(23, 59, 59, 999); // Include the whole end day
    } else {
      start = getPeriodStartDate(selectedPeriod);
      // Ensure future dates are included or not?
      // Original logic was just >= start.
      end = new Date(8640000000000000); // Max date
    }

    let filtered = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    if (selectedCurrency !== 'ALL') {
      filtered = filtered.filter((t) => t.currencyCode === selectedCurrency);
    }

    return filtered;
  })();

  const operationalTransactions = filterTransactionsByDebtMode(
    filteredTransactions,
    OPERATIONAL_DEBT_MODE
  );
  const debtPortfolioTransactions = filterTransactionsByDebtMode(
    filteredTransactions,
    DEBT_PORTFOLIO_MODE
  );
  const openDebtTransactions = debtPortfolioTransactions.filter(
    (transaction) => transaction.debtStatus !== DebtStatus.SETTLED
  );

  const totalIncome = operationalTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((s, t) => s + (t.amountBaseMinor || 0), 0);
  const totalExpenses = operationalTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((s, t) => s + (t.amountBaseMinor || 0), 0);

  // Calcular totales por moneda original para visualización detallada
  const totalsByCurrency = (() => {
    const income: Record<string, { amount: number; baseAmount: number }> = {};
    const expense: Record<string, { amount: number; baseAmount: number }> = {};
    const net: Record<string, { amount: number; baseAmount: number }> = {};

    operationalTransactions.forEach((t) => {
      const amount = t.amountMinor || 0;
      const baseAmount = t.amountBaseMinor || 0;
      const currency = t.currencyCode || 'USD';

      // Init if needed
      if (!net[currency]) net[currency] = { amount: 0, baseAmount: 0 };

      if (t.type === 'INCOME') {
        if (!income[currency]) income[currency] = { amount: 0, baseAmount: 0 };
        income[currency].amount += amount;
        income[currency].baseAmount += baseAmount;

        net[currency].amount += amount;
        net[currency].baseAmount += baseAmount;
      } else if (t.type === 'EXPENSE') {
        if (!expense[currency])
          expense[currency] = { amount: 0, baseAmount: 0 };
        expense[currency].amount += amount;
        expense[currency].baseAmount += baseAmount;

        net[currency].amount -= amount;
        net[currency].baseAmount -= baseAmount;
      }
    });

    // Helper for sorting by base currency impact
    const sort = (
      map: Record<string, { amount: number; baseAmount: number }>
    ) =>
      Object.entries(map)
        .sort(([, a], [, b]) => Math.abs(b.baseAmount) - Math.abs(a.baseAmount))
        .map(([curr, val]) => ({ currency: curr, amount: val.amount }));

    return {
      income: sort(income),
      expense: sort(expense),
      net: sort(net),
    };
  })();

  const categoryTotals = (() => {
    const currencyMap: Record<
      string,
      Record<string, { amount: number; baseAmount: number }>
    > = {};
    const baseMap: Record<string, number> = {};

    operationalTransactions
      .filter((t) => t.type === 'EXPENSE')
      .forEach((t) => {
        const key = t.categoryId || 'uncategorized';
        const currency = t.currencyCode || 'USD';
        const amount = t.amountMinor || 0;
        const baseAmount = t.amountBaseMinor || 0;

        if (!currencyMap[key]) currencyMap[key] = {};
        if (!currencyMap[key][currency])
          currencyMap[key][currency] = { amount: 0, baseAmount: 0 };

        currencyMap[key][currency].amount += amount;
        currencyMap[key][currency].baseAmount += baseAmount;

        baseMap[key] = (baseMap[key] || 0) + baseAmount;
      });

    const totalBase = Object.values(baseMap).reduce((s, v) => s + v, 0);
    const idToName: Record<string, string> = {};
    categories.forEach((c) => {
      idToName[c.id] = c.name;
    });

    return Object.entries(currencyMap)
      .map(([id, currenciesData], idx) => {
        const baseAmount = baseMap[id] || 0;

        // Sort currencies by base amount
        const sortedCurrencies = Object.entries(currenciesData)
          .sort(([, a], [, b]) => b.baseAmount - a.baseAmount)
          .reduce(
            (acc, [curr, val]) => {
              acc[curr] = val.amount;
              return acc;
            },
            {} as Record<string, number>
          );

        return {
          category: idToName[id] || 'Sin categoría',
          currencies: sortedCurrencies,
          baseAmount: baseAmount,
          percentage:
            totalBase > 0 ? Math.round((baseAmount / totalBase) * 100) : 0,
          color: [
            'bg-blue-500',
            'bg-green-500',
            'bg-purple-500',
            'bg-pink-500',
            'bg-yellow-500',
          ][idx % 5],
        };
      })
      .sort((a, b) => b.baseAmount - a.baseAmount);
  })();

  const renderOverview = () => {

    const netBalance = totalIncome - totalExpenses;
    const daysInPeriod = Math.max(
      1,
      Math.ceil(
        (new Date().getTime() - getPeriodStartDate(selectedPeriod).getTime()) /
          (24 * 60 * 60 * 1000)
      )
    );
    const avgDailyExpense = Math.round(totalExpenses / daysInPeriod);

    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0 rounded-2xl border border-border-primary bg-background-elevated p-4">
            <div className="mb-2 flex items-center justify-between gap-1">
              <span className="truncate text-sm text-text-muted">Ingresos</span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-green-500" />
            </div>
            <div className="flex flex-col gap-1">
              {totalsByCurrency.income.length > 0 ? (
                totalsByCurrency.income.map(({ currency, amount }) => (
                  <p
                    key={currency}
                    className="truncate text-lg font-bold text-text-primary"
                  >
                    {formatCurrency(amount, currency)}
                  </p>
                ))
              ) : (
                <p className="truncate text-lg font-bold text-text-primary">
                  {formatCurrency(0, baseCurrency)}
                </p>
              )}
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-border-primary bg-background-elevated p-4">
            <div className="mb-2 flex items-center justify-between gap-1">
              <span className="truncate text-sm text-text-muted">Gastos</span>
              <ArrowDownRight className="h-4 w-4 shrink-0 text-red-500" />
            </div>
            <div className="flex flex-col gap-1">
              {totalsByCurrency.expense.length > 0 ? (
                totalsByCurrency.expense.map(({ currency, amount }) => (
                  <p
                    key={currency}
                    className="truncate text-lg font-bold text-text-primary"
                  >
                    {formatCurrency(amount, currency)}
                  </p>
                ))
              ) : (
                <p className="truncate text-lg font-bold text-text-primary">
                  {formatCurrency(0, baseCurrency)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Net Balance */}
        <div className="min-w-0 rounded-2xl border border-border-primary bg-background-elevated p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-text-muted">Balance Neto</span>
            <Wallet className="h-4 w-4 shrink-0 text-text-muted" />
          </div>
          <div className="mb-2 flex flex-col gap-1">
            {totalsByCurrency.net.length > 0 ? (
              totalsByCurrency.net.map(({ currency, amount }) => (
                <p
                  key={currency}
                  className={`truncate text-2xl font-bold ${amount >= 0 ? 'text-text-primary' : 'text-red-500'}`}
                >
                  {formatCurrency(amount, currency)}
                </p>
              ))
            ) : (
              <p className="truncate text-2xl font-bold text-text-primary">
                {formatCurrency(0, baseCurrency)}
              </p>
            )}
          </div>
          <p
            className={`truncate text-xs ${netBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}
          >
            {netBalance >= 0 ? 'Superávit' : 'Déficit'} este período (Global)
          </p>
        </div>

        {/* Quick Stats */}
        <div className="rounded-2xl border border-border-primary bg-background-elevated p-4">
          <h3 className="mb-3 text-lg font-semibold text-text-primary">
            Estadísticas Rápidas
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">Transacciones</span>
              <span className="text-sm font-medium text-text-primary">
                {operationalTransactions.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">Promedio por día</span>
              <span className="text-sm font-medium text-text-primary">
                {formatCurrency(avgDailyExpense, baseCurrency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">
                Categorías activas
              </span>
              <span className="text-sm font-medium text-text-primary">
                {categoryTotals.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCategories = () => (
    <div className="space-y-4">
      {/* Categories Breakdown */}
      <div className="rounded-2xl border border-border-primary bg-background-elevated p-4">
        <h3 className="mb-4 text-lg font-semibold text-text-primary">
          Gastos por Categoría
        </h3>
        <div className="space-y-3">
          {categoryTotals.map((category) => (
            <div key={category.category} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center space-x-3">
                  <div
                    className={`h-4 w-4 shrink-0 rounded-full ${category.color}`}
                  ></div>
                  <span className="truncate text-sm font-medium text-text-primary">
                    {category.category}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end text-right">
                  {Object.entries(category.currencies).map(([curr, amt]) => (
                    <p
                      key={curr}
                      className="text-sm font-semibold text-text-primary"
                    >
                      {formatCurrency(amt, curr)}
                    </p>
                  ))}
                  <p className="text-xs text-text-muted">
                    {category.percentage}%
                  </p>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-background-primary">
                <div
                  className={`h-2 rounded-full ${category.color}`}
                  style={{ width: `${Math.min(category.percentage, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Transactions */}
      <div className="rounded-2xl border border-border-primary bg-background-elevated p-4">
        <h3 className="mb-4 text-lg font-semibold text-text-primary">
          Mayores Gastos
        </h3>
        <div className="space-y-3">
          {operationalTransactions
            .filter((t) => t.amountMinor < 0)
            .sort((a, b) => a.amountMinor - b.amountMinor)
            .slice(0, 3)
            .map((transaction, index) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-background-primary p-3"
              >
                <div className="flex min-w-0 items-center space-x-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/20">
                    <CreditCard className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(transaction.date).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-text-primary">
                  {formatCurrency(
                    Math.abs(transaction.amountMinor),
                    transaction.currencyCode
                  )}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderTrends = () => {
    const displayCurrency =
      selectedCurrency === 'ALL'
        ? availableCurrencies.length === 2
          ? availableCurrencies[1]
          : baseCurrency
        : selectedCurrency;

    // 1. Configuración de Periodo
    let isLongPeriod = ['year', 'quarter'].includes(selectedPeriod);
    if (selectedPeriod === 'custom') {
      const start = new Date(customRange.start);
      const end = new Date(customRange.end);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isLongPeriod = diffDays > 45; // Switch to monthly view if range > 45 days
    }

    // 2. Variables para acumular datos
    const groupedData: Record<string, number> = {};
    const weekDayData = new Array(7).fill(0); // 0=Dom, 1=Lun, etc.
    let periodIncome = 0;
    let periodExpense = 0;

    // 3. Procesamiento de transacciones
    operationalTransactions.forEach((t) => {
      const amount =
        selectedCurrency === 'ALL'
          ? t.amountBaseMinor || 0
          : t.amountMinor || 0;

      if (t.type === 'EXPENSE') {
        // Usar objetos Date para consistencia con zona horaria local
        const date = new Date(t.date);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');

        let key = '';
        if (isLongPeriod) {
          key = `${y}-${m}`;
        } else {
          key = `${y}-${m}-${d}`;
        }
        groupedData[key] = (groupedData[key] || 0) + amount;

        const dayIndex = date.getDay();
        weekDayData[dayIndex] += amount;

        periodExpense += amount;
      } else if (t.type === 'INCOME') {
        periodIncome += amount;
      }
    });

    // 4. Generar Eje de Tiempo Completo (Rellenar huecos)
    const generateAllKeys = () => {
      const keys = [];
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      if (selectedPeriod === 'week') {
        // Últimos 7 días
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          keys.push(`${y}-${m}-${day}`);
        }
      } else if (selectedPeriod === 'custom') {
        const start = new Date(customRange.start);
        const end = new Date(customRange.end);

        if (isLongPeriod) {
          // Iterate months
          const current = new Date(start.getFullYear(), start.getMonth(), 1);
          while (current <= end) {
            keys.push(
              `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
            );
            current.setMonth(current.getMonth() + 1);
          }
        } else {
          // Iterate days
          const current = new Date(start);
          // Safety limit: max 60 days for daily view to avoid huge loops if logic fails
          let safety = 0;
          while (current <= end && safety < 100) {
            const y = current.getFullYear();
            const m = String(current.getMonth() + 1).padStart(2, '0');
            const d = String(current.getDate()).padStart(2, '0');
            keys.push(`${y}-${m}-${d}`);
            current.setDate(current.getDate() + 1);
            safety++;
          }
        }
      } else if (selectedPeriod === 'month') {
        // Mes actual completo
        const daysInMonth = new Date(
          currentYear,
          currentMonth + 1,
          0
        ).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          keys.push(
            `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
          );
        }
      } else if (selectedPeriod === 'quarter') {
        // Trimestre actual
        const q = Math.floor(currentMonth / 3);
        for (let i = 0; i < 3; i++) {
          keys.push(`${currentYear}-${String(q * 3 + i + 1).padStart(2, '0')}`);
        }
      } else if (selectedPeriod === 'year') {
        // Año actual (12 meses)
        for (let i = 0; i < 12; i++) {
          keys.push(`${currentYear}-${String(i + 1).padStart(2, '0')}`);
        }
      }
      return keys;
    };

    const allKeys = generateAllKeys();

    // 5. Mapear datos completos
    const chartData = allKeys.map((key) => {
      // Parsear fecha localmente para etiquetas correctas
      const parts = key.split('-').map(Number);
      const y = parts[0];
      const m = parts[1];
      const d = parts[2] || 1; // Default to 1 if day is missing (YYYY-MM)

      // Crear fecha al mediodía
      const date = new Date(y, m - 1, d, 12);

      return {
        key,
        value: groupedData[key] || 0,
        label: isLongPeriod
          ? date.toLocaleDateString('es-ES', { month: 'short' })
          : date.getDate().toString(),
        fullDate: isLongPeriod
          ? date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
          : date.toLocaleDateString('es-ES', { dateStyle: 'full' }),
      };
    });

    // 6. Preparar datos Semanales
    const weekDaysLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weekDayChart = [
      ...weekDayData
        .slice(1)
        .map((val, i) => ({ label: weekDaysLabels[i + 1], value: val })),
      { label: weekDaysLabels[0], value: weekDayData[0] },
    ];
    const maxWeekDay = Math.max(...weekDayChart.map((d) => d.value), 0);

    // 7. Métricas Generales
    const maxValue = Math.max(...chartData.map((d) => d.value), 0);
    const activeDataPoints = chartData.filter((d) => d.value > 0).length;
    const avgPeriod =
      activeDataPoints > 0 ? periodExpense / activeDataPoints : 0;
    const savingsRate =
      periodIncome > 0
        ? ((periodIncome - periodExpense) / periodIncome) * 100
        : 0;
    const cashFlow = periodIncome - periodExpense;

    // 8. Métricas de Cuentas
    const accountMetrics = accounts
      .map((acc) => {
        const accTransactions = operationalTransactions.filter(
          (t) => t.accountId === acc.id
        );
        const income = accTransactions
          .filter((t) => t.type === 'INCOME')
          .reduce((sum, t) => sum + (t.amountMinor || 0), 0);
        const expense = accTransactions
          .filter((t) => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + (t.amountMinor || 0), 0);
        const incomeBase = accTransactions
          .filter((t) => t.type === 'INCOME')
          .reduce((sum, t) => sum + (t.amountBaseMinor || 0), 0);
        const expenseBase = accTransactions
          .filter((t) => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + (t.amountBaseMinor || 0), 0);

        return {
          id: acc.id,
          name: acc.name,
          currency: acc.currencyCode,
          income,
          expense,
          net: income - expense,
          netBase: incomeBase - expenseBase,
          hasActivity: income > 0 || expense > 0,
        };
      })
      .filter((acc) => acc.hasActivity)
      .sort((a, b) => b.netBase - a.netBase);

    return (
      <div className="space-y-6">
        {/* 1. Gráfico Principal: Evolución */}
        <div className="rounded-3xl border border-border-primary bg-background-elevated p-5 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-text-primary">Evolución</h3>
              <p className="text-xs text-text-muted">
                Gasto {isLongPeriod ? 'mensual' : 'diario'}
              </p>
            </div>
            <div className="rounded-xl bg-background-tertiary p-2">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
          </div>

          {/* Chart Area */}
          <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 pb-2">
            <div
              className="flex h-64 flex-col"
              style={{
                minWidth:
                  chartData.length > 12 ? `${chartData.length * 32}px` : '100%',
              }}
            >
              {/* Bars Section */}
              <div className="mb-2 flex min-h-0 flex-1 items-end space-x-2">
                {chartData.length > 0 ? (
                  chartData.map((data, idx) => {
                    const heightPercent =
                      maxValue > 0 ? (data.value / maxValue) * 100 : 0;
                    return (
                      <div
                        key={data.key}
                        className="group relative flex h-full flex-1 items-end justify-center"
                      >
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-border-primary bg-background-tertiary px-3 py-1.5 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          <p className="font-bold">
                            {formatCurrency(data.value, displayCurrency)}
                          </p>
                          <p className="text-[10px] text-text-muted">
                            {data.fullDate}
                          </p>
                        </div>

                        {/* Bar Track (Optional background) */}
                        <div className="relative flex h-full w-full items-end overflow-hidden rounded-t-md bg-transparent">
                          {/* Actual Bar */}
                          <div
                            className="hover:to-primary-hover w-full rounded-t-md bg-gradient-to-t from-primary/60 to-primary transition-all duration-500 ease-out hover:from-primary"
                            style={{ height: `${Math.max(heightPercent, 2)}%` }} // Min 2% visibility
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm italic text-text-muted">
                    Sin datos suficientes
                  </div>
                )}
              </div>

              {/* Labels Section */}
              <div className="flex h-6 space-x-2">
                {chartData.map((data) => (
                  <div key={data.key} className="min-w-0 flex-1 text-center">
                    <span className="block truncate text-[10px] text-text-muted">
                      {data.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Salud Financiera (Ingresos vs Gastos) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Tarjeta de Tasa de Ahorro */}
          <div className="relative overflow-hidden rounded-3xl border border-border-primary bg-background-elevated p-5">
            <div className="relative z-10 mb-4 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-text-muted">
                  Tasa de Ahorro
                </p>
                <h3
                  className={`text-2xl font-bold ${savingsRate >= 20 ? 'text-green-500' : savingsRate > 0 ? 'text-yellow-500' : 'text-red-500'}`}
                >
                  {savingsRate.toFixed(1)}%
                </h3>
              </div>
              <div
                className={`rounded-full p-2 ${savingsRate >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}
              >
                <Target
                  className={`h-5 w-5 ${savingsRate >= 0 ? 'text-green-500' : 'text-red-500'}`}
                />
              </div>
            </div>

            {/* Barra de progreso Ingreso vs Gasto */}
            <div className="relative z-10 space-y-2">
              <div className="flex justify-between text-xs text-text-secondary">
                <span>
                  Gastado: {Math.min(100 - savingsRate, 100).toFixed(0)}%
                </span>
                <span>Objetivo: 20%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-background-tertiary">
                <div
                  className={`h-full rounded-full ${savingsRate >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.max(savingsRate, 0)}%` }}
                ></div>
              </div>
              <p className="pt-1 text-xs text-text-muted">
                Flujo de caja:{' '}
                <span className="font-semibold text-text-primary">
                  {formatCurrency(cashFlow, displayCurrency)}
                </span>
              </p>
            </div>

            {/* Decoración de fondo */}
            <div
              className={`absolute -bottom-4 -right-4 h-24 w-24 rounded-full opacity-5 ${savingsRate >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
            ></div>
          </div>

          {/* Tarjeta de Patrón Semanal */}
          <div className="rounded-3xl border border-border-primary bg-background-elevated p-5">
            <p className="mb-4 text-sm font-medium text-text-muted">
              Patrón Semanal de Gasto
            </p>
            <div className="flex h-24 items-end space-x-2">
              {weekDayChart.map((day, idx) => (
                <div key={idx} className="flex flex-1 flex-col items-center">
                  <div
                    className="min-h-[2px] w-full rounded-t-sm bg-blue-500/20"
                    style={{
                      height: `${maxWeekDay > 0 ? (day.value / maxWeekDay) * 100 : 0}%`,
                    }}
                  >
                    <div
                      className="w-full rounded-t-sm bg-blue-500 transition-all hover:opacity-80"
                      style={{ height: '100%' }}
                      title={formatCurrency(day.value, displayCurrency)}
                    ></div>
                  </div>
                  <span className="mt-1 text-[9px] text-text-muted">
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Métricas Rápidas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border-primary bg-background-elevated p-4">
            <p className="mb-1 text-xs text-text-muted">Gasto Máximo</p>
            <p className="truncate text-lg font-bold text-text-primary">
              {formatCurrency(maxValue, displayCurrency)}
            </p>
          </div>
          <div className="rounded-2xl border border-border-primary bg-background-elevated p-4">
            <p className="mb-1 text-xs text-text-muted">Promedio Diario</p>
            <p className="truncate text-lg font-bold text-text-primary">
              {formatCurrency(avgPeriod, displayCurrency)}
            </p>
          </div>
        </div>

        {/* 4. Rendimiento por Cuenta */}
        <div className="rounded-3xl border border-border-primary bg-background-elevated p-5">
          <h3 className="mb-4 text-lg font-bold text-text-primary">
            Rendimiento por Cuenta
          </h3>
          <div className="space-y-3">
            {accountMetrics.length > 0 ? (
              accountMetrics.map((acc) => (
                <div
                  key={acc.id}
                  className="flex flex-col rounded-2xl border border-border-secondary bg-background-primary/50 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="mr-2 truncate font-medium text-text-primary">
                      {acc.name}
                    </span>
                    <span
                      className={`whitespace-nowrap text-sm font-bold ${acc.net >= 0 ? 'text-green-500' : 'text-red-500'}`}
                    >
                      {acc.net > 0 ? '+' : ''}
                      {formatCurrency(acc.net, acc.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <span className="text-green-600/80">
                        Ing: {formatCurrency(acc.income, acc.currency)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-red-500/80">
                        Gas: {formatCurrency(acc.expense, acc.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl bg-background-tertiary/30 py-6 text-center text-sm text-text-muted">
                Sin actividad registrada
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDebts = () => {

    const totalOwe = openDebtTransactions
      .filter((transaction) => transaction.debtDirection === DebtDirection.OWE)
      .reduce(
        (sum, transaction) => sum + (transaction.amountBaseMinor || 0),
        0
      );
    const totalOwedToMe = openDebtTransactions
      .filter(
        (transaction) => transaction.debtDirection === DebtDirection.OWED_TO_ME
      )
      .reduce(
        (sum, transaction) => sum + (transaction.amountBaseMinor || 0),
        0
      );

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border-primary bg-background-elevated p-4">
            <p className="text-sm text-text-muted">Cuanto debo</p>
            <p className="mt-2 text-2xl font-bold text-red-500">
              {formatCurrency(totalOwe, baseCurrency)}
            </p>
          </div>
          <div className="rounded-2xl border border-border-primary bg-background-elevated p-4">
            <p className="text-sm text-text-muted">Cuanto me deben</p>
            <p className="mt-2 text-2xl font-bold text-green-500">
              {formatCurrency(totalOwedToMe, baseCurrency)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border-primary bg-background-elevated p-4">
          <h3 className="mb-3 text-lg font-semibold text-text-primary">
            Cartera de deuda
          </h3>
          {debtPortfolioTransactions.length === 0 && (
            <p className="text-sm text-text-muted">
              No hay deudas en el periodo.
            </p>
          )}

          {debtPortfolioTransactions.length > 0 && (
            <div className="space-y-2">
              {debtPortfolioTransactions.slice(0, 8).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-xl bg-background-primary p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {transaction.description || 'Sin descripción'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {transaction.debtDirection === DebtDirection.OWE
                        ? 'Debo'
                        : 'Me deben'}{' '}
                      •{' '}
                      {transaction.debtStatus === DebtStatus.SETTLED
                        ? 'Saldada'
                        : 'Abierta'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-text-primary">
                    {formatCurrency(
                      transaction.amountMinor || 0,
                      transaction.currencyCode
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (selectedTab) {
      case 'overview':
        return renderOverview();
      case 'categories':
        return renderCategories();
      case 'trends':
        return renderTrends();
      case 'debts':
        return renderDebts();
      default:
        return renderOverview();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
          <p className="text-muted-foreground">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-40">
      {/* iOS-style Header */}
      <div className="py-6 text-center">
        <div className="mb-4 inline-flex items-center space-x-2 text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-500"></div>
          <span className="text-ios-caption font-medium">Análisis</span>
        </div>

        <h1 className="mb-4 bg-gradient-to-r from-primary via-cyan-600 to-blue-500 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl lg:text-6xl">
          📊 Reportes
        </h1>
        <p className="mb-6 font-light text-muted-foreground">
          Análisis de tus finanzas
        </p>

        {/* iOS Controls */}
        <div className="flex items-center justify-center space-x-2">
          <button
            type="button"
            className="focus-ring flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl bg-muted/20 p-3 text-muted-foreground transition-all duration-200 hover:bg-muted/30 hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="focus-ring flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl bg-primary/20 p-3 text-primary transition-all duration-200 hover:bg-primary/30"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="scrollbar-hide -mx-4 flex space-x-2 overflow-x-auto px-4 pb-2">
        {periods.map((period) => (
          <button
            key={period.id}
            onClick={() => setSelectedPeriod(period.id)}
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              selectedPeriod === period.id
                ? 'bg-primary text-white'
                : 'bg-background-elevated text-text-secondary hover:text-text-primary'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Currency Selector */}
      {availableCurrencies.length > 2 && (
        <div className="scrollbar-hide -mx-4 flex space-x-2 overflow-x-auto px-4 pb-2">
          {availableCurrencies.map((curr) => (
            <button
              key={curr}
              onClick={() => setSelectedCurrency(curr)}
              className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedCurrency === curr
                  ? 'border-primary bg-background-tertiary text-primary'
                  : 'border-border-primary bg-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {curr === 'ALL' ? 'Todas las divisas' : curr}
            </button>
          ))}
        </div>
      )}

      {/* Custom Date Range Picker */}
      {selectedPeriod === 'custom' && (
        <div className="mx-0 mb-2 flex animate-fade-in space-x-2 rounded-xl border border-border-primary bg-background-elevated p-3">
          <div className="flex-1">
            <p className="mb-1 ml-1 text-[10px] text-text-muted">Desde</p>
            <input
              type="date"
              value={customRange.start}
              onChange={(e) =>
                setCustomRange((prev) => ({ ...prev, start: e.target.value }))
              }
              className="w-full rounded-lg border border-border-secondary bg-background-tertiary px-2 py-2 text-xs text-text-primary outline-none focus:border-primary"
            />
          </div>
          <div className="flex-1">
            <p className="mb-1 ml-1 text-[10px] text-text-muted">Hasta</p>
            <input
              type="date"
              value={customRange.end}
              onChange={(e) =>
                setCustomRange((prev) => ({ ...prev, end: e.target.value }))
              }
              className="w-full rounded-lg border border-border-secondary bg-background-tertiary px-2 py-2 text-xs text-text-primary outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 overflow-hidden rounded-2xl border border-border-primary bg-background-elevated p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex min-w-0 flex-1 items-center justify-center space-x-1 rounded-xl px-2 py-3 text-xs font-medium transition-colors sm:space-x-2 sm:px-4 sm:text-sm ${
                selectedTab === tab.id
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
