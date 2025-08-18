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
  RefreshCw,
  Users,
  ShoppingCart,
  Home,
  Car,
  Coffee,
  Gamepad2
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
  { category: 'Comida', amount: 1200, percentage: 30, color: 'from-red-400 to-red-600', icon: Coffee },
  { category: 'Transporte', amount: 800, percentage: 20, color: 'from-blue-400 to-blue-600', icon: Car },
  { category: 'Entretenimiento', amount: 600, percentage: 15, color: 'from-purple-400 to-purple-600', icon: Gamepad2 },
  { category: 'Servicios', amount: 500, percentage: 12.5, color: 'from-yellow-400 to-yellow-600', icon: Home },
  { category: 'Compras', amount: 400, percentage: 10, color: 'from-green-400 to-green-600', icon: ShoppingCart },
  { category: 'Otros', amount: 500, percentage: 12.5, color: 'from-gray-400 to-gray-600', icon: Users },
];

const recentTransactions = [
  { id: 1, description: 'Supermercado Central', category: 'Comida', amount: -450, date: '2024-05-15', type: 'expense' },
  { id: 2, description: 'Salario Mayo', category: 'Salario', amount: 5300, date: '2024-05-01', type: 'income' },
  { id: 3, description: 'Gasolina Shell', category: 'Transporte', amount: -120, date: '2024-05-12', type: 'expense' },
  { id: 4, description: 'Netflix Suscripción', category: 'Entretenimiento', amount: -15, date: '2024-05-10', type: 'expense' },
  { id: 5, description: 'Freelance Proyecto', category: 'Freelance', amount: 800, date: '2024-05-08', type: 'income' },
];

export function DesktopReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState('overview');

  const periods = [
    { id: 'week', label: 'Esta Semana' },
    { id: 'month', label: 'Este Mes' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'year', label: 'Este Año' },
    { id: 'custom', label: 'Personalizado' },
  ];

  const totalIncome = monthlyData.reduce((sum, data) => sum + data.income, 0);
  const totalExpenses = monthlyData.reduce((sum, data) => sum + data.expenses, 0);
  const totalSavings = monthlyData.reduce((sum, data) => sum + data.savings, 0);
  const savingsRate = ((totalSavings / totalIncome) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Reportes Financieros</h1>
            <p className="text-gray-400">Análisis completo de tu situación financiera</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Period Selector */}
            <div className="flex space-x-2">
              {periods.map((period) => (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(period.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    selectedPeriod === period.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'backdrop-blur-md bg-white/10 border border-white/20 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button className="p-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300">
                <RefreshCw className="h-5 w-5" />
              </button>
              <button className="p-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300">
                <Filter className="h-5 w-5" />
              </button>
              <button className="p-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300">
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm text-green-400 font-medium bg-green-400/20 px-2 py-1 rounded-lg">+12%</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Ingresos Totales</h3>
            <p className="text-3xl font-bold text-white">${totalIncome.toLocaleString()}</p>
            <p className="text-sm text-gray-400 mt-2">Últimos 6 meses</p>
          </div>

          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-red-400 to-rose-500 flex items-center justify-center">
                <ArrowDownRight className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm text-red-400 font-medium bg-red-400/20 px-2 py-1 rounded-lg">+8%</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Gastos Totales</h3>
            <p className="text-3xl font-bold text-white">${totalExpenses.toLocaleString()}</p>
            <p className="text-sm text-gray-400 mt-2">Últimos 6 meses</p>
          </div>

          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-400 to-cyan-500 flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm text-blue-400 font-medium bg-blue-400/20 px-2 py-1 rounded-lg">+5%</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Ahorros Totales</h3>
            <p className="text-3xl font-bold text-white">${totalSavings.toLocaleString()}</p>
            <p className="text-sm text-gray-400 mt-2">Últimos 6 meses</p>
          </div>

          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-400 to-violet-500 flex items-center justify-center">
                <PieChart className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm text-purple-400 font-medium bg-purple-400/20 px-2 py-1 rounded-lg">{savingsRate}%</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Tasa de Ahorro</h3>
            <p className="text-3xl font-bold text-white">{savingsRate}%</p>
            <p className="text-sm text-gray-400 mt-2">Promedio mensual</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend Chart */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <BarChart3 className="h-6 w-6 mr-3 text-blue-400" />
              Tendencia Mensual
            </h3>
            
            <div className="space-y-4">
              {monthlyData.map((data, index) => (
                <div key={data.month} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">{data.month} 2024</span>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-green-400">${data.income}</span>
                      <span className="text-red-400">${data.expenses}</span>
                      <span className="text-blue-400">${data.savings}</span>
                    </div>
                  </div>
                  
                  <div className="relative h-8 bg-black/20 rounded-lg overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 to-green-500"
                      style={{ width: `${(data.income / 6000) * 100}%` }}
                    />
                    <div 
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-400 to-red-500 opacity-70"
                      style={{ width: `${(data.expenses / 6000) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center space-x-6 mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-400">Ingresos</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-400">Gastos</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-400">Ahorros</span>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <PieChart className="h-6 w-6 mr-3 text-pink-400" />
              Gastos por Categoría
            </h3>
            
            <div className="space-y-4">
              {categoryData.map((category) => {
                const Icon = category.icon;
                return (
                  <div key={category.category} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${category.color} flex items-center justify-center`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{category.category}</p>
                          <p className="text-sm text-gray-400">{category.percentage}% del total</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">${category.amount}</p>
                        <p className="text-sm text-gray-400">este mes</p>
                      </div>
                    </div>
                    
                    <div className="w-full bg-black/20 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full bg-gradient-to-r ${category.color} transition-all duration-500`}
                        style={{ width: `${category.percentage * 2}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <div className="lg:col-span-2 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Wallet className="h-6 w-6 mr-3 text-cyan-400" />
              Transacciones Recientes
            </h3>
            
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 rounded-xl bg-black/20 hover:bg-white/5 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      transaction.type === 'income' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {transaction.type === 'income' ? (
                        <ArrowUpRight className="h-6 w-6" />
                      ) : (
                        <ArrowDownRight className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{transaction.description}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <span>{transaction.category}</span>
                        <span>•</span>
                        <span>{new Date(transaction.date).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Health */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Target className="h-6 w-6 mr-3 text-green-400" />
              Salud Financiera
            </h3>
            
            <div className="space-y-6">
              {/* Savings Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Tasa de Ahorro</span>
                  <span className="text-sm font-semibold text-green-400">{savingsRate}%</span>
                </div>
                <div className="w-full bg-black/20 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-500"
                    style={{ width: `${Math.min(parseFloat(savingsRate) * 4, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Meta: 20%</p>
              </div>

              {/* Expense Ratio */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Ratio de Gastos</span>
                  <span className="text-sm font-semibold text-yellow-400">73%</span>
                </div>
                <div className="w-full bg-black/20 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                    style={{ width: '73%' }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Recomendado: &lt;70%</p>
              </div>

              {/* Emergency Fund */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Fondo de Emergencia</span>
                  <span className="text-sm font-semibold text-blue-400">2.1 meses</span>
                </div>
                <div className="w-full bg-black/20 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500"
                    style={{ width: '35%' }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Meta: 6 meses</p>
              </div>

              {/* Recommendations */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-xl p-4 border border-blue-500/20">
                <h4 className="text-sm font-semibold text-white mb-2">💡 Recomendaciones</h4>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• Incrementa tu fondo de emergencia</li>
                  <li>• Reduce gastos en entretenimiento</li>
                  <li>• Considera inversiones a largo plazo</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
