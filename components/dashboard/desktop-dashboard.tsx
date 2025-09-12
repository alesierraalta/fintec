'use client';

import { useMemo, useEffect, useState } from 'react';
import { StatCard } from './stat-card';
import { QuickActions } from './quick-actions';
import { RecentTransactions } from './recent-transactions';
import { LazySpendingChart } from './lazy-spending-chart';
import { AccountsOverview } from './accounts-overview';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { useRepository } from '@/providers';
import { fromMinorUnits } from '@/lib/money';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import type { GoalWithProgress } from '@/repositories/contracts';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Heart,
  Target,
  Coffee,
  Smile,
  Plus
} from 'lucide-react';

export function DesktopDashboard() {
  const { accounts: rawAccounts, transactions: rawTransactions, loading, loadAllData } = useOptimizedData();
  const bcvRates = useBCVRates();
  const repository = useRepository();
  
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
        const activeGoals = goalsWithProgress.filter(g => g.progress < 100).length;
        const completedGoals = goalsWithProgress.filter(g => g.progress >= 100).length;
        const averageProgress = totalGoals > 0 
          ? goalsWithProgress.reduce((sum, g) => sum + g.progress, 0) / totalGoals 
          : 0;
        
        setGoalsSummary({
          totalGoals,
          activeGoals,
          completedGoals,
          averageProgress
        });
      } catch (error) {
        console.error('Error loading goals:', error);
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
        previousMonthExpenses: 0
      };
    }

    // Calculate total balance
    const totalBalance = rawAccounts.reduce((sum, acc) => {
      const balanceMinor = Number(acc.balance) || 0;
      const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);
      
      // Apply BCV conversion for VES currency (same as header)
      if (acc.currencyCode === 'VES') {
        return sum + (balanceMajor / bcvRates.usd);
      }
      return sum + balanceMajor;
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

    // Calcular ingresos y gastos actuales
    const monthlyIncome = monthTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + (t.amountMinor / 100), 0);
    
    const monthlyExpenses = monthTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Math.abs(t.amountMinor / 100), 0);

    // Calcular ingresos y gastos del mes anterior
    const previousMonthIncome = lastMonthTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + (t.amountMinor / 100), 0);
    
    const previousMonthExpenses = lastMonthTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Math.abs(t.amountMinor / 100), 0);

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      previousMonthIncome,
      previousMonthExpenses
    };
  }, [rawTransactions, rawAccounts, bcvRates.usd]);

  const { totalBalance, monthlyIncome, monthlyExpenses, previousMonthIncome, previousMonthExpenses } = summaryStats;

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
      {/* iOS-style Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center space-x-2 text-muted-foreground mb-4">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-ios-caption font-medium">Tus finanzas</span>
        </div>
        
        <h1 className="text-ios-large-title font-bold mb-6 tracking-tight bg-gradient-to-r from-primary via-blue-600 to-green-500 bg-clip-text text-transparent">
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
      
      {/* iOS-style Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Balance Card */}
        <div className="bg-card/90 backdrop-blur-sm border border-border/40 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-muted-foreground">Balance Total</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-light text-foreground">
              {loading ? '...' : `$${totalBalance.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Monthly Income Card */}
        <div className="bg-card/90 backdrop-blur-sm border border-border/40 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-muted-foreground">Ingresos del Mes</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-light text-foreground">
              {loading ? '...' : `$${monthlyIncome.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Monthly Expenses Card */}
        <div className="bg-card/90 backdrop-blur-sm border border-border/40 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-muted-foreground">Gastos del Mes</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-light text-foreground">
              {loading ? '...' : `$${monthlyExpenses.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Total Transactions Card */}
        <div className="bg-card/90 backdrop-blur-sm border border-border/40 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-muted-foreground">Transacciones</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-light text-foreground">
              {loading ? '...' : rawTransactions.length}
            </span>
          </div>
        </div>
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
            <RecentTransactions />
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
              🌟 ¡Tu gestión financiera está siendo excepcional! Has mejorado un 23% este mes. 
              Seguí así y alcanzarás todas tus metas. 🚀
            </p>
            <div className="mt-4 flex items-center space-x-2 text-ios-caption text-green-600">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">¡Sigue así!</span>
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
              const progressColor = goal.progress >= 100 ? 'green' : goal.progress >= 75 ? 'blue' : goal.progress >= 50 ? 'yellow' : 'red';
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
                         ${fromMinorUnits(goal.currentAmount, 'USD')} / ${fromMinorUnits(goal.targetAmount, 'USD')}
                       </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="flex-1 bg-muted/30 rounded-full h-2">
                          <div className={`${barColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${Math.min(goal.progress, 100)}%` }}></div>
                        </div>
                        <span className={`text-ios-caption ${textColor} font-semibold`}>{Math.round(goal.progress)}%</span>
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

