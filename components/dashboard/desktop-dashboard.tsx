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
      {/* iOS-style Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center space-x-2 text-muted-foreground mb-4">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-ios-caption font-medium">Buenos días</span>
        </div>
        
        <h1 className="text-ios-large-title font-bold mb-6 tracking-tight bg-gradient-to-r from-primary via-blue-600 to-green-500 bg-clip-text text-transparent">
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

      {/* iOS-style Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Wider */}
        <div className="xl:col-span-2 space-y-6">
          {/* Recent Transactions */}
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg" data-tutorial="recent-transactions">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <h2 className="text-ios-title font-semibold text-foreground">Movimientos Recientes</h2>
            </div>
            <RecentTransactions />
          </div>

          {/* Spending Chart */}
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg" data-tutorial="spending-chart">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <h2 className="text-ios-title font-semibold text-foreground">¿En Qué Gastas?</h2>
            </div>
            <SpendingChart />
          </div>
        </div>

        {/* Right Column - Compact */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg" data-tutorial="quick-actions">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <h2 className="text-ios-title font-semibold text-foreground">Acciones Rápidas</h2>
            </div>
            <QuickActions />
          </div>

          {/* Accounts Overview */}
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg" data-tutorial="accounts-overview">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h2 className="text-ios-title font-semibold text-foreground">Tus Cuentas</h2>
            </div>
            <AccountsOverview />
          </div>

          {/* iOS-style Tips Card */}
          <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-3xl p-6 border border-primary/20 backdrop-blur-sm shadow-ios-md">
            <div className="flex items-center space-x-2 mb-4">
              <Heart className="h-5 w-5 text-primary" />
              <h3 className="text-ios-headline font-semibold text-foreground">Tip del Día</h3>
            </div>
            <p className="text-ios-body text-muted-foreground leading-relaxed">
              🌟 ¡Tu gestión financiera está siendo excepcional! Has mejorado un 23% este mes. 
              Seguí así y alcanzarás todas tus metas. 🚀
            </p>
            <div className="mt-4 flex items-center space-x-2 text-ios-caption text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">¡Sigue así!</span>
            </div>
          </div>
        </div>
      </div>

      {/* iOS-style Goals Section */}
      <div className="bg-card/60 backdrop-blur-xl rounded-xl p-6 border border-border/20 shadow-ios-lg" data-tutorial="goals-progress">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-ios-title font-semibold text-foreground">Metas</h2>
          <button className="text-ios-body text-primary hover:text-primary/80 font-medium transition-ios">
            Ver todas
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card/80 rounded-xl p-4 border border-border/10 backdrop-blur-sm shadow-ios-sm hover:shadow-ios-md transition-ios">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                <Target className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-ios-body font-medium text-foreground">Fondo de Emergencia</h3>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="flex-1 bg-muted/30 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full w-3/4 transition-all duration-500"></div>
                  </div>
                  <span className="text-ios-caption text-green-600 font-semibold">75%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-card/80 rounded-xl p-4 border border-border/10 backdrop-blur-sm shadow-ios-sm hover:shadow-ios-md transition-ios">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <Target className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-ios-body font-medium text-foreground">Vacaciones</h3>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="flex-1 bg-muted/30 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full w-1/2 transition-all duration-500"></div>
                  </div>
                  <span className="text-ios-caption text-blue-600 font-semibold">45%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-card/80 rounded-xl p-4 border border-border/10 backdrop-blur-sm shadow-ios-sm hover:shadow-ios-md hover:bg-card/90 transition-ios group">
            <div className="text-center">
              <div className="w-8 h-8 bg-muted/20 rounded-full mx-auto mb-2 flex items-center justify-center group-hover:bg-primary/10 transition-ios">
                <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-ios" />
              </div>
              <h3 className="text-ios-body font-medium text-foreground">Nueva Meta</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

