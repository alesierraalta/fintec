'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Target,
  Download,
  Filter,
  RefreshCw,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
} from 'lucide-react';

// Import our modern libraries
import {
  IncomeExpenseChart,
  CashFlowChart,
  ExpensesByCategoryChart,
  BudgetGaugeChart,
  SpendingTrendChart,
  type EChartsWrapperRef,
} from '@/components/charts/echarts-wrapper';
import { TransactionsTable } from '@/components/tables/transactions-table';
import { dateUtils } from '@/lib/dates/dayjs';
import { useKeyboardShortcuts } from '@/lib/hotkeys';
import { useAppStore, useNotifications, useSettings } from '@/lib/store';
import { 
  cardVariants, 
  staggerContainer, 
  listItemVariants,
  fadeInUp,
  slideInRight,
} from '@/lib/animations';
import { formatCurrency } from '@/lib/echarts';

// Mock financial data
const mockFinancialData = {
  currentBalance: 15750.50,
  monthlyIncome: 5200.00,
  monthlyExpenses: 3850.75,
  monthlySavings: 1349.25,
  
  // Chart data
  incomeExpenseData: {
    categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    income: [5000, 5200, 4800, 5400, 5200, 5600],
    expenses: [3800, 3950, 4100, 3700, 3850, 3900],
  },
  
  cashFlowData: {
    dates: ['2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', '2024-05-01', '2024-06-01'],
    balances: [12500, 13750, 13450, 15150, 15500, 15750],
  },
  
  expensesByCategory: {
    categories: ['Alimentación', 'Transporte', 'Entretenimiento', 'Servicios', 'Salud', 'Otros'],
    amounts: [1200, 680, 420, 850, 350, 350],
  },
  
  spendingTrend: {
    months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    categories: ['Alimentación', 'Transporte', 'Entretenimiento'],
    data: {
      'Alimentación': [1100, 1150, 1300, 1050, 1200, 1250],
      'Transporte': [650, 700, 750, 600, 680, 720],
      'Entretenimiento': [400, 450, 500, 350, 420, 480],
    },
  },
  
  budgets: [
    { category: 'Alimentación', spent: 1200, budget: 1500 },
    { category: 'Transporte', spent: 680, budget: 800 },
    { category: 'Entretenimiento', spent: 420, budget: 500 },
    { category: 'Servicios', spent: 850, budget: 900 },
  ],
  
  transactions: [
    {
      id: '1',
      type: 'EXPENSE' as const,
      accountId: 'acc1',
      categoryId: 'cat1',
      amount: 89.50,
      description: 'Supermercado Walmart',
      date: dateUtils.today().format('YYYY-MM-DD'),
      account: { name: 'Tarjeta Débito', type: 'Debit' },
      category: { name: 'Alimentación', color: '#ef4444', icon: '🛒' },
      createdAt: dateUtils.now().toISOString(),
    },
    {
      id: '2',
      type: 'INCOME' as const,
      accountId: 'acc2',
      categoryId: 'cat2',
      amount: 5200.00,
      description: 'Salario Mensual',
      date: dateUtils.today().format('YYYY-MM-DD'),
      account: { name: 'Cuenta Nómina', type: 'Checking' },
      category: { name: 'Salario', color: '#10b981', icon: '💼' },
      createdAt: dateUtils.now().toISOString(),
    },
    {
      id: '3',
      type: 'EXPENSE' as const,
      accountId: 'acc1',
      categoryId: 'cat3',
      amount: 45.00,
      description: 'Gasolina Shell',
      date: dateUtils.yesterday().format('YYYY-MM-DD'),
      account: { name: 'Tarjeta Crédito', type: 'Credit' },
      category: { name: 'Transporte', color: '#3b82f6', icon: '⛽' },
      createdAt: dateUtils.yesterday().toISOString(),
    },
  ],
};

interface AdvancedFinancialDashboardProps {
  className?: string;
}

export function AdvancedFinancialDashboard({ className = '' }: AdvancedFinancialDashboardProps) {
  // Global state
  const { addNotification } = useNotifications();
  const { settings } = useSettings();

  // Local state
  const [loading, setLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('6m');
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [showAllCharts, setShowAllCharts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Chart refs
  const incomeExpenseChartRef = useRef<EChartsWrapperRef>(null);
  const cashFlowChartRef = useRef<EChartsWrapperRef>(null);
  const categoryChartRef = useRef<EChartsWrapperRef>(null);
  const trendChartRef = useRef<EChartsWrapperRef>(null);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Handle data refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    addNotification({
      type: 'info',
      title: 'Actualizando datos',
      message: 'Obteniendo la información más reciente...',
    });

    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
      addNotification({
        type: 'success',
        title: 'Datos actualizados',
        message: 'La información ha sido actualizada correctamente',
      });
    }, 2000);
  };

  // Handle chart export
  const handleExportChart = (chartName: string) => {
    addNotification({
      type: 'info',
      title: 'Exportando gráfico',
      message: `Preparando descarga de ${chartName}...`,
    });
  };

  // Handle chart expansion
  const toggleChartExpansion = (chartId: string) => {
    setExpandedChart(expandedChart === chartId ? null : chartId);
  };

  // Calculate trend indicators
  const incomeChange = ((mockFinancialData.monthlyIncome - 5000) / 5000) * 100;
  const expenseChange = ((mockFinancialData.monthlyExpenses - 3800) / 3800) * 100;
  const savingsRate = (mockFinancialData.monthlySavings / mockFinancialData.monthlyIncome) * 100;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-xl p-6 shadow-sm border"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Dashboard Financiero Avanzado
            </h1>
            <p className="text-gray-600">
              Análisis completo de tus finanzas - {dateUtils.today().format('dddd, DD [de] MMMM [de] YYYY')}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1m">Último mes</option>
              <option value="3m">Últimos 3 meses</option>
              <option value="6m">Últimos 6 meses</option>
              <option value="1y">Último año</option>
            </select>
            
            <button
              onClick={() => setShowAllCharts(!showAllCharts)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {showAllCharts ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showAllCharts ? 'Ocultar gráficos' : 'Mostrar gráficos'}
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={listItemVariants} className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Balance Actual</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(mockFinancialData.currentBalance)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={listItemVariants} className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Ingresos del Mes</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(mockFinancialData.monthlyIncome)}
              </p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-sm text-green-600">+{incomeChange.toFixed(1)}%</span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={listItemVariants} className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Gastos del Mes</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(mockFinancialData.monthlyExpenses)}
              </p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-4 w-4 text-red-600 mr-1" />
                <span className="text-sm text-red-600">+{expenseChange.toFixed(1)}%</span>
              </div>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={listItemVariants} className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Tasa de Ahorro</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {savingsRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {formatCurrency(mockFinancialData.monthlySavings)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Charts Section */}
      <AnimatePresence>
        {showAllCharts && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="space-y-6"
          >
            {/* Income vs Expenses & Cash Flow */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <motion.div
                variants={cardVariants}
                className={`bg-white rounded-lg shadow-sm border ${
                  expandedChart === 'income-expense' ? 'xl:col-span-2' : ''
                }`}
              >
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Ingresos vs Gastos</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleExportChart('Ingresos vs Gastos')}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Exportar gráfico"
                      >
                        <Download className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => toggleChartExpansion('income-expense')}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title={expandedChart === 'income-expense' ? 'Contraer' : 'Expandir'}
                      >
                        {expandedChart === 'income-expense' ? (
                          <Minimize2 className="h-4 w-4 text-gray-600" />
                        ) : (
                          <Maximize2 className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <IncomeExpenseChart
                    ref={incomeExpenseChartRef}
                    categories={mockFinancialData.incomeExpenseData.categories}
                    incomeData={mockFinancialData.incomeExpenseData.income}
                    expenseData={mockFinancialData.incomeExpenseData.expenses}
                    style={{ height: expandedChart === 'income-expense' ? '500px' : '350px' }}
                    loading={loading}
                  />
                </div>
              </motion.div>

              {expandedChart !== 'income-expense' && (
                <motion.div variants={cardVariants} className="bg-white rounded-lg shadow-sm border">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <LineChart className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Flujo de Efectivo</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleExportChart('Flujo de Efectivo')}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Exportar gráfico"
                        >
                          <Download className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => toggleChartExpansion('cash-flow')}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Expandir"
                        >
                          <Maximize2 className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <CashFlowChart
                      ref={cashFlowChartRef}
                      dates={mockFinancialData.cashFlowData.dates}
                      balanceData={mockFinancialData.cashFlowData.balances}
                      style={{ height: '350px' }}
                      loading={loading}
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Category Distribution & Spending Trends */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <motion.div variants={cardVariants} className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <PieChart className="h-5 w-5 text-purple-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Gastos por Categoría</h3>
                    </div>
                    <button
                      onClick={() => handleExportChart('Gastos por Categoría')}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Exportar gráfico"
                    >
                      <Download className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <ExpensesByCategoryChart
                    ref={categoryChartRef}
                    categories={mockFinancialData.expensesByCategory.categories}
                    amounts={mockFinancialData.expensesByCategory.amounts}
                    style={{ height: '350px' }}
                    loading={loading}
                  />
                </div>
              </motion.div>

              <motion.div variants={cardVariants} className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-orange-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Tendencias de Gasto</h3>
                    </div>
                    <button
                      onClick={() => handleExportChart('Tendencias de Gasto')}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Exportar gráfico"
                    >
                      <Download className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <SpendingTrendChart
                    ref={trendChartRef}
                    months={mockFinancialData.spendingTrend.months}
                    categories={mockFinancialData.spendingTrend.categories}
                    data={mockFinancialData.spendingTrend.data}
                    style={{ height: '350px' }}
                    loading={loading}
                  />
                </div>
              </motion.div>
            </div>

            {/* Budget Gauges */}
            <motion.div variants={cardVariants} className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Control de Presupuesto</h3>
                  </div>
                  <button
                    onClick={() => handleExportChart('Control de Presupuesto')}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Exportar gráfico"
                  >
                    <Download className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {mockFinancialData.budgets.map((budget, index) => (
                    <BudgetGaugeChart
                      key={budget.category}
                      spent={budget.spent}
                      budget={budget.budget}
                      category={budget.category}
                      style={{ height: '250px' }}
                      loading={loading}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Transactions */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-lg shadow-sm border"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Transacciones Recientes</h3>
            <div className="flex items-center space-x-2">
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Filter className="h-4 w-4 mr-1" />
                Filtros
              </button>
              <button className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Ver todas
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          <TransactionsTable
            data={mockFinancialData.transactions}
            loading={loading}
            onEdit={(transaction) => {
              addNotification({
                type: 'info',
                title: 'Editar Transacción',
                message: `Editando: ${transaction.description}`,
              });
            }}
            onDelete={(transactionId) => {
              addNotification({
                type: 'warning',
                title: 'Transacción eliminada',
                message: 'La transacción ha sido eliminada',
              });
            }}
            onDuplicate={(transaction) => {
              addNotification({
                type: 'success',
                title: 'Transacción duplicada',
                message: `Duplicada: ${transaction.description}`,
              });
            }}
            onExport={() => {
              addNotification({
                type: 'info',
                title: 'Exportando datos',
                message: 'Preparando archivo CSV...',
              });
            }}
          />
        </div>
      </motion.div>

      {/* Quick Actions Footer */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="bg-gray-50 rounded-lg p-4"
      >
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded">
              Ctrl
            </kbd>
            <span>+</span>
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded">
              N
            </kbd>
            <span>Nueva transacción</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded">
              Ctrl
            </kbd>
            <span>+</span>
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded">
              K
            </kbd>
            <span>Buscar</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded">
              Ctrl
            </kbd>
            <span>+</span>
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded">
              R
            </kbd>
            <span>Reportes</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
