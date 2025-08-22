'use client';

import { StatCard } from './stat-card';
import { QuickActions } from './quick-actions';
import { RecentTransactions } from './recent-transactions';
import { SpendingChart } from './spending-chart';
import { AccountsOverview } from './accounts-overview';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Heart,
  Target,
  Coffee,
  Smile
} from 'lucide-react';

export function DesktopDashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header - More casual and friendly */}
      <div className="text-center py-6">
        <div className="inline-flex items-center space-x-2 bg-background-tertiary rounded-full px-6 py-3 border border-border-primary mb-4">
          <Smile className="h-5 w-5 text-accent-primary" />
          <span className="text-text-secondary">¡Hola! Que tengas un gran día</span>
        </div>
        <h1 className="text-4xl font-bold text-text-primary mb-3 tracking-tight">
          Tu Dinero, Simple y Claro ✨
        </h1>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto leading-relaxed">
          Todo está funcionando bien. Aquí tienes lo más importante de tus finanzas de hoy.
        </p>
      </div>

      {/* Stats Grid - More playful cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-tutorial="stats-grid">
        <StatCard
          title="💰 Dinero Total"
          value="$0.00"
          change="0%"
          changeType="positive"
          icon={Sparkles}
          description="En todas tus cuentas"
        />
        <StatCard
          title="📈 Este Mes"
          value="$0.00"
          change="0%"
          changeType="positive"
          icon={TrendingUp}
          description="Ingresos totales"
        />
        <StatCard
          title="📉 Gastos"
          value="$0.00"
          change="0%"
          changeType="positive"
          icon={TrendingDown}
          description="Gastos del mes"
        />
        <StatCard
          title="🎯 Metas"
          value="0%"
          change="0%"
          changeType="positive"
          icon={Target}
          description="Progreso promedio"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Wider */}
        <div className="lg:col-span-2 space-y-8">
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

        {/* Right Column */}
        <div className="space-y-8">
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
            <p className="text-text-secondary leading-relaxed">
              ¡Excelente progreso! Tus finanzas están mejorando consistentemente. 
              FinTec te ayuda a tomar decisiones más inteligentes. 📈
            </p>
            <div className="mt-4 flex items-center space-x-2 text-sm text-accent-primary">
              <Sparkles className="h-4 w-4" />
              <span>¡Sigue así!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Goals Progress */}
      <div className="bg-background-tertiary rounded-3xl p-6 border border-border-primary" data-tutorial="goals-progress">
        <div className="flex items-center space-x-2 mb-6">
          <div className="w-2 h-2 bg-accent-primary rounded-full"></div>
          <h2 className="text-xl font-semibold text-text-primary">Progreso de Metas</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Goals will be loaded from Supabase database */}
          <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-text-muted mx-auto mb-3" />
              <h3 className="font-medium text-text-primary mb-2">Sin metas creadas</h3>
              <p className="text-sm text-text-muted mb-4">Crea tu primera meta de ahorro para empezar a alcanzar tus objetivos financieros.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

