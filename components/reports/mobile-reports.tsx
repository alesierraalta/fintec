'use client';

import React, { useState } from 'react';
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  PieChart,
  BarChart3,
  Target,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

// Mock data for reports
const monthlyData = [
  { month: 'Ene', income: 5000, expenses: 3500, savings: 1500 },
  { month: 'Feb', income: 5200, expenses: 3800, savings: 1400 },
  { month: 'Mar', income: 4800, expenses: 3200, savings: 1600 },
  { month: 'Abr', income: 5500, expenses: 4100, savings: 1400 },
  { month: 'May', income: 5300, expenses: 3900, savings: 1400 },
  { month: 'Jun', income: 5700, expenses: 4200, savings: 1500 },
];

const categoryData = [
  { category: 'Comida', amount: 1200, percentage: 30, color: 'bg-red-500' },
  { category: 'Transporte', amount: 800, percentage: 20, color: 'bg-blue-500' },
  { category: 'Entretenimiento', amount: 600, percentage: 15, color: 'bg-purple-500' },
  { category: 'Servicios', amount: 500, percentage: 12.5, color: 'bg-yellow-500' },
  { category: 'Compras', amount: 400, percentage: 10, color: 'bg-green-500' },
  { category: 'Otros', amount: 500, percentage: 12.5, color: 'bg-gray-500' },
];

export function MobileReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedTab, setSelectedTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: BarChart3 },
    { id: 'categories', label: 'Categorías', icon: PieChart },
    { id: 'trends', label: 'Tendencias', icon: TrendingUp },
  ];

  const periods = [
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'year', label: 'Año' },
  ];

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </div>
            <span className="text-xs text-green-500 font-medium">+12%</span>
          </div>
          <p className="text-sm text-text-muted">Ingresos</p>
          <p className="text-xl font-bold text-text-primary">$5,300</p>
        </div>

        <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            </div>
            <span className="text-xs text-red-500 font-medium">+8%</span>
          </div>
          <p className="text-sm text-text-muted">Gastos</p>
          <p className="text-xl font-bold text-text-primary">$3,900</p>
        </div>

        <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Target className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-xs text-blue-500 font-medium">+5%</span>
          </div>
          <p className="text-sm text-text-muted">Ahorros</p>
          <p className="text-xl font-bold text-text-primary">$1,400</p>
        </div>

        <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-purple-500" />
            </div>
            <span className="text-xs text-purple-500 font-medium">73%</span>
          </div>
          <p className="text-sm text-text-muted">Tasa Ahorro</p>
          <p className="text-xl font-bold text-text-primary">26%</p>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Flujo Mensual</h3>
        <div className="space-y-3">
          {monthlyData.slice(-3).map((data, index) => (
            <div key={data.month} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                  <span className="text-sm font-semibold text-accent-primary">{data.month}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{data.month} 2024</p>
                  <p className="text-xs text-text-muted">Balance: ${data.income - data.expenses}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs text-text-muted">${data.income}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-xs text-text-muted">${data.expenses}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Estadísticas Rápidas</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Promedio diario de gastos</span>
            <span className="font-semibold text-text-primary">$126</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Mayor gasto del mes</span>
            <span className="font-semibold text-text-primary">$450</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Días sin gastos</span>
            <span className="font-semibold text-text-primary">3</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Meta de ahorro</span>
            <span className="font-semibold text-accent-primary">85%</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCategories = () => (
    <div className="space-y-4">
      {/* Categories Breakdown */}
      <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Gastos por Categoría</h3>
        <div className="space-y-3">
          {categoryData.map((category) => (
            <div key={category.category} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${category.color}`}></div>
                  <span className="text-sm font-medium text-text-primary">{category.category}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text-primary">${category.amount}</p>
                  <p className="text-xs text-text-muted">{category.percentage}%</p>
                </div>
              </div>
              <div className="w-full bg-background-primary rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${category.color}`}
                  style={{ width: `${category.percentage * 2}%` }}
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
          <div className="flex items-center justify-between p-3 bg-background-primary rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Supermercado</p>
                <p className="text-xs text-text-muted">15 May • Comida</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-text-primary">$450</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-background-primary rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Gasolina</p>
                <p className="text-xs text-text-muted">12 May • Transporte</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-text-primary">$120</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-background-primary rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Netflix</p>
                <p className="text-xs text-text-muted">10 May • Entretenimiento</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-text-primary">$15</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTrends = () => (
    <div className="space-y-4">
      {/* Trend Analysis */}
      <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Análisis de Tendencias</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl border border-green-500/20">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-text-primary">Ahorros</p>
                <p className="text-xs text-green-600">Tendencia positiva</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-green-600">+15%</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-xl border border-red-500/20">
            <div className="flex items-center space-x-3">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-text-primary">Gastos Variables</p>
                <p className="text-xs text-red-600">Incremento notable</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-red-600">+22%</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-text-primary">Ingresos</p>
                <p className="text-xs text-blue-600">Crecimiento estable</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-blue-600">+8%</span>
          </div>
        </div>
      </div>

      {/* Predictions */}
      <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Proyecciones</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Balance fin de mes</span>
            <span className="font-semibold text-green-600">+$1,450</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Ahorro mensual estimado</span>
            <span className="font-semibold text-text-primary">$1,380</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Gasto promedio diario</span>
            <span className="font-semibold text-text-primary">$125</span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-accent-primary/10 rounded-2xl p-4 border border-accent-primary/20">
        <h3 className="text-lg font-semibold text-text-primary mb-4">💡 Recomendaciones</h3>
        <div className="space-y-2">
          <p className="text-sm text-text-secondary">• Considera reducir gastos en entretenimiento para aumentar tus ahorros</p>
          <p className="text-sm text-text-secondary">• Tu gasto en comida está 15% por encima del promedio</p>
          <p className="text-sm text-text-secondary">• ¡Excelente! Estás cumpliendo tu meta de ahorro mensual</p>
        </div>
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 rounded-3xl p-6 border border-accent-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Reportes Financieros</h1>
            <p className="text-sm text-text-secondary">Análisis detallado de tus finanzas 📊</p>
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
