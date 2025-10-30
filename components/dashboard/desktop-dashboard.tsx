'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import { StatCard } from './stat-card';
import { SkeletonStatCard } from '@/components/ui/skeleton-stat-card';
import { QuickActions } from './quick-actions';
import { RecentTransactions } from './recent-transactions';
import { LazySpendingChart } from './lazy-spending-chart';
import { AccountsOverview } from './accounts-overview';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { useRepository } from '@/providers';
import { fromMinorUnits } from '@/lib/money';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import type { GoalWithProgress } from '@/repositories/contracts';
import { FreeLimitWarning } from '@/components/subscription/free-limit-warning';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Heart,
  Target,
  Coffee,
  Smile,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import { logger } from '@/lib/utils/logger';

export function DesktopDashboard() {
  const { accounts: rawAccounts, transactions: rawTransactions, loading, loadAllData } = useOptimizedData();
  const bcvRates = useBCVRates();
  const { rates: binanceRates } = useBinanceRates();
  const repository = useRepository();
  
  // Rate selector state
  const [usdEquivalentType, setUsdEquivalentType] = useState<'binance' | 'bcv_usd' | 'bcv_eur'>('bcv_usd');
  const [showBalances, setShowBalances] = useState(true);
  
  // Helper functions for rate calculation
  const getRateName = useCallback((rateType: string) => {
    switch(rateType) {
      case 'binance': return 'Binance';
      case 'bcv_usd': return 'BCV USD';
      case 'bcv_eur': return 'BCV EUR';
      default: return 'BCV USD';
    }
  }, []);

  const getExchangeRate = useCallback((rateType: string) => {
    switch(rateType) {
      case 'binance': return binanceRates?.usd_ves || 1;
      case 'bcv_usd': return bcvRates?.usd || 1;
      case 'bcv_eur': return bcvRates?.eur || 1;
      default: return bcvRates?.usd || 1;
    }
  }, [bcvRates, binanceRates]);

  // Helper function to format currency with dual display
  const formatCurrencyDual = useCallback((amountMinor: number, currencyCode: string) => {
    const amountMajor = fromMinorUnits(amountMinor, currencyCode);
    
    if (currencyCode === 'VES') {
      const rate = getExchangeRate(usdEquivalentType);
      const usdEquivalent = amountMajor / rate;
      return {
        original: `Bs. ${amountMajor.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`,
        equivalent: `$${usdEquivalent.toFixed(2)}`,
        display: `Bs. ${amountMajor.toLocaleString('es-VE', { minimumFractionDigits: 2 })} (~$${usdEquivalent.toFixed(2)})`
      };
    } else {
      return {
        original: `$${amountMajor.toFixed(2)}`,
        equivalent: `$${amountMajor.toFixed(2)}`,
        display: `$${amountMajor.toFixed(2)}`
      };
    }
  }, [getExchangeRate, usdEquivalentType]);
  
  // Goals state
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsSummary, setGoalsSummary] = useState({
    totalGoals: 0,
    activeGoals: 0,
    completedGoals: 0,
    averageProgress: 0
  });

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Load goals data
  useEffect(() => {
    const loadGoals = async () => {
      try {
        setGoalsLoading(true);
        const goalsWithProgress = await repository.goals.getGoalsWithProgress();
        setGoals(goalsWithProgress);
        
        // Calculate summary statistics
        const totalGoals = goalsWithProgress.length;
        const activeGoals = goalsWithProgress.filter(g => g.progressPercentage < 100).length;
        const completedGoals = goalsWithProgress.filter(g => g.progressPercentage >= 100).length;
        const averageProgress = totalGoals > 0
          ? goalsWithProgress.reduce((sum, g) => sum + g.progressPercentage, 0) / totalGoals
          : 0;
        
        setGoalsSummary({
          totalGoals,
          activeGoals,
          completedGoals,
          averageProgress
        });
      } catch (error) {
        logger.error('Error loading goals:', error);
      } finally {
        setGoalsLoading(false);
      }
    };

    loadGoals();
  }, [repository.goals]);

  // Calculate summary statistics from real data
  const summaryStats = useMemo(() => {
    if (!rawTransactions.length || !rawAccounts.length) {
      return {
        totalBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        previousMonthIncome: 0,
        previousMonthExpenses: 0,
        totalBalanceVES: 0,
        totalBalanceUSD: 0,
        monthlyIncomeVES: 0,
        monthlyIncomeUSD: 0,
        monthlyExpensesVES: 0,
        monthlyExpensesUSD: 0
      };
    }

    // Calculate total balance with dynamic rate conversion
    const totalBalance = rawAccounts.reduce((sum, acc) => {
      const balanceMinor = Number(acc.balance) || 0;
      const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);
      
      // Apply dynamic conversion for VES currency
      if (acc.currencyCode === 'VES') {
        const rate = getExchangeRate(usdEquivalentType);
        return sum + (balanceMajor / rate);
      }
      return sum + balanceMajor;
    }, 0);

    // Calculate balances by currency
    const totalBalanceVES = rawAccounts
      .filter(acc => acc.currencyCode === 'VES')
      .reduce((sum, acc) => {
        const balanceMinor = Number(acc.balance) || 0;
        return sum + fromMinorUnits(balanceMinor, acc.currencyCode);
      }, 0);

    const totalBalanceUSD = rawAccounts
      .filter(acc => acc.currencyCode === 'USD')
      .reduce((sum, acc) => {
        const balanceMinor = Number(acc.balance) || 0;
        return sum + fromMinorUnits(balanceMinor, acc.currencyCode);
      }, 0);

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    // Transacciones del mes actual
    const monthTransactions = rawTransactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });

    // Transacciones del mes anterior
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    const lastMonthTransactions = rawTransactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });

    // Calcular ingresos y gastos actuales con conversión dinámica
    const monthlyIncome = monthTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => {
        const amountMajor = fromMinorUnits(t.amountMinor, t.currencyCode);
        // Convert VES to USD using dynamic rate
        if (t.currencyCode === 'VES') {
          const rate = getExchangeRate(usdEquivalentType);
          return sum + (amountMajor / rate);
        }
        return sum + amountMajor;
      }, 0);
    
    const monthlyExpenses = monthTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => {
        const amountMajor = fromMinorUnits(t.amountMinor, t.currencyCode);
        // Convert VES to USD using dynamic rate
        if (t.currencyCode === 'VES') {
          const rate = getExchangeRate(usdEquivalentType);
          return sum + (Math.abs(amountMajor) / rate);
        }
        return sum + Math.abs(amountMajor);
      }, 0);

    // Calculate monthly income by currency
    const monthlyIncomeVES = monthTransactions
      .filter(t => t.type === 'INCOME' && t.currencyCode === 'VES')
      .reduce((sum, t) => sum + fromMinorUnits(t.amountMinor, t.currencyCode), 0);

    const monthlyIncomeUSD = monthTransactions
      .filter(t => t.type === 'INCOME' && t.currencyCode === 'USD')
      .reduce((sum, t) => sum + fromMinorUnits(t.amountMinor, t.currencyCode), 0);

    // Calculate monthly expenses by currency
    const monthlyExpensesVES = monthTransactions
      .filter(t => t.type === 'EXPENSE' && t.currencyCode === 'VES')
      .reduce((sum, t) => sum + Math.abs(fromMinorUnits(t.amountMinor, t.currencyCode)), 0);

    const monthlyExpensesUSD = monthTransactions
      .filter(t => t.type === 'EXPENSE' && t.currencyCode === 'USD')
      .reduce((sum, t) => sum + Math.abs(fromMinorUnits(t.amountMinor, t.currencyCode)), 0);

    // Calcular ingresos y gastos del mes anterior con conversión dinámica
    const previousMonthIncome = lastMonthTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => {
        const amountMajor = fromMinorUnits(t.amountMinor, t.currencyCode);
        // Convert VES to USD using dynamic rate
        if (t.currencyCode === 'VES') {
          const rate = getExchangeRate(usdEquivalentType);
          return sum + (amountMajor / rate);
        }
        return sum + amountMajor;
      }, 0);
    
    const previousMonthExpenses = lastMonthTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => {
        const amountMajor = fromMinorUnits(t.amountMinor, t.currencyCode);
        // Convert VES to USD using dynamic rate
        if (t.currencyCode === 'VES') {
          const rate = getExchangeRate(usdEquivalentType);
          return sum + (Math.abs(amountMajor) / rate);
        }
        return sum + Math.abs(amountMajor);
      }, 0);

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      previousMonthIncome,
      previousMonthExpenses,
      totalBalanceVES,
      totalBalanceUSD,
      monthlyIncomeVES,
      monthlyIncomeUSD,
      monthlyExpensesVES,
      monthlyExpensesUSD
    };
  }, [rawTransactions, rawAccounts, usdEquivalentType, getExchangeRate]);;

  const { 
    totalBalance, 
    monthlyIncome, 
    monthlyExpenses, 
    previousMonthIncome, 
    previousMonthExpenses,
    totalBalanceVES,
    totalBalanceUSD,
    monthlyIncomeVES,
    monthlyIncomeUSD,
    monthlyExpensesVES,
    monthlyExpensesUSD
  } = summaryStats;

  // Calcular porcentajes de cambio
  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const change = ((current - previous) / previous) * 100;
    return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  };

  const incomeChangeType = monthlyIncome >= previousMonthIncome ? "positive" : "negative";
  const expenseChangeType = monthlyExpenses <= previousMonthExpenses ? "positive" : "negative";
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Free User Limit Warnings */}
      <FreeLimitWarning />
      
      {/* iOS-style Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center space-x-2 text-muted-foreground mb-4">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-ios-caption font-medium">Tus finanzas</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-bold mb-6 tracking-tight bg-gradient-to-r from-primary via-blue-600 to-green-500 bg-clip-text text-white">
          💳 Dashboard Financiero
        </h1>
        <p className="text-muted-foreground font-light mb-6">
          Controla todos tus ingresos y gastos
        </p>
        
        {/* Quick Actions Header */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          <button className="relative px-6 py-3 rounded-xl text-white font-medium shadow-lg overflow-hidden group transition-all duration-300 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-ios-body">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></div>
            <div className="relative flex items-center space-x-2">
              <Sparkles className="h-5 w-5" />
              <span>Resumen Rápido</span>
            </div>
          </button>
        </div>
      </div>
      
      {/* Balance Total Card with Rate Selector */}
      <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <h2 className="text-ios-title font-semibold text-foreground">Balance Total</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBalances(!showBalances)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{showBalances ? 'Ocultar' : 'Mostrar'}</span>
            </button>
          </div>
        </div>
        
        <div className="text-center">
          {showBalances ? (
            <div className="space-y-2">
              {totalBalanceVES > 0 && (
                <p className="text-2xl font-semibold amount-emphasis-white text-white">
                  Bs. {totalBalanceVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </p>
              )}
              {totalBalanceUSD > 0 && (
                <p className="text-2xl font-semibold amount-emphasis-white text-white">
                  ${totalBalanceUSD.toFixed(2)}
                </p>
              )}
              <p className="text-lg font-semibold amount-emphasis-white text-white">
                Total: ${totalBalance.toFixed(2)} ({getRateName(usdEquivalentType)})
              </p>
            </div>
          ) : (
            <p className="text-4xl font-light text-foreground mb-2">
              ••••••
            </p>
          )}
          
          {showBalances && (
            <div className="flex items-center justify-center space-x-2">
              <button
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  usdEquivalentType === 'binance'
                    ? 'bg-blue-500 text-white'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                }`}
                onClick={() => setUsdEquivalentType('binance')}
              >
                💱 Binance
              </button>
              <button
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  usdEquivalentType === 'bcv_usd'
                    ? 'bg-green-500 text-white'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                }`}
                onClick={() => setUsdEquivalentType('bcv_usd')}
              >
                🇺🇸 BCV USD
              </button>
              <button
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  usdEquivalentType === 'bcv_eur'
                    ? 'bg-purple-500 text-white'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                }`}
                onClick={() => setUsdEquivalentType('bcv_eur')}
              >
                🇪🇺 BCV EUR
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* iOS-style Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {loading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>

        {/* Monthly Income Card */}
        <div className="bg-card/90 backdrop-blur-sm border border-border/40 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-muted-foreground">Ingresos del Mes</span>
          </div>
          <div className="space-y-1">
            {monthlyIncomeVES > 0 && (
              <div className="text-lg amount-positive">
                Bs. {monthlyIncomeVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
            )}
            {monthlyIncomeUSD > 0 && (
              <div className="text-lg amount-positive">
                ${monthlyIncomeUSD.toFixed(2)}
              </div>
            )}
            {(monthlyIncomeVES > 0 || monthlyIncomeUSD > 0) && (
              <div className="text-sm text-muted-foreground">
                Total: ${monthlyIncome.toFixed(2)} ({getRateName(usdEquivalentType)})
              </div>
            )}
          </div>
        </div>

        {/* Monthly Expenses Card */}
        <div className="bg-card/90 backdrop-blur-sm border border-border/40 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-muted-foreground">Gastos del Mes</span>
          </div>
          <div className="space-y-1">
            {monthlyExpensesVES > 0 && (
              <div className="text-lg amount-negative">
                Bs. {monthlyExpensesVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </div>
            )}
            {monthlyExpensesUSD > 0 && (
              <div className="text-lg amount-negative">
                ${monthlyExpensesUSD.toFixed(2)}
              </div>
            )}
            {(monthlyExpensesVES > 0 || monthlyExpensesUSD > 0) && (
              <div className="text-sm text-muted-foreground">
                Total: ${monthlyExpenses.toFixed(2)} ({getRateName(usdEquivalentType)})
              </div>
            )}
          </div>
        </div>

        {/* Total Transactions Card */}
        <div className="bg-card/90 backdrop-blur-sm border border-border/40 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-muted-foreground">Transacciones</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-semibold amount-strong text-foreground">
              {rawTransactions.length}
            </span>
          </div>
        </div>
          </>
        )}
      </div>

      {/* iOS-style Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 xl:col-span-2">
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg h-full" data-tutorial="recent-transactions">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h2 className="text-ios-title font-semibold text-foreground">Movimientos Recientes</h2>
            </div>
            <RecentTransactions 
              transactions={rawTransactions} 
              bcvRates={bcvRates}
              binanceRates={binanceRates}
              usdEquivalentType={usdEquivalentType}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-1 xl:col-span-1">
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg h-full" data-tutorial="quick-actions">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h2 className="text-ios-title font-semibold text-foreground">Acciones Rápidas</h2>
            </div>
            <QuickActions />
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Chart */}
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg" data-tutorial="spending-chart">
          <div className="flex items-center space-x-2 mb-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="text-ios-title font-semibold text-foreground">¿En Qué Gastas?</h2>
          </div>
          <LazySpendingChart />
        </div>

        {/* Accounts Overview */}
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg" data-tutorial="accounts-overview">
          <div className="flex items-center space-x-2 mb-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="text-ios-title font-semibold text-foreground">Tus Cuentas</h2>
          </div>
          <AccountsOverview />
          
          {/* Tips Card integrated */}
          <div className="mt-6 pt-6 border-t border-border/30">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="text-ios-title font-semibold text-foreground">Tip del Día</h3>
            </div>
            <p className="text-ios-body text-muted-foreground leading-relaxed">
              {savingsRate > 50 ? (
                <>🌟 ¡Excelente! Estás ahorrando {savingsRate.toFixed(0)}% de tus ingresos este mes. Sigue así y alcanzarás todas tus metas. 🚀</>
              ) : savingsRate > 20 ? (
                <>💪 Buen trabajo! Estás ahorrando {savingsRate.toFixed(0)}% de tus ingresos. Intenta aumentar un poco más para alcanzar tus metas más rápido.</>
              ) : savingsRate > 0 ? (
                <>📊 Estás ahorrando {savingsRate.toFixed(0)}% de tus ingresos. Considera reducir algunos gastos para mejorar tu tasa de ahorro.</>
              ) : monthlyIncome > 0 ? (
                <>⚠️ Tus gastos superan tus ingresos este mes. Revisa tus gastos y busca áreas donde puedas reducir.</>
              ) : (
                <>💡 Comienza registrando tus ingresos y gastos para obtener insights personalizados sobre tus finanzas.</>
              )}
            </p>
            <div className="mt-4 flex items-center space-x-2 text-ios-caption text-green-600">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">
                {savingsRate > 20 ? '¡Sigue así!' : 'Tú puedes mejorar'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* iOS-style Goals Section */}
      <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg" data-tutorial="goals-progress">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="text-ios-title font-semibold text-foreground">Metas</h2>
            {!goalsLoading && (
              <span className="text-ios-caption text-muted-foreground">
                {goalsSummary.activeGoals} activas • {Math.round(goalsSummary.averageProgress)}% promedio
              </span>
            )}
          </div>
          <button className="text-ios-body text-green-600 hover:text-green-700 font-medium transition-colors">
            Ver todas
          </button>
        </div>
        
        {goalsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card/80 rounded-xl p-4 border border-border/10 animate-pulse">
                <div className="h-4 bg-muted/30 rounded mb-2"></div>
                <div className="h-3 bg-muted/30 rounded mb-4 w-3/4"></div>
                <div className="h-2 bg-muted/30 rounded"></div>
              </div>
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-4 bg-muted/20 rounded-2xl inline-block mb-4">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-foreground mb-2">No tienes metas configuradas</p>
            <p className="text-ios-caption text-muted-foreground">Crea tu primera meta para comenzar a ahorrar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.slice(0, 2).map((goal) => {
              const progressColor = goal.progressPercentage >= 100 ? 'green' : goal.progressPercentage >= 75 ? 'blue' : goal.progressPercentage >= 50 ? 'yellow' : 'red';
              const iconBgColor = {
                green: 'bg-green-500/10 border-green-500/20',
                blue: 'bg-blue-500/10 border-blue-500/20',
                yellow: 'bg-yellow-500/10 border-yellow-500/20',
                red: 'bg-red-500/10 border-red-500/20'
              }[progressColor];
              const iconColor = {
                green: 'text-green-600',
                blue: 'text-blue-600',
                yellow: 'text-yellow-600',
                red: 'text-red-600'
              }[progressColor];
              const textColor = {
                green: 'text-green-600',
                blue: 'text-blue-600',
                yellow: 'text-yellow-600',
                red: 'text-red-600'
              }[progressColor];
              const barColor = {
                green: 'bg-green-500',
                blue: 'bg-blue-500',
                yellow: 'bg-yellow-500',
                red: 'bg-red-500'
              }[progressColor];
              
              return (
                <div key={goal.id} className="bg-card/80 rounded-xl p-4 border border-border/10 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 ${iconBgColor} rounded-xl border`}>
                      <Target className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-ios-body font-medium text-foreground">{goal.description}</h3>
                      <p className="text-ios-caption text-muted-foreground">
                         ${fromMinorUnits(goal.currentBaseMinor, 'USD')} / ${fromMinorUnits(goal.targetBaseMinor, 'USD')}
                       </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="flex-1 bg-muted/30 rounded-full h-2">
                          <div className={`${barColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}></div>
                        </div>
                        <span className={`text-ios-caption ${textColor} font-semibold`}>{Math.round(goal.progressPercentage)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div className="bg-card/80 rounded-xl p-4 border border-border/10 backdrop-blur-sm shadow-lg hover:shadow-xl hover:bg-card/90 transition-all duration-300 group">
              <div className="text-center">
                <div className="w-8 h-8 bg-muted/20 rounded-full mx-auto mb-2 flex items-center justify-center group-hover:bg-green-500/10 transition-all duration-300">
                  {goals.length > 2 ? (
                    <Smile className="h-4 w-4 text-muted-foreground group-hover:text-green-600 transition-all duration-300" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground group-hover:text-green-600 transition-all duration-300" />
                  )}
                </div>
                <h3 className="text-ios-body font-medium text-foreground">
                  {goals.length > 2 ? `Ver todas (${goals.length})` : 'Nueva Meta'}
                </h3>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

