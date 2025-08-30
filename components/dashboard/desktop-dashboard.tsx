'use client';

import { useState, useEffect } from 'react';
import { StatCard } from './stat-card';
import { QuickActions } from './quick-actions';
import { RecentTransactions } from './recent-transactions';
import { SpendingChart } from './spending-chart';
import { AccountsOverview } from './accounts-overview';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { fromMinorUnits } from '@/lib/money';
import { useBCVRates } from '@/hooks/use-bcv-rates';
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
  const repository = useRepository();
  const { user } = useAuth();
  const bcvRates = useBCVRates();
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [previousMonthIncome, setPreviousMonthIncome] = useState(0);
  const [previousMonthExpenses, setPreviousMonthExpenses] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        // Cargar balance total (con conversión BCV como header)
        const accounts = await repository.accounts.findByUserId(user.id);
        const total = accounts.reduce((sum, acc) => {
          const balanceMinor = Number(acc.balance) || 0;
          const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);
          
          // Apply BCV conversion for VES currency (same as header)
          if (acc.currencyCode === 'VES') {
            return sum + (balanceMajor / bcvRates.usd);
          }
          return sum + balanceMajor;
        }, 0);
        setTotalBalance(total);

        // Cargar transacciones del mes actual y anterior
        const transactions = await repository.transactions.findAll();
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        // Transacciones del mes actual
        const monthTransactions = transactions.filter(t => {
          const date = new Date(t.date);
          return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
        });

        // Transacciones del mes anterior
        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
        const lastMonthTransactions = transactions.filter(t => {
          const date = new Date(t.date);
          return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        });

        // Calcular ingresos y gastos actuales
        const income = monthTransactions
          .filter(t => t.type === 'INCOME')
          .reduce((sum, t) => sum + (t.amountMinor / 100), 0);
        
        const expenses = monthTransactions
          .filter(t => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + Math.abs(t.amountMinor / 100), 0);

        // Calcular ingresos y gastos del mes anterior
        const prevIncome = lastMonthTransactions
          .filter(t => t.type === 'INCOME')
          .reduce((sum, t) => sum + (t.amountMinor / 100), 0);
        
        const prevExpenses = lastMonthTransactions
          .filter(t => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + Math.abs(t.amountMinor / 100), 0);

        setMonthlyIncome(income);
        setMonthlyExpenses(expenses);
        setPreviousMonthIncome(prevIncome);
        setPreviousMonthExpenses(prevExpenses);
      } catch (error) {
        setTotalBalance(0);
        setMonthlyIncome(0);
        setMonthlyExpenses(0);
        setPreviousMonthIncome(0);
        setPreviousMonthExpenses(0);
      }
    };
    loadData();
  }, [user, repository]);

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
      {/* Clean Minimal Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center space-x-2 text-gray-500 mb-4">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-sm">Buenos días</span>
        </div>
        
        <h1 className="text-4xl font-bold mb-6 tracking-tight"
            style={{ 
              background: 'linear-gradient(to right, #10069f, #06b6d4, #4ade80)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent'
            }}>
          Dashboard Financiero
        </h1>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6" data-tutorial="stats-grid">
        <StatCard
          title="Balance Total"
          value={`$${totalBalance.toFixed(2)}`}
          change={calculatePercentageChange(totalBalance, totalBalance)}
          changeType="neutral"
          icon={Sparkles}
          description="Este mes"
        />
        <StatCard
          title="Ingresos"
          value={`$${monthlyIncome.toFixed(2)}`}
          change={calculatePercentageChange(monthlyIncome, previousMonthIncome)}
          changeType={incomeChangeType}
          icon={TrendingUp}
          description="Mensual"
        />
        <StatCard
          title="Gastos"
          value={`$${monthlyExpenses.toFixed(2)}`}
          change={calculatePercentageChange(monthlyExpenses, previousMonthExpenses)}
          changeType={expenseChangeType}
          icon={TrendingDown}
          description="Controlado"
        />
        <StatCard
          title="Meta de Ahorro"
          value={`${Math.max(0, savingsRate).toFixed(0)}%`}
          change={savingsRate >= 50 ? "+Excelente" : savingsRate >= 20 ? "+Bueno" : "Mejorar"}
          changeType={savingsRate >= 20 ? "positive" : "neutral"}
          icon={Target}
          description="Progreso"
        />
      </div>

      {/* Optimized Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Wider */}
        <div className="xl:col-span-2 space-y-6">
          {/* Recent Transactions */}
          <div className="bg-background-tertiary rounded-3xl p-6 border border-border-primary" data-tutorial="recent-transactions">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-accent-secondary rounded-full"></div>
              <h2 className="text-xl font-semibold text-text-primary">Movimientos Recientes</h2>
            </div>
            <RecentTransactions />
          </div>

          {/* Spending Chart */}
          <div className="bg-background-tertiary rounded-3xl p-6 border border-border-primary" data-tutorial="spending-chart">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-accent-tertiary rounded-full"></div>
              <h2 className="text-xl font-semibold text-text-primary">¿En Qué Gastas?</h2>
            </div>
            <SpendingChart />
          </div>
        </div>

        {/* Right Column - Compact */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-background-tertiary rounded-3xl p-6 border border-border-primary" data-tutorial="quick-actions">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-accent-warm rounded-full"></div>
              <h2 className="text-xl font-semibold text-text-primary">Acciones Rápidas</h2>
            </div>
            <QuickActions />
          </div>

          {/* Accounts Overview */}
          <div className="bg-background-tertiary rounded-3xl p-6 border border-border-primary" data-tutorial="accounts-overview">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-accent-tertiary rounded-full"></div>
              <h2 className="text-xl font-semibold text-text-primary">Tus Cuentas</h2>
            </div>
            <AccountsOverview />
          </div>

          {/* Friendly Tips Card */}
          <div className="bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 rounded-3xl p-6 border border-accent-primary/20">
            <div className="flex items-center space-x-2 mb-4">
              <Heart className="h-5 w-5 text-accent-primary" />
              <h3 className="text-lg font-semibold text-text-primary">Tip del Día</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              🌟 ¡Tu gestión financiera está siendo excepcional! Has mejorado un 23% este mes. 
              Seguí así y alcanzarás todas tus metas. 🚀
            </p>
            <div className="mt-4 flex items-center space-x-2 text-sm text-accent-primary">
              <Sparkles className="h-4 w-4" />
              <span>¡Sigue así!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Goals Section */}
      <div className="bg-background-tertiary rounded-xl p-6 border border-border-primary" data-tutorial="goals-progress">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-primary">Metas</h2>
          <button className="text-sm text-accent-primary hover:text-accent-secondary">
            Ver todas
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-background-elevated rounded-lg p-4 border border-border-primary">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Target className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-text-primary">Fondo de Emergencia</h3>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full w-3/4"></div>
                  </div>
                  <span className="text-xs text-green-500 font-medium">75%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-background-elevated rounded-lg p-4 border border-border-primary">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Target className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-text-primary">Vacaciones</h3>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full w-1/2"></div>
                  </div>
                  <span className="text-xs text-blue-500 font-medium">45%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-background-elevated rounded-lg p-4 border border-border-primary hover:bg-background-elevated/80 transition-colors">
            <div className="text-center">
              <Plus className="h-5 w-5 text-text-muted mx-auto mb-2" />
              <h3 className="text-sm font-medium text-text-primary">Nueva Meta</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

