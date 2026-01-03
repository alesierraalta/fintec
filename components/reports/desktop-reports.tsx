'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { formatCurrency } from '@/lib/money';
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
  Calendar,
  Filter,
  Activity,
  Percent,
  Hash
} from 'lucide-react';

export function DesktopReports() {
  const { user } = useAuth();
  const { transactions, categories, accounts, loading, loadAllData } = useOptimizedData();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [customRange, setCustomRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedCurrency, setSelectedCurrency] = useState('ALL');

  // Click outside handler for dropdown
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    transactions.forEach(t => currencies.add(t.currencyCode));
    return ['ALL', ...Array.from(currencies)];
  }, [transactions]);

  const periods = [
    { id: 'week', label: 'Esta Semana' },
    { id: 'month', label: 'Este Mes' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'year', label: 'Este Año' },
    { id: 'custom', label: 'Personalizado' }
  ];

  const getPeriodStartDate = (period: string): Date => {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  };

  const filteredTransactions = (() => {
    let start = new Date();
    let end = new Date();

    if (selectedPeriod === 'custom') {
      start = new Date(customRange.start);
      end = new Date(customRange.end);
      end.setHours(23, 59, 59, 999);
    } else {
      start = getPeriodStartDate(selectedPeriod);
      end = new Date(8640000000000000); // Max date
    }

    let filtered = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    if (selectedCurrency !== 'ALL') {
      filtered = filtered.filter(t => t.currencyCode === selectedCurrency);
    }

    return filtered;
  })();

  const totalIncome = filteredTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + (t.amountBaseMinor || 0), 0);
  const totalExpenses = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + (t.amountBaseMinor || 0), 0);

  // Calcular totales por moneda original
  const totalsByCurrency = (() => {
    const income: Record<string, { amount: number, baseAmount: number }> = {};
    const expense: Record<string, { amount: number, baseAmount: number }> = {};
    const net: Record<string, { amount: number, baseAmount: number }> = {};

    filteredTransactions.forEach(t => {
      const amount = t.amountMinor || 0;
      const baseAmount = t.amountBaseMinor || 0;
      const currency = t.currencyCode || 'USD';

      if (!net[currency]) net[currency] = { amount: 0, baseAmount: 0 };

      if (t.type === 'INCOME') {
        if (!income[currency]) income[currency] = { amount: 0, baseAmount: 0 };
        income[currency].amount += amount;
        income[currency].baseAmount += baseAmount;

        net[currency].amount += amount;
        net[currency].baseAmount += baseAmount;
      } else if (t.type === 'EXPENSE') {
        if (!expense[currency]) expense[currency] = { amount: 0, baseAmount: 0 };
        expense[currency].amount += amount;
        expense[currency].baseAmount += baseAmount;

        net[currency].amount -= amount;
        net[currency].baseAmount -= baseAmount;
      }
    });

    const sort = (map: Record<string, { amount: number, baseAmount: number }>) =>
      Object.entries(map)
        .sort(([, a], [, b]) => Math.abs(b.baseAmount) - Math.abs(a.baseAmount))
        .map(([curr, val]) => ({ currency: curr, amount: val.amount }));

    return {
      income: sort(income),
      expense: sort(expense),
      net: sort(net)
    };
  })();

  const categoryTotals = (() => {
    const currencyMap: Record<string, Record<string, { amount: number, baseAmount: number }>> = {};
    const baseMap: Record<string, number> = {};

    filteredTransactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      const key = t.categoryId || 'uncategorized';
      const currency = t.currencyCode || 'USD';
      const amount = t.amountMinor || 0;
      const baseAmount = t.amountBaseMinor || 0;

      if (!currencyMap[key]) currencyMap[key] = {};
      if (!currencyMap[key][currency]) currencyMap[key][currency] = { amount: 0, baseAmount: 0 };

      currencyMap[key][currency].amount += amount;
      currencyMap[key][currency].baseAmount += baseAmount;

      baseMap[key] = (baseMap[key] || 0) + baseAmount;
    });

    const totalBase = Object.values(baseMap).reduce((s, v) => s + v, 0);
    const idToName: Record<string, string> = {};
    categories.forEach(c => { idToName[c.id] = c.name; });

    return Object.entries(currencyMap).map(([id, currenciesData], idx) => {
      const baseAmount = baseMap[id] || 0;
      const sortedCurrencies = Object.entries(currenciesData)
        .sort(([, a], [, b]) => b.baseAmount - a.baseAmount)
        .reduce((acc, [curr, val]) => {
          acc[curr] = val.amount;
          return acc;
        }, {} as Record<string, number>);

      return {
        category: idToName[id] || 'Sin categoría',
        currencies: sortedCurrencies,
        baseAmount: baseAmount,
        percentage: totalBase > 0 ? Math.round((baseAmount / totalBase) * 100) : 0,
        color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-orange-500', 'bg-teal-500'][idx % 8]
      };
    }).sort((a, b) => b.baseAmount - a.baseAmount);
  })();

  // --- Logic for Trends/Charts ---
  const baseCurrency = (user as any)?.baseCurrency || 'USD';
  const displayCurrency = selectedCurrency === 'ALL' ? baseCurrency : selectedCurrency;

  let isLongPeriod = ['year', 'quarter'].includes(selectedPeriod);
  if (selectedPeriod === 'custom') {
    const start = new Date(customRange.start);
    const end = new Date(customRange.end);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isLongPeriod = diffDays > 45;
  }

  const groupedData: Record<string, number> = {};
  const weekDayData = new Array(7).fill(0);
  let periodIncome = 0;
  let periodExpense = 0;

  filteredTransactions.forEach(t => {
    const amount = selectedCurrency === 'ALL' ? (t.amountBaseMinor || 0) : (t.amountMinor || 0);

    if (t.type === 'EXPENSE') {
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

  const generateAllKeys = () => {
    const keys = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (selectedPeriod === 'week') {
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
        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        while (current <= end) {
          keys.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
          current.setMonth(current.getMonth() + 1);
        }
      } else {
        const current = new Date(start);
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
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        keys.push(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
      }
    } else if (selectedPeriod === 'quarter') {
      const q = Math.floor(currentMonth / 3);
      for (let i = 0; i < 3; i++) {
        keys.push(`${currentYear}-${String(q * 3 + i + 1).padStart(2, '0')}`);
      }
    } else if (selectedPeriod === 'year') {
      for (let i = 0; i < 12; i++) {
        keys.push(`${currentYear}-${String(i + 1).padStart(2, '0')}`);
      }
    }
    return keys;
  };

  const allKeys = generateAllKeys();

  const chartData = allKeys.map(key => {
    const parts = key.split('-').map(Number);
    const y = parts[0];
    const m = parts[1];
    const d = parts[2] || 1;
    const date = new Date(y, m - 1, d, 12);

    return {
      key,
      value: groupedData[key] || 0,
      label: isLongPeriod
        ? date.toLocaleDateString('es-ES', { month: 'short' })
        : date.getDate().toString(),
      fullDate: isLongPeriod
        ? date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
        : date.toLocaleDateString('es-ES', { dateStyle: 'full' })
    };
  });

  const weekDaysLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const weekDayChart = [
    ...weekDayData.slice(1).map((val, i) => ({ label: weekDaysLabels[i + 1], value: val })),
    { label: weekDaysLabels[0], value: weekDayData[0] }
  ];
  const maxWeekDay = Math.max(...weekDayChart.map(d => d.value), 0);

  const maxValue = Math.max(...chartData.map(d => d.value), 0);
  const activeDataPoints = chartData.filter(d => d.value > 0).length;
  const avgPeriod = activeDataPoints > 0 ? periodExpense / activeDataPoints : 0;
  const savingsRate = periodIncome > 0 ? ((periodIncome - periodExpense) / periodIncome) * 100 : 0;
  const cashFlow = periodIncome - periodExpense;

  const accountMetrics = accounts.map(acc => {
    const accTransactions = filteredTransactions.filter(t => t.accountId === acc.id);
    const income = accTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + (t.amountMinor || 0), 0);
    const expense = accTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + (t.amountMinor || 0), 0);
    const incomeBase = accTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + (t.amountBaseMinor || 0), 0);
    const expenseBase = accTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + (t.amountBaseMinor || 0), 0);

    return {
      id: acc.id,
      name: acc.name,
      currency: acc.currencyCode,
      income,
      expense,
      net: income - expense,
      netBase: incomeBase - expenseBase,
      hasActivity: income > 0 || expense > 0
    };
  }).filter(acc => acc.hasActivity).sort((a, b) => b.netBase - a.netBase);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-neutral-400 dark:text-neutral-500">Cargando reportes...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen p-6 animate-fade-in pb-20">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="text-left">
            <div className="inline-flex items-center space-x-2 text-muted-foreground mb-2">
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
              <span className="text-ios-caption font-medium">Análisis</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-cyan-600 to-blue-500 bg-clip-text text-white">
              Reportes Financieros
            </h1>
            <p className="text-muted-foreground font-light mt-1">
              Visión completa de tu estado financiero
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Period Selector */}
            <div className="bg-background-elevated p-1 rounded-xl flex space-x-1 border border-border-primary overflow-x-auto">
              {periods.map((period) => (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(period.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${selectedPeriod === period.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }`}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {/* Currency Selector (Custom Dropdown) */}
            {availableCurrencies.length > 2 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                  className="flex items-center gap-2 bg-background-elevated border border-border-primary text-text-primary text-sm rounded-xl px-4 py-2.5 h-full hover:border-primary/50 transition-colors shadow-sm outline-none focus:ring-2 focus:ring-primary/20 min-w-[160px] justify-between"
                >
                  <span className="truncate">
                    {selectedCurrency === 'ALL' ? 'Todas las divisas' : selectedCurrency}
                  </span>
                  <ArrowDownRight className={`h-4 w-4 text-text-muted transition-transform duration-200 ${isCurrencyDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isCurrencyDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-full min-w-[180px] bg-background-elevated border border-border-primary rounded-xl shadow-xl z-50 overflow-hidden animate-scale-in origin-top-right">
                    <div className="p-1">
                      {availableCurrencies.map(curr => (
                        <button
                          key={curr}
                          onClick={() => {
                            setSelectedCurrency(curr);
                            setIsCurrencyDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${selectedCurrency === curr
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
                            }`}
                        >
                          <span>{curr === 'ALL' ? 'Todas las divisas' : curr}</span>
                          {selectedCurrency === curr && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Custom Range Picker */}
        {selectedPeriod === 'custom' && (
          <div className="bg-background-elevated p-4 rounded-xl border border-border-primary flex items-center gap-4 w-fit animate-fade-in">
            <div className="flex flex-col">
              <span className="text-xs text-text-muted mb-1">Desde</span>
              <input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-background-tertiary rounded-lg px-3 py-2 text-sm text-text-primary border border-border-secondary outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-text-muted mb-1">Hasta</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-background-tertiary rounded-lg px-3 py-2 text-sm text-text-primary border border-border-secondary outline-none focus:border-primary"
              />
            </div>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-background-elevated rounded-2xl p-5 border border-border-primary shadow-sm hover:border-primary/30 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-green-500/10 rounded-xl text-green-500">
                <ArrowUpRight className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-background-tertiary text-text-muted">Ingresos</span>
            </div>
            <div className="space-y-1">
              {totalsByCurrency.income.length > 0 ? (
                totalsByCurrency.income.map(({ currency, amount }) => (
                  <p key={currency} className="text-2xl font-bold text-text-primary">
                    {formatCurrency(amount, currency)}
                  </p>
                ))
              ) : (
                <p className="text-2xl font-bold text-text-primary">{formatCurrency(0, baseCurrency)}</p>
              )}
            </div>
            <p className="text-xs text-text-muted mt-2">En el periodo seleccionado</p>
          </div>

          <div className="bg-background-elevated rounded-2xl p-5 border border-border-primary shadow-sm hover:border-primary/30 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-red-500/10 rounded-xl text-red-500">
                <ArrowDownRight className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-background-tertiary text-text-muted">Gastos</span>
            </div>
            <div className="space-y-1">
              {totalsByCurrency.expense.length > 0 ? (
                totalsByCurrency.expense.map(({ currency, amount }) => (
                  <p key={currency} className="text-2xl font-bold text-text-primary">
                    {formatCurrency(amount, currency)}
                  </p>
                ))
              ) : (
                <p className="text-2xl font-bold text-text-primary">{formatCurrency(0, baseCurrency)}</p>
              )}
            </div>
            <p className="text-xs text-text-muted mt-2">En el periodo seleccionado</p>
          </div>

          <div className="bg-background-elevated rounded-2xl p-5 border border-border-primary shadow-sm hover:border-primary/30 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                <Wallet className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-background-tertiary text-text-muted">Balance Neto</span>
            </div>
            <div className="space-y-1">
              {totalsByCurrency.net.length > 0 ? (
                totalsByCurrency.net.map(({ currency, amount }) => (
                  <p key={currency} className={`text-2xl font-bold ${amount >= 0 ? 'text-text-primary' : 'text-red-500'}`}>
                    {formatCurrency(amount, currency)}
                  </p>
                ))
              ) : (
                <p className="text-2xl font-bold text-text-primary">{formatCurrency(0, baseCurrency)}</p>
              )}
            </div>
            <p className={`text-xs mt-2 ${periodIncome - periodExpense >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {periodIncome - periodExpense >= 0 ? 'Superávit' : 'Déficit'} global
            </p>
          </div>

          <div className="bg-background-elevated rounded-2xl p-5 border border-border-primary shadow-sm hover:border-primary/30 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500">
                <Target className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-background-tertiary text-text-muted">Tasa Ahorro</span>
            </div>
            <p className={`text-3xl font-bold ${savingsRate >= 20 ? 'text-green-500' : savingsRate > 0 ? 'text-yellow-500' : 'text-text-primary'}`}>
              {savingsRate.toFixed(1)}%
            </p>
            <div className="w-full bg-background-tertiary rounded-full h-1.5 mt-3">
              <div
                className={`h-1.5 rounded-full ${savingsRate >= 0 ? 'bg-purple-500' : 'bg-red-500'}`}
                style={{ width: `${Math.max(Math.min(savingsRate, 100), 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Chart Section */}
        <div className="bg-background-elevated rounded-3xl p-6 border border-border-primary shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-text-primary">Evolución de Gastos</h3>
              <p className="text-sm text-text-muted">Comportamiento {isLongPeriod ? 'mensual' : 'diario'} en el tiempo</p>
            </div>
            <div className="bg-background-tertiary p-2 rounded-xl">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
          </div>

          <div className="h-72 w-full">
            <div className="flex h-full items-end space-x-2">
              {chartData.length > 0 ? (
                chartData.map((data, idx) => {
                  const heightPercent = maxValue > 0 ? (data.value / maxValue) * 100 : 0;
                  return (
                    <div key={data.key} className="flex-1 h-full flex flex-col justify-end group cursor-pointer relative">
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background-tertiary border border-border-primary px-3 py-1.5 rounded-xl text-xs whitespace-nowrap z-20 pointer-events-none transition-opacity shadow-lg">
                        <p className="font-bold">{formatCurrency(data.value, displayCurrency)}</p>
                        <p className="text-[10px] text-text-muted">{data.fullDate}</p>
                      </div>

                      <div className="w-full bg-blue-500/10 rounded-t-lg relative" style={{ height: `${Math.max(heightPercent, 2)}%` }}>
                        <div className="absolute bottom-0 w-full bg-gradient-to-t from-primary/80 to-primary rounded-t-lg transition-all duration-500 group-hover:bg-primary-hover h-full opacity-80 group-hover:opacity-100"></div>
                      </div>
                      <span className="text-[10px] text-text-muted text-center mt-2 truncate w-full block">
                        {data.label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted">Sin datos suficientes</div>
              )}
            </div>
          </div>
        </div>

        {/* Categories & Stats Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Stats & Weekly Pattern */}
          <div className="lg:col-span-1 space-y-6">
            {/* Weekly Pattern */}
            <div className="bg-background-elevated rounded-3xl p-6 border border-border-primary">
              <h3 className="text-lg font-bold text-text-primary mb-4">Patrón Semanal</h3>
              <div className="h-32 flex items-end space-x-2">
                {weekDayChart.map((day, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative">
                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 text-[10px] bg-background-tertiary px-2 py-1 rounded shadow pointer-events-none">
                      {formatCurrency(day.value, displayCurrency)}
                    </div>
                    <div
                      className="w-full bg-indigo-500/20 rounded-t-sm min-h-[4px]"
                      style={{ height: `${maxWeekDay > 0 ? (day.value / maxWeekDay) * 100 : 0}%` }}
                    >
                      <div className="w-full h-full bg-indigo-500/80 rounded-t-sm hover:bg-indigo-500 transition-colors"></div>
                    </div>
                    <span className="text-[10px] text-text-muted mt-2">{day.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-background-elevated rounded-3xl p-6 border border-border-primary">
              <h3 className="text-lg font-bold text-text-primary mb-4">Métricas Rápidas</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-background-tertiary/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="text-sm text-text-muted">Promedio Diario</span>
                  </div>
                  <span className="font-semibold text-text-primary">{formatCurrency(avgPeriod, displayCurrency)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-background-tertiary/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Hash className="h-4 w-4 text-primary" />
                    <span className="text-sm text-text-muted">Transacciones</span>
                  </div>
                  <span className="font-semibold text-text-primary">{activeDataPoints} días activos</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-background-tertiary/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Percent className="h-4 w-4 text-primary" />
                    <span className="text-sm text-text-muted">Ratio Gasto/Ingreso</span>
                  </div>
                  <span className="font-semibold text-text-primary">
                    {periodIncome > 0 ? Math.round((periodExpense / periodIncome) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Categories */}
          <div className="lg:col-span-2 bg-background-elevated rounded-3xl p-6 border border-border-primary h-fit">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-text-primary">Gastos por Categoría</h3>
              <div className="p-2 bg-background-tertiary rounded-lg">
                <PieChart className="h-5 w-5 text-text-muted" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryTotals.slice(0, 10).map((category, idx) => (
                <div key={category.category} className="p-4 bg-background-tertiary/30 rounded-2xl border border-transparent hover:border-border-secondary transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 max-w-[70%]">
                      <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                      <span className="font-semibold text-text-primary truncate" title={category.category}>{category.category}</span>
                    </div>
                    <span className="text-xs font-mono text-text-muted">{category.percentage}%</span>
                  </div>

                  <div className="space-y-1 mb-3">
                    {Object.entries(category.currencies).map(([curr, amt]) => (
                      <p key={curr} className="text-sm font-medium text-text-primary text-right">
                        {formatCurrency(amt, curr)}
                      </p>
                    ))}
                  </div>

                  <div className="w-full bg-background-primary h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${category.color}`}
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {categoryTotals.length === 0 && (
                <div className="col-span-full py-10 text-center text-text-muted">
                  No hay datos de categorías para este periodo
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Performance Section */}
        <div className="bg-background-elevated rounded-3xl p-6 border border-border-primary">
          <h3 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Rendimiento por Cuenta
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {accountMetrics.length > 0 ? (
              accountMetrics.map(acc => (
                <div key={acc.id} className="p-5 bg-background-tertiary/30 rounded-2xl border border-border-secondary hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-text-primary truncate pr-2" title={acc.name}>{acc.name}</h4>
                    <span className="text-xs font-mono bg-background-primary px-2 py-1 rounded-md text-text-muted">{acc.currency}</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Ingresos</span>
                      <span className="text-green-500 font-medium">{formatCurrency(acc.income, acc.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Gastos</span>
                      <span className="text-red-500 font-medium">{formatCurrency(acc.expense, acc.currency)}</span>
                    </div>
                    <div className="w-full h-px bg-border-secondary my-1"></div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-primary font-medium">Neto</span>
                      <span className={`font-bold ${acc.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(acc.net, acc.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-text-muted">
                No hay actividad en cuentas en este periodo
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Helper for sorting
function sort(map: Record<string, { amount: number, baseAmount: number }>) {
  return Object.entries(map)
    .sort(([, a], [, b]) => Math.abs(b.baseAmount) - Math.abs(a.baseAmount))
    .map(([curr, val]) => ({ currency: curr, amount: val.amount }));
}
