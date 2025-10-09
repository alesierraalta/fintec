'use client';

import { useMemo, useEffect } from 'react';
import { QuickActions } from './quick-actions';
import { RecentTransactions } from './recent-transactions';
import { AccountsOverview } from './accounts-overview';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { fromMinorUnits } from '@/lib/money';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { FreeLimitWarning } from '@/components/subscription/free-limit-warning';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Heart,
  Smile
} from 'lucide-react';

export function MobileDashboard() {
  const { accounts: rawAccounts, transactions: rawTransactions, loading, loadAllData } = useOptimizedData();
  const bcvRates = useBCVRates();

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Memoized total balance calculation
  const totalBalance = useMemo(() => {
    if (!rawAccounts.length) return 0;
    
    return rawAccounts.reduce((sum, acc) => {
      const balanceMinor = Number(acc.balance) || 0;
      const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);
      
      // Apply BCV conversion for VES currency
      if (acc.currencyCode === 'VES') {
        return sum + (balanceMajor / bcvRates.usd);
      }
      return sum + balanceMajor;
    }, 0);
  }, [rawAccounts, bcvRates.usd]);

  // Memoized monthly calculations
  const { monthlyIncome, monthlyExpenses } = useMemo(() => {
    if (!rawTransactions.length) return { monthlyIncome: 0, monthlyExpenses: 0 };
    
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    
    const monthTransactions = rawTransactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });

    const income = monthTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + (t.amountMinor / 100), 0);
    
    const expenses = monthTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (t.amountMinor / 100), 0);

    return { monthlyIncome: income, monthlyExpenses: expenses };
  }, [rawTransactions]);
  
  return (
    <div className="space-y-6">
      {/* Free User Limit Warnings */}
      <FreeLimitWarning />
      
      {/* iOS-style Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center space-x-2 text-muted-foreground mb-4">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-ios-caption font-medium">Tus finanzas</span>
        </div>
        
        <h1 className="text-ios-large-title font-bold mb-6 tracking-tight bg-gradient-to-r from-primary via-blue-600 to-green-500 bg-clip-text text-transparent">
          💰 Dashboard
        </h1>
        <p className="text-muted-foreground font-light mb-6">
          Tu centro de control financiero
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">BALANCE TOTAL</h3>
          </div>
          <p className="text-3xl font-light text-foreground mb-2">
            ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-ios-footnote text-blue-600 font-medium">Actualizado</span>
          </div>
        </div>
        
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">INGRESOS MES</h3>
          </div>
          <p className="text-3xl font-light text-foreground mb-2">
            ${monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-ios-footnote text-green-600 font-medium">Ingresos</span>
          </div>
        </div>
        
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">GASTOS MES</h3>
          </div>
          <p className="text-3xl font-light text-foreground mb-2">
            ${monthlyExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <span className="text-ios-footnote text-red-600 font-medium">Gastos</span>
          </div>
        </div>
        
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center space-x-2 mb-4">
            <div className={`w-2 h-2 ${(monthlyIncome - monthlyExpenses) >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full animate-pulse`}></div>
            <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">BALANCE MES</h3>
          </div>
          <p className={`text-3xl font-light mb-2 ${(monthlyIncome - monthlyExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${Math.abs(monthlyIncome - monthlyExpenses).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center space-x-2">
            {(monthlyIncome - monthlyExpenses) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-ios-footnote font-medium ${(monthlyIncome - monthlyExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(monthlyIncome - monthlyExpenses) >= 0 ? 'Positivo' : 'Negativo'}
            </span>
          </div>
        </div>
      </div>

      {/* iOS-style Quick Actions */}
      <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center space-x-2 mb-6">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">ACCIONES RÁPIDAS</h3>
        </div>
        <QuickActions />
      </div>

      {/* iOS-style Recent Transactions */}
      <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center space-x-2 mb-6">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">MOVIMIENTOS RECIENTES</h3>
        </div>
        <RecentTransactions />
      </div>

      {/* iOS-style Accounts Overview */}
      <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center space-x-2 mb-6">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
          <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">RESUMEN DE CUENTAS</h3>
        </div>
        <AccountsOverview />
      </div>

      {/* iOS-style Mobile Insights */}
      <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-2 h-2 bg-gradient-to-r from-primary to-blue-500 rounded-full animate-pulse"></div>
          <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">PERSPECTIVA FINANCIERA</h3>
        </div>
        <p className="text-foreground leading-relaxed mb-4 text-ios-body">
          Tu gestión financiera está en buen camino. Mantén el equilibrio entre ingresos y gastos.
        </p>
        <div className="flex items-center space-x-2">
          <Heart className="h-4 w-4 text-primary" />
          <span className="text-ios-footnote text-primary font-medium">Excelente trabajo</span>
        </div>
      </div>
    </div>
  );
}
