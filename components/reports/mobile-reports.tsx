'use client';

import React, { useState, useEffect } from 'react';
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
  CreditCard
} from 'lucide-react';

export function MobileReports() {
  const { user } = useAuth();
  const { transactions, categories, accounts, loading, loadAllData } = useOptimizedData();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [customRange, setCustomRange] = useState({ 
    start: new Date().toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  const [selectedCurrency, setSelectedCurrency] = useState('ALL');
  const [selectedTab, setSelectedTab] = useState('overview');

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const availableCurrencies = React.useMemo(() => {
    const currencies = new Set<string>();
    transactions.forEach(t => currencies.add(t.currencyCode));
    return ['ALL', ...Array.from(currencies)];
  }, [transactions]);

  const periods = [
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'year', label: 'Año' },
    { id: 'custom', label: 'Personalizado' }
  ];

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: PieChart },
    { id: 'categories', label: 'Categorías', icon: BarChart3 },
    { id: 'trends', label: 'Tendencias', icon: Target }
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

  // Calcular totales por moneda original para visualización detallada
  const totalsByCurrency = (() => {
    const income: Record<string, { amount: number, baseAmount: number }> = {};
    const expense: Record<string, { amount: number, baseAmount: number }> = {};
    const net: Record<string, { amount: number, baseAmount: number }> = {};

    filteredTransactions.forEach(t => {
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
        if (!expense[currency]) expense[currency] = { amount: 0, baseAmount: 0 };
        expense[currency].amount += amount;
        expense[currency].baseAmount += baseAmount;

        net[currency].amount -= amount;
        net[currency].baseAmount -= baseAmount;
      }
    });

    // Helper for sorting by base currency impact
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
      
      // Sort currencies by base amount
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
        color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500'][idx % 5]
      };
    }).sort((a, b) => b.baseAmount - a.baseAmount);
  })();

  const renderOverview = () => {
    // Cast to any to avoid TS error since Supabase User type doesn't have baseCurrency directly
    // In the future, we should merge the DB profile into the auth user context
    const baseCurrency = (user as any)?.baseCurrency || 'USD';
    const netBalance = totalIncome - totalExpenses;
    const daysInPeriod = Math.max(1, Math.ceil((new Date().getTime() - getPeriodStartDate(selectedPeriod).getTime()) / (24 * 60 * 60 * 1000)));
    const avgDailyExpense = Math.round(totalExpenses / daysInPeriod);

    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary min-w-0">
            <div className="flex items-center justify-between mb-2 gap-1">
              <span className="text-sm text-text-muted truncate">Ingresos</span>
              <ArrowUpRight className="h-4 w-4 text-green-500 shrink-0" />
            </div>
            <div className="flex flex-col gap-1">
                {totalsByCurrency.income.length > 0 ? (
                  totalsByCurrency.income.map(({ currency, amount }) => (
                    <p key={currency} className="text-lg font-bold text-text-primary truncate">
                      {formatCurrency(amount, currency)}
                    </p>
                  ))
                ) : (
                   <p className="text-lg font-bold text-text-primary truncate">{formatCurrency(0, baseCurrency)}</p>
                )}
            </div>
          </div>
          
          <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary min-w-0">
            <div className="flex items-center justify-between mb-2 gap-1">
              <span className="text-sm text-text-muted truncate">Gastos</span>
              <ArrowDownRight className="h-4 w-4 text-red-500 shrink-0" />
            </div>
            <div className="flex flex-col gap-1">
                {totalsByCurrency.expense.length > 0 ? (
                  totalsByCurrency.expense.map(({ currency, amount }) => (
                    <p key={currency} className="text-lg font-bold text-text-primary truncate">
                      {formatCurrency(amount, currency)}
                    </p>
                  ))
                ) : (
                   <p className="text-lg font-bold text-text-primary truncate">{formatCurrency(0, baseCurrency)}</p>
                )}
            </div>
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-muted">Balance Neto</span>
            <Wallet className="h-4 w-4 text-text-muted shrink-0" />
          </div>
          <div className="flex flex-col gap-1 mb-2">
             {totalsByCurrency.net.length > 0 ? (
                totalsByCurrency.net.map(({ currency, amount }) => (
                  <p key={currency} className={`text-2xl font-bold truncate ${amount >= 0 ? 'text-text-primary' : 'text-red-500'}`}>
                    {formatCurrency(amount, currency)}
                  </p>
                ))
             ) : (
                <p className="text-2xl font-bold text-text-primary truncate">{formatCurrency(0, baseCurrency)}</p>
             )}
          </div>
          <p className={`text-xs truncate ${netBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {netBalance >= 0 ? 'Superávit' : 'Déficit'} este período (Global)
          </p>
        </div>

        {/* Quick Stats */}
        <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
          <h3 className="text-lg font-semibold text-text-primary mb-3">Estadísticas Rápidas</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">Transacciones</span>
              <span className="text-sm font-medium text-text-primary">{filteredTransactions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">Promedio por día</span>
              <span className="text-sm font-medium text-text-primary">
                {formatCurrency(avgDailyExpense, baseCurrency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">Categorías activas</span>
              <span className="text-sm font-medium text-text-primary">{categoryTotals.length}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCategories = () => (
    <div className="space-y-4">
      {/* Categories Breakdown */}
      <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Gastos por Categoría</h3>
        <div className="space-y-3">
          {categoryTotals.map((category) => (
            <div key={category.category} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`w-4 h-4 rounded-full shrink-0 ${category.color}`}></div>
                  <span className="text-sm font-medium text-text-primary truncate">{category.category}</span>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end">
                  {Object.entries(category.currencies).map(([curr, amt]) => (
                    <p key={curr} className="text-sm font-semibold text-text-primary">
                      {formatCurrency(amt, curr)}
                    </p>
                  ))}
                  <p className="text-xs text-text-muted">{category.percentage}%</p>
                </div>
              </div>
              <div className="w-full bg-background-primary rounded-full h-2">
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
      <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Mayores Gastos</h3>
        <div className="space-y-3">
          {filteredTransactions
            .filter(t => t.amountMinor < 0)
            .sort((a, b) => a.amountMinor - b.amountMinor)
            .slice(0, 3)
            .map((transaction, index) => (
              <div key={transaction.id} className="flex items-center justify-between gap-2 p-3 bg-background-primary rounded-xl">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                    <CreditCard className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{transaction.description}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(transaction.date).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-text-primary shrink-0">
                  {formatCurrency(Math.abs(transaction.amountMinor), transaction.currencyCode)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderTrends = () => {
    const baseCurrency = (user as any)?.baseCurrency || 'USD';
    const displayCurrency = selectedCurrency === 'ALL' ? baseCurrency : selectedCurrency;
    
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
    filteredTransactions.forEach(t => {
      const amount = selectedCurrency === 'ALL' ? (t.amountBaseMinor || 0) : (t.amountMinor || 0);
      
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
                     keys.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
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
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                keys.push(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
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
    const chartData = allKeys.map(key => {
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
          : date.toLocaleDateString('es-ES', { dateStyle: 'full' })
      };
    });

    // 6. Preparar datos Semanales
    const weekDaysLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weekDayChart = [
      ...weekDayData.slice(1).map((val, i) => ({ label: weekDaysLabels[i+1], value: val })),
      { label: weekDaysLabels[0], value: weekDayData[0] }
    ];
    const maxWeekDay = Math.max(...weekDayChart.map(d => d.value), 0);

    // 7. Métricas Generales
    const maxValue = Math.max(...chartData.map(d => d.value), 0);
    const activeDataPoints = chartData.filter(d => d.value > 0).length;
    const avgPeriod = activeDataPoints > 0 ? periodExpense / activeDataPoints : 0;
    const savingsRate = periodIncome > 0 ? ((periodIncome - periodExpense) / periodIncome) * 100 : 0;
    const cashFlow = periodIncome - periodExpense;

    // 8. Métricas de Cuentas
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

    return (
      <div className="space-y-6">
        {/* 1. Gráfico Principal: Evolución */}
        <div className="bg-background-elevated rounded-3xl p-5 border border-border-primary shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-text-primary">Evolución</h3>
              <p className="text-xs text-text-muted">Gasto {isLongPeriod ? 'mensual' : 'diario'}</p>
            </div>
            <div className="bg-background-tertiary p-2 rounded-xl">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
          </div>

          {/* Chart Area */}
          <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <div className="flex flex-col h-64" style={{ minWidth: chartData.length > 12 ? `${chartData.length * 32}px` : '100%' }}> 
              {/* Bars Section */}
              <div className="flex-1 flex items-end space-x-2 mb-2 min-h-0">
                {chartData.length > 0 ? (
                  chartData.map((data, idx) => {
                    const heightPercent = maxValue > 0 ? (data.value / maxValue) * 100 : 0;
                    return (
                      <div key={data.key} className="flex-1 h-full flex items-end justify-center group relative">
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background-tertiary border border-border-primary px-3 py-1.5 rounded-xl text-xs whitespace-nowrap z-20 pointer-events-none transition-opacity shadow-lg">
                          <p className="font-bold">{formatCurrency(data.value, displayCurrency)}</p>
                          <p className="text-[10px] text-text-muted">{data.fullDate}</p>
                        </div>
                        
                        {/* Bar Track (Optional background) */}
                        <div className="w-full h-full bg-transparent flex items-end rounded-t-md relative overflow-hidden">
                            {/* Actual Bar */}
                            <div 
                              className="w-full bg-gradient-to-t from-primary/60 to-primary rounded-t-md hover:from-primary hover:to-primary-hover transition-all duration-500 ease-out"
                              style={{ height: `${Math.max(heightPercent, 2)}%` }} // Min 2% visibility
                            ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted text-sm italic">
                    Sin datos suficientes
                  </div>
                )}
              </div>

              {/* Labels Section */}
              <div className="h-6 flex space-x-2">
                  {chartData.map((data) => (
                      <div key={data.key} className="flex-1 text-center min-w-0">
                          <span className="text-[10px] text-text-muted block truncate">
                              {data.label}
                          </span>
                      </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Salud Financiera (Ingresos vs Gastos) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarjeta de Tasa de Ahorro */}
            <div className="bg-background-elevated rounded-3xl p-5 border border-border-primary relative overflow-hidden">
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <p className="text-sm text-text-muted font-medium">Tasa de Ahorro</p>
                        <h3 className={`text-2xl font-bold ${savingsRate >= 20 ? 'text-green-500' : savingsRate > 0 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {savingsRate.toFixed(1)}%
                        </h3>
                    </div>
                    <div className={`p-2 rounded-full ${savingsRate >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <Target className={`h-5 w-5 ${savingsRate >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                    </div>
                </div>
                
                {/* Barra de progreso Ingreso vs Gasto */}
                <div className="relative z-10 space-y-2">
                    <div className="flex justify-between text-xs text-text-secondary">
                        <span>Gastado: {Math.min(100 - savingsRate, 100).toFixed(0)}%</span>
                        <span>Objetivo: 20%</span>
                    </div>
                    <div className="h-3 w-full bg-background-tertiary rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full ${savingsRate >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.max(savingsRate, 0)}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-text-muted pt-1">
                        Flujo de caja: <span className="font-semibold text-text-primary">{formatCurrency(cashFlow, displayCurrency)}</span>
                    </p>
                </div>
                
                {/* Decoración de fondo */}
                <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 ${savingsRate >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>

            {/* Tarjeta de Patrón Semanal */}
            <div className="bg-background-elevated rounded-3xl p-5 border border-border-primary">
                <p className="text-sm text-text-muted font-medium mb-4">Patrón Semanal de Gasto</p>
                <div className="h-24 flex items-end space-x-2">
                    {weekDayChart.map((day, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center">
                            <div 
                                className="w-full bg-blue-500/20 rounded-t-sm min-h-[2px]"
                                style={{ height: `${maxWeekDay > 0 ? (day.value / maxWeekDay) * 100 : 0}%` }}
                            >
                                <div 
                                    className="w-full bg-blue-500 rounded-t-sm transition-all hover:opacity-80" 
                                    style={{ height: '100%' }}
                                    title={formatCurrency(day.value, displayCurrency)}
                                ></div>
                            </div>
                            <span className="text-[9px] text-text-muted mt-1">{day.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* 3. Métricas Rápidas */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
                <p className="text-xs text-text-muted mb-1">Gasto Máximo</p>
                <p className="text-lg font-bold text-text-primary truncate">
                    {formatCurrency(maxValue, displayCurrency)}
                </p>
            </div>
            <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
                <p className="text-xs text-text-muted mb-1">Promedio Diario</p>
                <p className="text-lg font-bold text-text-primary truncate">
                    {formatCurrency(avgPeriod, displayCurrency)}
                </p>
            </div>
        </div>

        {/* 4. Rendimiento por Cuenta */}
        <div className="bg-background-elevated rounded-3xl p-5 border border-border-primary">
          <h3 className="text-lg font-bold text-text-primary mb-4">Rendimiento por Cuenta</h3>
          <div className="space-y-3">
            {accountMetrics.length > 0 ? (
              accountMetrics.map(acc => (
                <div key={acc.id} className="flex flex-col p-4 bg-background-primary/50 rounded-2xl border border-border-secondary">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-text-primary truncate mr-2">{acc.name}</span>
                    <span className={`text-sm font-bold whitespace-nowrap ${acc.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {acc.net > 0 ? '+' : ''}{formatCurrency(acc.net, acc.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-3">
                        <span className="text-green-600/80">Ing: {formatCurrency(acc.income, acc.currency)}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className="text-red-500/80">Gas: {formatCurrency(acc.expense, acc.currency)}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-text-muted text-sm py-6 bg-background-tertiary/30 rounded-xl">
                Sin actividad registrada
              </p>
            )}
          </div>
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
      default:
        return renderOverview();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-neutral-400 dark:text-neutral-500">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-40">
      {/* iOS-style Header */}
      <div className="text-center py-6">
        <div className="inline-flex items-center space-x-2 text-muted-foreground mb-4">
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
          <span className="text-ios-caption font-medium">Análisis</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-bold mb-4 tracking-tight bg-gradient-to-r from-primary via-cyan-600 to-blue-500 bg-clip-text text-white">
          📊 Reportes
        </h1>
        <p className="text-muted-foreground font-light mb-6">
          Análisis de tus finanzas
        </p>
        
        {/* iOS Controls */}
        <div className="flex items-center justify-center space-x-2">
          <button className="p-3 rounded-2xl bg-muted/20 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-all duration-200">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button className="p-3 rounded-2xl bg-primary/20 hover:bg-primary/30 text-primary transition-all duration-200">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {periods.map((period) => (
          <button
            key={period.id}
            onClick={() => setSelectedPeriod(period.id)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
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
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {availableCurrencies.map(curr => (
                <button
                key={curr}
                onClick={() => setSelectedCurrency(curr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap border ${
                    selectedCurrency === curr
                    ? 'bg-background-tertiary border-primary text-primary'
                    : 'bg-transparent border-border-primary text-text-muted hover:text-text-primary'
                }`}
                >
                {curr === 'ALL' ? 'Todas las divisas' : curr}
                </button>
            ))}
        </div>
      )}
                        
      {/* Custom Date Range Picker */}
      {selectedPeriod === 'custom' && (
        <div className="flex space-x-2 bg-background-elevated p-3 rounded-xl border border-border-primary animate-fade-in mx-0 mb-2">
            <div className="flex-1">
                <p className="text-[10px] text-text-muted mb-1 ml-1">Desde</p>
                <input 
                    type="date" 
                    value={customRange.start}
                    onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full bg-background-tertiary rounded-lg px-2 py-2 text-xs text-text-primary border border-border-secondary focus:border-primary outline-none"
                />
            </div>
            <div className="flex-1">
                <p className="text-[10px] text-text-muted mb-1 ml-1">Hasta</p>
                <input 
                    type="date" 
                    value={customRange.end}
                    onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full bg-background-tertiary rounded-lg px-2 py-2 text-xs text-text-primary border border-border-secondary focus:border-primary outline-none"
                />
            </div>
        </div>
      )}
                        
      {/* Tabs */}
      <div className="flex space-x-1 bg-background-elevated rounded-2xl p-1 border border-border-primary overflow-hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-colors min-w-0 ${
                selectedTab === tab.id
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'
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

