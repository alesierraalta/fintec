'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chart as ChartJS } from 'chart.js';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Download,
  Plus,
  Bell,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react';

// Import our modern libraries
import { TransactionsTable } from '@/components/tables/transactions-table';
import { 
  createIncomeExpenseChart, 
  createCashFlowChart, 
  createExpensesByCategoryChart,
  addChartAccessibility,
  formatCurrency,
} from '@/lib/charts';
import { dateUtils } from '@/lib/dates/dayjs';
import { useKeyboardShortcuts, useSearchShortcuts } from '@/lib/hotkeys';
import { useAppStore, useNotifications, useAuth, useSettings } from '@/lib/store';
import { 
  cardVariants, 
  staggerContainer, 
  listItemVariants,
  fadeInUp,
  slideInRight,
} from '@/lib/animations';
import { TransactionFormSchema } from '@/lib/validations/schemas';
import { createFileUploadDragDrop } from '@/lib/drag-drop';

// Mock data
const mockTransactions = [
  {
    id: '1',
    type: 'EXPENSE' as const,
    accountId: 'acc1',
    categoryId: 'cat1',
    amount: 45.99,
    description: 'Supermercado',
    date: dateUtils.today().format('YYYY-MM-DD'),
    account: { name: 'Tarjeta Principal', type: 'Credit' },
    category: { name: 'Comida', color: '#ef4444', icon: '🍔' },
    createdAt: dateUtils.now().toISOString(),
  },
  {
    id: '2',
    type: 'INCOME' as const,
    accountId: 'acc2',
    categoryId: 'cat2',
    amount: 2500.00,
    description: 'Salario',
    date: dateUtils.today().format('YYYY-MM-DD'),
    account: { name: 'Cuenta Nómina', type: 'Checking' },
    category: { name: 'Salario', color: '#10b981', icon: '💰' },
    createdAt: dateUtils.now().toISOString(),
  },
  {
    id: '3',
    type: 'TRANSFER_OUT' as const,
    accountId: 'acc1',
    categoryId: 'cat3',
    amount: 500.00,
    description: 'Transferencia a Ahorros',
    date: dateUtils.yesterday().format('YYYY-MM-DD'),
    account: { name: 'Tarjeta Principal', type: 'Credit' },
    category: { name: 'Ahorros', color: '#3b82f6', icon: '💳' },
    createdAt: dateUtils.yesterday().toISOString(),
  },
];

const chartData = {
  periods: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
  income: [2500, 2600, 2400, 2700, 2500, 2800],
  expenses: [1800, 1900, 2100, 1700, 1950, 1850],
  balances: [700, 1400, 700, 1700, 1250, 2200],
  categories: ['Comida', 'Transporte', 'Entretenimiento', 'Servicios', 'Otros'],
  categoryAmounts: [450, 280, 150, 320, 180],
};

interface EnhancedDashboardProps {
  className?: string;
}

export function EnhancedDashboard({ className = '' }: EnhancedDashboardProps) {
  // Global state
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const { settings } = useSettings();

  // Local state
  const [loading, setLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [showCharts, setShowCharts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragDropActive, setDragDropActive] = useState(false);

  // Refs for charts
  const incomeExpenseChartRef = useRef<HTMLCanvasElement>(null);
  const cashFlowChartRef = useRef<HTMLCanvasElement>(null);
  const categoryChartRef = useRef<HTMLCanvasElement>(null);
  const fileDropZoneRef = useRef<HTMLDivElement>(null);

  // Chart instances
  const [charts, setCharts] = useState<{
    incomeExpense?: ChartJS;
    cashFlow?: ChartJS;
    category?: ChartJS;
  }>({});

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();
  useSearchShortcuts((query) => setSearchQuery(query));

  // Initialize charts
  useEffect(() => {
    const initializeCharts = async () => {
      if (!showCharts) return;

      // Income vs Expenses Chart
      if (incomeExpenseChartRef.current) {
        const incomeExpenseConfig = createIncomeExpenseChart(
          chartData.periods,
          chartData.income,
          chartData.expenses
        );

        const incomeExpenseChart = new ChartJS(
          incomeExpenseChartRef.current,
          incomeExpenseConfig
        );

        addChartAccessibility(incomeExpenseChartRef.current, incomeExpenseChart);
        
        setCharts(prev => ({ ...prev, incomeExpense: incomeExpenseChart }));
      }

      // Cash Flow Chart
      if (cashFlowChartRef.current) {
        const cashFlowConfig = createCashFlowChart(
          chartData.periods.map(period => `2024-${chartData.periods.indexOf(period) + 1}-01`),
          chartData.balances
        );

        const cashFlowChart = new ChartJS(
          cashFlowChartRef.current,
          cashFlowConfig
        );

        addChartAccessibility(cashFlowChartRef.current, cashFlowChart);
        
        setCharts(prev => ({ ...prev, cashFlow: cashFlowChart }));
      }

      // Category Chart
      if (categoryChartRef.current) {
        const categoryConfig = createExpensesByCategoryChart(
          chartData.categories,
          chartData.categoryAmounts
        );

        const categoryChart = new ChartJS(
          categoryChartRef.current,
          categoryConfig
        );

        addChartAccessibility(categoryChartRef.current, categoryChart);
        
        setCharts(prev => ({ ...prev, category: categoryChart }));
      }
    };

    initializeCharts();

    // Cleanup charts on unmount
    return () => {
      Object.values(charts).forEach(chart => chart?.destroy());
    };
  }, [showCharts]);

  // Initialize file drag and drop
  useEffect(() => {
    if (!fileDropZoneRef.current) return;

    const cleanup = createFileUploadDragDrop(
      fileDropZoneRef.current,
      (files) => {
        addNotification({
          type: 'success',
          title: 'Archivos recibidos',
          message: `${files.length} archivo(s) listos para procesar`,
        });
        
        // Process files here (CSV import, etc.)
        files.forEach(file => {
          console.log('Processing file:', file.name, file.type, file.size);
        });
      },
      {
        acceptedTypes: ['.csv', '.xlsx', '.json'],
        maxFiles: 5,
        maxFileSize: 5 * 1024 * 1024, // 5MB
        multiple: true,
      }
    );

    return cleanup;
  }, [addNotification]);

  // Handle transaction actions
  const handleEditTransaction = (transaction: any) => {
    addNotification({
      type: 'info',
      title: 'Editar Transacción',
      message: `Editando: ${transaction.description}`,
    });
  };

  const handleDeleteTransaction = (transactionId: string) => {
    addNotification({
      type: 'warning',
      title: 'Transacción eliminada',
      message: 'La transacción ha sido eliminada',
    });
  };

  const handleDuplicateTransaction = (transaction: any) => {
    addNotification({
      type: 'success',
      title: 'Transacción duplicada',
      message: `Duplicada: ${transaction.description}`,
    });
  };

  const handleExportData = () => {
    addNotification({
      type: 'info',
      title: 'Exportando datos',
      message: 'Preparando archivo CSV...',
    });
  };

  // Calculate summary stats
  const totalIncome = chartData.income.reduce((sum, val) => sum + val, 0);
  const totalExpenses = chartData.expenses.reduce((sum, val) => sum + val, 0);
  const netIncome = totalIncome - totalExpenses;
  const currentBalance = chartData.balances[chartData.balances.length - 1];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Welcome Section */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              ¡Hola, {user?.name || 'Usuario'}! 👋
            </h1>
            <p className="text-blue-100">
              Hoy es {dateUtils.today().format('dddd, DD [de] MMMM')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">Balance actual</p>
            <p className="text-3xl font-bold">
              {formatCurrency(currentBalance)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <motion.div variants={listItemVariants} className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Ingresos del mes</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalIncome)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={listItemVariants} className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Gastos del mes</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={listItemVariants} className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Ahorro del mes</p>
              <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(netIncome)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${netIncome >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
              <DollarSign className={`h-6 w-6 ${netIncome >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Charts Section */}
      <AnimatePresence>
        {showCharts && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Income vs Expenses Chart */}
            <motion.div variants={cardVariants} className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Ingresos vs Gastos</h3>
                <button
                  onClick={() => setShowCharts(!showCharts)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                  title="Ocultar gráficos"
                >
                  <EyeOff className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <div className="h-64">
                <canvas
                  ref={incomeExpenseChartRef}
                  className="w-full h-full"
                  role="img"
                  aria-label="Gráfico de barras mostrando ingresos vs gastos por mes"
                />
              </div>
            </motion.div>

            {/* Cash Flow Chart */}
            <motion.div variants={cardVariants} className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Flujo de Efectivo</h3>
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedTimeRange}
                    onChange={(e) => setSelectedTimeRange(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="7d">7 días</option>
                    <option value="30d">30 días</option>
                    <option value="90d">90 días</option>
                    <option value="1y">1 año</option>
                  </select>
                </div>
              </div>
              <div className="h-64">
                <canvas
                  ref={cashFlowChartRef}
                  className="w-full h-full"
                  role="img"
                  aria-label="Gráfico de líneas mostrando el flujo de efectivo a lo largo del tiempo"
                />
              </div>
            </motion.div>

            {/* Category Distribution */}
            <motion.div variants={cardVariants} className="bg-white rounded-lg p-6 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Distribución de Gastos</h3>
                <button
                  onClick={handleExportData}
                  className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Exportar
                </button>
              </div>
              <div className="h-64">
                <canvas
                  ref={categoryChartRef}
                  className="w-full h-full"
                  role="img"
                  aria-label="Gráfico circular mostrando la distribución de gastos por categoría"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Upload Drop Zone */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        ref={fileDropZoneRef}
        className={`
          bg-white rounded-lg p-6 shadow-sm border-2 border-dashed border-gray-300 
          transition-colors hover:border-gray-400
          ${dragDropActive ? 'border-blue-500 bg-blue-50' : ''}
        `}
        data-drag-active={dragDropActive}
      >
        <div className="text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Importar transacciones
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Arrastra archivos CSV, Excel o JSON aquí para importar tus transacciones
          </p>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Seleccionar archivos
            </button>
          </div>
        </div>
      </motion.div>

      {/* Transactions Table */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Transacciones Recientes
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowCharts(!showCharts)}
                  className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  title={showCharts ? 'Ocultar gráficos' : 'Mostrar gráficos'}
                >
                  {showCharts ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {showCharts ? 'Ocultar gráficos' : 'Mostrar gráficos'}
                </button>
                <button className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <TransactionsTable
              data={mockTransactions}
              loading={loading}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              onDuplicate={handleDuplicateTransaction}
              onExport={handleExportData}
            />
          </div>
        </div>
      </motion.div>

      {/* Keyboard Shortcuts Hint */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="bg-gray-50 rounded-lg p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded">
              Ctrl
            </kbd>
            <span className="text-xs text-gray-600">+</span>
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded">
              K
            </kbd>
            <span className="text-sm text-gray-600">para buscar</span>
          </div>
          <div className="flex items-center space-x-2">
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded">
              Ctrl
            </kbd>
            <span className="text-xs text-gray-600">+</span>
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 border border-gray-300 rounded">
              N
            </kbd>
            <span className="text-sm text-gray-600">nueva transacción</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
