'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { PeriodSelector } from '../filters/period-selector';
import { TimePeriod, getPeriodById } from '@/lib/dates/periods';
import { 
  getPreviousPeriod, 
  calculateTrend, 
  formatTrendPercentage, 
  getTrendColor,
  filterTransactionsByPeriod,
  calculateMetricsForPeriod 
} from '@/lib/dates/period-comparison';
import { 
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  RefreshCw,
  ShoppingCart,
  Activity,
  DollarSign,
  Calendar,
  Hash,
  Percent
} from 'lucide-react';

const periods = [
  { id: 'week', label: 'Esta Semana' },
  { id: 'month', label: 'Este Mes' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'year', label: 'Este Año' },
];

export function DesktopReports() {
  const { user } = useAuth();
  const { transactions, accounts, categories, loading, loadAllData } = useOptimizedData();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Set initial filtered transactions
  useEffect(() => {
    setFilteredTransactions(transactions);
  }, [transactions]);

  // Filter transactions when period changes
  useEffect(() => {
    if (!selectedPeriod) {
      setFilteredTransactions(transactions);
      return;
    }

    const period = getPeriodById(selectedPeriod);
    if (period) {
      const filtered = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= period.startDate && transactionDate <= period.endDate;
      });
      setFilteredTransactions(filtered);
    }
  }, [selectedPeriod, transactions]);

  // Calculate spending by category
  const categorySpending = useMemo(() => {
    const spending: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        const catId = t.categoryId || 'uncategorized';
        spending[catId] = (spending[catId] || 0) + (t.amountMinor / 100);
      });
    const totalSpent = Object.values(spending).reduce((sum, val) => sum + val, 0);
    return { spending, totalSpent };
  }, [filteredTransactions]);

  const handlePeriodChange = (period: TimePeriod | null) => {
    setSelectedPeriod(period?.id || '');
  };

  // Calculate current period metrics
  const currentMetrics = calculateMetricsForPeriod(filteredTransactions);
  
  // Calculate previous period metrics for trend comparison
  const previousMetrics = (() => {
    const defaultMetrics = { 
      income: 0, 
      expenses: 0, 
      savings: 0, 
      savingsRate: 0,
      totalTransactions: 0,
      avgTransactionAmount: 0,
      avgDailyExpenses: 0,
      avgDailyIncome: 0,
      netCashFlow: 0,
      expenseRatio: 0,
      transactionFrequency: { income: 0, expenses: 0 },
      topSpendingCategory: { categoryId: 'N/A', amount: 0 }
    };
    
    if (!selectedPeriod || !transactions.length) {
      return defaultMetrics;
    }
    
    const currentPeriodObj = getPeriodById(selectedPeriod);
    if (!currentPeriodObj) {
      return defaultMetrics;
    }
    
    const previousPeriod = getPreviousPeriod(currentPeriodObj);
    const previousTransactions = filterTransactionsByPeriod(transactions, previousPeriod);
    return calculateMetricsForPeriod(previousTransactions);
  })();

  // Calculate trends
  const trends = {
    income: calculateTrend(currentMetrics.income, previousMetrics.income),
    expenses: calculateTrend(currentMetrics.expenses, previousMetrics.expenses),
    savings: calculateTrend(currentMetrics.savings, previousMetrics.savings),
    savingsRate: calculateTrend(currentMetrics.savingsRate, previousMetrics.savingsRate),
    // Nuevas tendencias
    netCashFlow: calculateTrend(currentMetrics.netCashFlow, previousMetrics.netCashFlow),
    avgDailyExpenses: calculateTrend(currentMetrics.avgDailyExpenses, previousMetrics.avgDailyExpenses),
    expenseRatio: calculateTrend(currentMetrics.expenseRatio, previousMetrics.expenseRatio),
    totalTransactions: calculateTrend(currentMetrics.totalTransactions, previousMetrics.totalTransactions)
  };

  const MetricCard = ({ icon: Icon, title, value, trendData, color, isExpenseMetric = false }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string;
    trendData: any;
    color: string;
    isExpenseMetric?: boolean;
  }) => (
    <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${color} flex items-center justify-center`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {selectedPeriod && (
          <span className={`text-sm font-medium px-2 py-1 rounded-lg ${getTrendColor(trendData, isExpenseMetric).replace('text-', 'text-').replace('500', '400')} ${getTrendColor(trendData, isExpenseMetric).replace('text-', 'bg-').replace('500', '400')}/20`}>
            {formatTrendPercentage(trendData)}
          </span>
        )}
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-2">
        {selectedPeriod ? 'Período seleccionado' : 'Todos los datos'}
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-neutral-400 dark:text-neutral-500">Cargando reportes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* iOS-style Header */}
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-muted-foreground mb-4">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
            <span className="text-ios-caption font-medium">Análisis</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight bg-gradient-to-r from-primary via-cyan-600 to-blue-500 bg-clip-text text-white">
            📊 Reportes Financieros
          </h1>
          <p className="text-muted-foreground font-light mb-8">
            Análisis completo de tu situación financiera
          </p>
          
          {/* iOS Controls */}
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="bg-muted/20 rounded-2xl p-1">
              <PeriodSelector
                selectedPeriod={selectedPeriod}
                onPeriodChange={handlePeriodChange}
              />
            </div>
            
            <div className="flex space-x-2">
              <button className="p-3 rounded-2xl bg-muted/20 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-all duration-200 backdrop-blur-xl">
                <RefreshCw className="h-5 w-5" />
              </button>
              <button className="p-3 rounded-2xl bg-muted/20 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-all duration-200 backdrop-blur-xl">
                <Filter className="h-5 w-5" />
              </button>
              <button className="p-3 rounded-2xl bg-primary/20 hover:bg-primary/30 text-primary transition-all duration-200 backdrop-blur-xl">
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
          <MetricCard 
            icon={ArrowUpRight} 
            title="Ingresos Totales" 
            value={`$${currentMetrics.income.toLocaleString()}`} 
            trendData={trends.income}
            color="from-green-400 to-emerald-500" 
          />
          <MetricCard 
            icon={ArrowDownRight} 
            title="Gastos Totales" 
            value={`$${currentMetrics.expenses.toLocaleString()}`} 
            trendData={trends.expenses}
            color="from-red-400 to-rose-500"
            isExpenseMetric={true}
          />
          <MetricCard 
            icon={Target} 
            title="Ahorros Totales" 
            value={`$${currentMetrics.savings.toLocaleString()}`} 
            trendData={trends.savings}
            color="from-blue-400 to-cyan-500" 
          />
          <MetricCard 
            icon={PieChart} 
            title="Tasa de Ahorro" 
            value={`${currentMetrics.savingsRate.toFixed(1)}%`} 
            trendData={trends.savingsRate}
            color="from-purple-400 to-violet-500" 
          />
        </div>

        {/* Métricas Fundamentales Adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            icon={Activity} 
            title="Flujo de Efectivo" 
            value={`$${currentMetrics.netCashFlow.toLocaleString()}`} 
            trendData={trends.netCashFlow}
            color="from-indigo-400 to-purple-500" 
          />
          <MetricCard 
            icon={Calendar} 
            title="Gasto Diario Promedio" 
            value={`$${currentMetrics.avgDailyExpenses.toFixed(0)}`} 
            trendData={trends.avgDailyExpenses}
            color="from-orange-400 to-pink-500"
            isExpenseMetric={true}
          />
          <MetricCard 
            icon={Percent} 
            title="Ratio de Gastos" 
            value={`${currentMetrics.expenseRatio.toFixed(1)}%`} 
            trendData={trends.expenseRatio}
            color="from-amber-400 to-orange-500" 
          />
          <MetricCard 
            icon={Hash} 
            title="Total Transacciones" 
            value={currentMetrics.totalTransactions.toString()} 
            trendData={trends.totalTransactions}
            color="from-teal-400 to-cyan-500" 
          />
        </div>

        {/* Métricas de Actividad */}
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg">
          <div className="flex items-center space-x-2 mb-6">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
            <h2 className="text-ios-title font-semibold text-foreground">Métricas de Actividad</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="p-4 bg-green-500/10 rounded-2xl mb-4 w-fit mx-auto">
                <ArrowUpRight className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-ios-caption text-muted-foreground mb-2 tracking-wide">TRANSACCIONES DE INGRESO</h3>
              <p className="text-2xl font-light text-foreground mb-2">{currentMetrics.transactionFrequency.income}</p>
              <p className="text-ios-footnote text-green-600 font-medium">
                ${currentMetrics.avgDailyIncome.toFixed(0)}/día promedio
              </p>
            </div>
            
            <div className="text-center">
              <div className="p-4 bg-red-500/10 rounded-2xl mb-4 w-fit mx-auto">
                <ArrowDownRight className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-ios-caption text-muted-foreground mb-2 tracking-wide">TRANSACCIONES DE GASTO</h3>
              <p className="text-2xl font-light text-foreground mb-2">{currentMetrics.transactionFrequency.expenses}</p>
              <p className="text-ios-footnote text-red-600 font-medium">
                ${currentMetrics.avgTransactionAmount.toFixed(0)} promedio/transacción
              </p>
            </div>
            
            <div className="text-center">
              <div className="p-4 bg-purple-500/10 rounded-2xl mb-4 w-fit mx-auto">
                <ShoppingCart className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-ios-caption text-muted-foreground mb-2 tracking-wide">CATEGORÍA TOP</h3>
              <p className="text-2xl font-light text-foreground mb-2">
                ${currentMetrics.topSpendingCategory.amount && !isNaN(currentMetrics.topSpendingCategory.amount) && isFinite(currentMetrics.topSpendingCategory.amount) ? currentMetrics.topSpendingCategory.amount.toFixed(0) : '0'}
              </p>
              <p className="text-ios-footnote text-purple-600 font-medium">Mayor gasto</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categories */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <PieChart className="h-6 w-6 mr-3 text-pink-400" />
              Gastos por Categoría
            </h3>
            
            <div className="space-y-4">
              {categories
                .filter(category => categorySpending.spending[category.id] > 0)
                .sort((a, b) => (categorySpending.spending[b.id] || 0) - (categorySpending.spending[a.id] || 0))
                .map((category, index) => {
                  const amount = categorySpending.spending[category.id] || 0;
                  const percentage = categorySpending.totalSpent > 0 
                    ? Math.round((amount / categorySpending.totalSpent) * 100) 
                    : 0;
                  
                  return (
                    <div key={category.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-r from-blue-${(index % 3 + 3) * 100} to-purple-${(index % 3 + 3) * 100} flex items-center justify-center`}>
                            <ShoppingCart className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{category.name}</p>
                            <p className="text-sm text-neutral-400 dark:text-neutral-500">{percentage}% del total</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">${amount.toFixed(2)}</p>
                          <p className="text-sm text-neutral-400 dark:text-neutral-500">
                            {selectedPeriod ? 'período' : 'total'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="w-full bg-black/20 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full bg-gradient-to-r from-blue-${(index % 3 + 3) * 100} to-purple-${(index % 3 + 3) * 100} transition-all duration-500`} 
                          style={{ width: `${percentage}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              {categories.filter(c => categorySpending.spending[c.id] > 0).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-neutral-400 dark:text-neutral-500">No hay gastos en este período</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Wallet className="h-6 w-6 mr-3 text-cyan-400" />
              Transacciones Recientes
            </h3>
            
            <div className="space-y-3">
              {filteredTransactions.slice(0, 5).map((transaction) => {
                const amount = transaction.amountMinor && !isNaN(transaction.amountMinor) && isFinite(transaction.amountMinor)
                  ? transaction.amountMinor / 100
                  : 0;
                const isIncome = transaction.type === 'INCOME';
                
                return (
                <div key={transaction.id} className="flex items-center justify-between p-4 rounded-xl bg-black/20 hover:bg-white/5 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isIncome
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {isIncome ? (
                        <ArrowUpRight className="h-6 w-6" />
                      ) : (
                        <ArrowDownRight className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{transaction.description}</p>
                      <div className="flex items-center space-x-2 text-sm text-neutral-400 dark:text-neutral-500">
                        <span>Categoría</span>
                        <span>•</span>
                        <span>{new Date(transaction.date).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      isIncome ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {isIncome ? '+' : '-'}${Math.abs(amount).toFixed(2)}
                    </p>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Financial Health */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Target className="h-6 w-6 mr-3 text-green-400" />
            Salud Financiera
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-400 dark:text-neutral-500">Tasa de Ahorro</span>
                <span className="text-sm font-semibold text-green-400">{currentMetrics.savingsRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-black/20 rounded-full h-3">
                <div 
                  className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-500"
                  style={{ width: `${Math.min(currentMetrics.savingsRate * 4, 100)}%` }}
                />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Meta: 20%</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-400 dark:text-neutral-500">Ratio de Gastos</span>
                <span className="text-sm font-semibold text-yellow-400">
                  {currentMetrics.income > 0 ? Math.round((currentMetrics.expenses / currentMetrics.income) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-black/20 rounded-full h-3">
                <div 
                  className="h-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                  style={{ width: `${currentMetrics.income > 0 ? Math.min((currentMetrics.expenses / currentMetrics.income) * 100, 100) : 0}%` }}
                />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Recomendado: &lt;70%</p>
            </div>

            <div className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-xl p-4 border border-blue-500/20">
              <h4 className="text-sm font-semibold text-white mb-2">💡 Recomendaciones</h4>
              <ul className="text-xs text-neutral-300 dark:text-neutral-400 space-y-1">
                <li>• Comienza creando tus cuentas</li>
                <li>• Registra tus primeras transacciones</li>
                <li>• Establece metas de ahorro</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
