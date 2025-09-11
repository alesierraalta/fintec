'use client';

import { useMemo } from 'react';
import { QuickActions } from './quick-actions';
import { RecentTransactions } from './recent-transactions';
import { AccountsOverview } from './accounts-overview';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { fromMinorUnits } from '@/lib/money';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Heart,
  Smile
} from 'lucide-react';

export function MobileDashboard() {
  const { accounts: rawAccounts, transactions: rawTransactions, loading } = useOptimizedData();
  const bcvRates = useBCVRates();

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
      {/* Elegant Mobile Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center space-x-2 text-muted-foreground mb-4">
          <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
          <span className="text-ios-caption font-medium tracking-wide">Buenos días</span>
        </div>
        
        <h1 className="text-ios-title mb-2 tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground font-light">
          Tu centro financiero
        </p>
      </div>

      {/* Clean Balance Card */}
      <div className="bg-card backdrop-blur-xl rounded-2xl p-8 border border-border/50 shadow-lg">
        <div className="text-center">
          <p className="text-ios-caption text-muted-foreground mb-3 font-medium tracking-wide">BALANCE TOTAL</p>
          <h2 className="text-4xl font-light text-foreground mb-3">${totalBalance.toFixed(2)}</h2>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-1 h-1 bg-primary rounded-full"></div>
            <span className="text-ios-caption text-muted-foreground font-medium">Actualizado hoy</span>
          </div>
        </div>
      </div>

      {/* Refined Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card/90 backdrop-blur-xl rounded-xl p-6 border border-border/40 shadow-lg">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-ios-caption font-medium text-muted-foreground tracking-wide">INGRESOS</span>
          </div>
          <p className="text-2xl font-light text-foreground mb-1">${monthlyIncome.toFixed(0)}</p>
          <p className="text-ios-footnote text-muted-foreground">Este mes</p>
        </div>
        
        <div className="bg-card/90 backdrop-blur-xl rounded-xl p-6 border border-border/40 shadow-lg">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-ios-caption font-medium text-muted-foreground tracking-wide">GASTOS</span>
          </div>
          <p className="text-2xl font-light text-foreground mb-1">${monthlyExpenses.toFixed(0)}</p>
          <p className="text-ios-footnote text-muted-foreground">Controlados</p>
        </div>
      </div>

      {/* Clean Quick Actions */}
      <div className="bg-card/60 backdrop-blur-xl rounded-2xl p-6 border border-border/20 shadow-ios-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-ios-headline font-medium text-foreground">Acciones</h3>
          <div className="w-2 h-2 bg-primary rounded-full"></div>
        </div>
        <QuickActions />
      </div>

      {/* Clean Recent Transactions */}
      <div className="bg-card/60 backdrop-blur-xl rounded-2xl p-6 border border-border/20 shadow-ios-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-ios-headline font-medium text-foreground">Movimientos</h3>
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
        <RecentTransactions />
      </div>

      {/* Clean Accounts Overview */}
      <div className="bg-card/60 backdrop-blur-xl rounded-2xl p-6 border border-border/20 shadow-ios-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-ios-headline font-medium text-foreground">Cuentas</h3>
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
        </div>
        <AccountsOverview />
      </div>

      {/* Mobile Insights */}
      <div className="bg-gradient-to-br from-primary/5 to-blue-500/5 rounded-2xl p-6 border border-primary/10 shadow-ios-sm backdrop-blur-sm">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-ios-headline font-medium text-foreground">Perspectiva</h3>
        </div>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Tu gestión financiera está en buen camino. Mantén el equilibrio.
        </p>
        <div className="flex items-center space-x-2 text-ios-body text-primary font-medium">
          <Sparkles className="h-4 w-4" />
          <span>Excelente trabajo</span>
        </div>
      </div>
    </div>
  );
}
