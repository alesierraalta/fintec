'use client';

import { useState, useEffect } from 'react';
import { QuickActions } from './quick-actions';
import { RecentTransactions } from './recent-transactions';
import { AccountsOverview } from './accounts-overview';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { fromMinorUnits } from '@/lib/money';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Heart,
  Smile
} from 'lucide-react';

export function MobileDashboard() {
  const repository = useRepository();
  const { user } = useAuth();
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const accounts = await repository.accounts.findByUserId(user.id);
        const total = accounts.reduce((sum, acc) => {
          const balanceMinor = Number(acc.balance) || 0;
          const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);
          return sum + balanceMajor;
        }, 0);
        setTotalBalance(total);

        const transactions = await repository.transactions.findAll();
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        
        const monthTransactions = transactions.filter(t => {
          const date = new Date(t.date);
          return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
        });

        const income = monthTransactions
          .filter(t => t.type === 'INCOME')
          .reduce((sum, t) => sum + (t.amountMinor / 100), 0);
        
        const expenses = monthTransactions
          .filter(t => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + (t.amountMinor / 100), 0);

        setMonthlyIncome(income);
        setMonthlyExpenses(expenses);
      } catch (error) {
        setTotalBalance(0);
        setMonthlyIncome(0);
        setMonthlyExpenses(0);
      }
    };
    loadData();
  }, [user, repository]);
  return (
    <div className="space-y-4">
      {/* Mobile Greeting Card */}
      <div className="bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 rounded-3xl p-6 border border-accent-primary/20">
        <div className="flex items-center space-x-3 mb-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center shadow-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">¡Bienvenido a FinTec!</h2>
            <p className="text-sm text-text-secondary">Tu centro financiero 📊</p>
          </div>
        </div>
        <p className="text-text-secondary text-sm leading-relaxed">
          Controla tus finanzas de forma inteligente. Aquí tienes tu resumen financiero.
        </p>
      </div>

      {/* Mobile Balance Card */}
      <div className="bg-background-elevated rounded-3xl p-6 border border-border-primary shadow-lg">
        <div className="text-center">
          <p className="text-sm text-text-muted mb-2">Balance Total</p>
          <h1 className="text-3xl font-bold text-text-primary mb-1">${totalBalance.toFixed(2)}</h1>
          <div className="flex items-center justify-center space-x-1">
            <TrendingUp className="h-4 w-4 text-accent-primary" />
            <span className="text-sm text-accent-primary font-medium">0% este mes</span>
          </div>
        </div>
      </div>

      {/* Mobile Stats Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
        <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            <span className="text-xs font-medium text-text-muted">Ingresos</span>
          </div>
          <p className="text-lg font-bold text-text-primary">${monthlyIncome.toFixed(0)}</p>
          <p className="text-xs text-green-400">0%</p>
        </div>
        
        <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="h-5 w-5 text-red-400" />
            <span className="text-xs font-medium text-text-muted">Gastos</span>
          </div>
          <p className="text-lg font-bold text-text-primary">${monthlyExpenses.toFixed(0)}</p>
          <p className="text-xs text-red-400">0%</p>
        </div>
      </div>

      {/* Mobile Quick Actions */}
      <div className="bg-background-elevated rounded-3xl p-6 border border-border-primary">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Acciones Rápidas</h3>
        <QuickActions />
      </div>

      {/* Mobile Recent Transactions */}
      <div className="bg-background-elevated rounded-3xl p-6 border border-border-primary">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Transacciones Recientes</h3>
        <RecentTransactions />
      </div>

      {/* Mobile Accounts Overview */}
      <div className="bg-background-elevated rounded-3xl p-6 border border-border-primary">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Tus Cuentas</h3>
        <AccountsOverview />
      </div>
    </div>
  );
}
