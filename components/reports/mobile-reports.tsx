'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRepository } from '@/providers/repository-provider';
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
  const repository = useRepository();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const periods = [
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'year', label: 'Año' }
  ];

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: PieChart },
    { id: 'categories', label: 'Categorías', icon: BarChart3 },
    { id: 'trends', label: 'Tendencias', icon: Target }
  ];

  // Load reports data from database
  useEffect(() => {
    const loadReportsData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const [transactionsData, categoriesData] = await Promise.all([
          repository.transactions.findAll(),
          repository.categories.findAll()
        ]);
        setTransactions(transactionsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading reports data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReportsData();
  }, [user, repository]);

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
    const start = getPeriodStartDate(selectedPeriod);
    return transactions.filter(t => new Date(t.date) >= start);
  })();

  const totalIncome = filteredTransactions.filter(t => t.amountMinor > 0).reduce((s, t) => s + (t.amountMinor / 100), 0);
  const totalExpenses = filteredTransactions.filter(t => t.amountMinor < 0).reduce((s, t) => s + Math.abs(t.amountMinor / 100), 0);

  const categoryTotals = (() => {
    const map: Record<string, number> = {};
    filteredTransactions.filter(t => t.amountMinor < 0).forEach(t => {
      const key = t.categoryId || 'uncategorized';
      map[key] = (map[key] || 0) + Math.abs(t.amountMinor / 100);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    const idToName: Record<string, string> = {};
    categories.forEach(c => { idToName[c.id] = c.name; });
    return Object.entries(map).map(([id, amount], idx) => ({
      category: idToName[id] || 'Sin categoría',
      amount: amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500'][idx % 5]
    })).sort((a, b) => b.amount - a.amount);
  })();

  const renderOverview = () => {
    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-muted">Ingresos</span>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xl font-bold text-text-primary">${totalIncome.toFixed(2)}</p>
            <p className="text-xs text-green-500">+12% vs mes anterior</p>
          </div>
          
          <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-muted">Gastos</span>
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-xl font-bold text-text-primary">${totalExpenses.toFixed(2)}</p>
            <p className="text-xs text-red-500">+5% vs mes anterior</p>
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-muted">Balance Neto</span>
            <Wallet className="h-4 w-4 text-text-muted" />
          </div>
          <p className="text-2xl font-bold text-text-primary">
            ${(totalIncome - totalExpenses).toFixed(2)}
          </p>
          <p className={`text-xs ${totalIncome > totalExpenses ? 'text-green-500' : 'text-red-500'}`}>
            {totalIncome > totalExpenses ? 'Superávit' : 'Déficit'} este período
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
                ${(totalExpenses / Math.max(1, Math.ceil((new Date().getTime() - getPeriodStartDate(selectedPeriod).getTime()) / (24 * 60 * 60 * 1000)))).toFixed(2)}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${category.color}`}></div>
                  <span className="text-sm font-medium text-text-primary">{category.category}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text-primary">${category.amount.toFixed(2)}</p>
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
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-background-primary rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{transaction.description}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(transaction.date).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-text-primary">
                  ${Math.abs(transaction.amountMinor / 100).toFixed(2)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderTrends = () => (
    <div className="space-y-4">
      <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary text-center">
        <h3 className="text-lg font-semibold text-text-primary mb-2">Tendencias</h3>
        <p className="text-text-muted text-sm">Próximamente disponible</p>
      </div>
    </div>
  );

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
          <p className="text-gray-400">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reportes</h1>
          <p className="text-sm text-text-muted">Análisis de tus finanzas</p>
        </div>
        <div className="flex space-x-2">
          <button className="p-2 rounded-xl bg-background-elevated border border-border-primary hover:bg-background-tertiary transition-colors">
            <RefreshCw className="h-4 w-4 text-text-primary" />
          </button>
          <button className="p-2 rounded-xl bg-background-elevated border border-border-primary hover:bg-background-tertiary transition-colors">
            <Download className="h-4 w-4 text-text-primary" />
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex space-x-2">
        {periods.map((period) => (
          <button
            key={period.id}
            onClick={() => setSelectedPeriod(period.id)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedPeriod === period.id
                ? 'bg-accent-primary text-background-primary'
                : 'bg-background-elevated text-text-secondary hover:text-text-primary'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-background-elevated rounded-2xl p-1 border border-border-primary">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                selectedTab === tab.id
                  ? 'bg-accent-primary text-background-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}

