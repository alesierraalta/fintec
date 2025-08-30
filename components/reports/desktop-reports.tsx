'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRepository } from '@/providers/repository-provider';
import { PeriodSelector } from '../filters/period-selector';
import { TimePeriod, getPeriodById } from '@/lib/dates/periods';
import { 
  getPreviousPeriod, 
  calculateTrend, 
  formatTrendPercentage, 
  getTrendColor,
  filterTransactionsByPeriod,
  calculateMetricsForPeriod 
} from '@/lib/dates/period-comparison';
import { 
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  RefreshCw,
  ShoppingCart
} from 'lucide-react';

const periods = [
  { id: 'week', label: 'Esta Semana' },
  { id: 'month', label: 'Este Mes' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'year', label: 'Este Año' },
];

export function DesktopReports() {
  const { user } = useAuth();
  const repository = useRepository();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [data, setData] = useState<{ transactions: any[], categories: any[], accounts: any[] }>({ transactions: [], categories: [], accounts: [] });
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        setLoading(true);
        const [transactions, categories, accounts] = await Promise.all([
          repository.transactions.findAll(),
          repository.categories.findAll(),
          repository.accounts.findByUserId(user.id)
        ]);
        setData({ transactions, categories, accounts });
        setFilteredTransactions(transactions);
      } catch (error) {
        setData({ transactions: [], categories: [], accounts: [] });
        setFilteredTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, repository]);

  // Filter transactions when period changes
  useEffect(() => {
    if (!selectedPeriod) {
      setFilteredTransactions(data.transactions);
      return;
    }

    const period = getPeriodById(selectedPeriod);
    if (period) {
      const filtered = data.transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= period.startDate && transactionDate <= period.endDate;
      });
      setFilteredTransactions(filtered);
    }
  }, [selectedPeriod, data.transactions]);

  const handlePeriodChange = (period: TimePeriod | null) => {
    setSelectedPeriod(period?.id || '');
  };

  // Calculate current period metrics
  const currentMetrics = calculateMetricsForPeriod(filteredTransactions);
  
  // Calculate previous period metrics for trend comparison
  const previousMetrics = (() => {
    if (!selectedPeriod || !data.transactions.length) {
      return { income: 0, expenses: 0, savings: 0, savingsRate: 0 };
    }
    
    const currentPeriodObj = getPeriodById(selectedPeriod);
    if (!currentPeriodObj) {
      return { income: 0, expenses: 0, savings: 0, savingsRate: 0 };
    }
    
    const previousPeriod = getPreviousPeriod(currentPeriodObj);
    const previousTransactions = filterTransactionsByPeriod(data.transactions, previousPeriod);
    return calculateMetricsForPeriod(previousTransactions);
  })();

  // Calculate trends
  const trends = {
    income: calculateTrend(currentMetrics.income, previousMetrics.income),
    expenses: calculateTrend(currentMetrics.expenses, previousMetrics.expenses),
    savings: calculateTrend(currentMetrics.savings, previousMetrics.savings),
    savingsRate: calculateTrend(currentMetrics.savingsRate, previousMetrics.savingsRate)
  };

  const MetricCard = ({ icon: Icon, title, value, trendData, color, isExpenseMetric = false }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string;
    trendData: any;
    color: string;
    isExpenseMetric?: boolean;
  }) => (
    <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${color} flex items-center justify-center`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {selectedPeriod && (
          <span className={`text-sm font-medium px-2 py-1 rounded-lg ${getTrendColor(trendData, isExpenseMetric).replace('text-', 'text-').replace('500', '400')} ${getTrendColor(trendData, isExpenseMetric).replace('text-', 'bg-').replace('500', '400')}/20`}>
            {formatTrendPercentage(trendData)}
          </span>
        )}
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400 mt-2">
        {selectedPeriod ? 'Período seleccionado' : 'Todos los datos'}
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Cargando reportes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Reportes Financieros</h1>
            <p className="text-gray-400">Análisis completo de tu situación financiera</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <PeriodSelector
              selectedPeriod={selectedPeriod}
              onPeriodChange={handlePeriodChange}
            />
            
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
          <MetricCard 
            icon={ArrowUpRight} 
            title="Ingresos Totales" 
            value={`$${currentMetrics.income.toLocaleString()}`} 
            trendData={trends.income}
            color="from-green-400 to-emerald-500" 
          />
          <MetricCard 
            icon={ArrowDownRight} 
            title="Gastos Totales" 
            value={`$${currentMetrics.expenses.toLocaleString()}`} 
            trendData={trends.expenses}
            color="from-red-400 to-rose-500"
            isExpenseMetric={true}
          />
          <MetricCard 
            icon={Target} 
            title="Ahorros Totales" 
            value={`$${currentMetrics.savings.toLocaleString()}`} 
            trendData={trends.savings}
            color="from-blue-400 to-cyan-500" 
          />
          <MetricCard 
            icon={PieChart} 
            title="Tasa de Ahorro" 
            value={`${currentMetrics.savingsRate.toFixed(1)}%`} 
            trendData={trends.savingsRate}
            color="from-purple-400 to-violet-500" 
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categories */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <PieChart className="h-6 w-6 mr-3 text-pink-400" />
              Gastos por Categoría
            </h3>
            
            <div className="space-y-4">
              {data.categories.map((category, index) => (
                <div key={category.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-r from-blue-${(index % 3 + 3) * 100} to-purple-${(index % 3 + 3) * 100} flex items-center justify-center`}>
                        <ShoppingCart className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{category.name}</p>
                        <p className="text-sm text-gray-400">0% del total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">$0</p>
                      <p className="text-sm text-gray-400">este mes</p>
                    </div>
                  </div>
                  
                  <div className="w-full bg-black/20 rounded-full h-2">
                    <div className={`h-2 rounded-full bg-gradient-to-r from-blue-${(index % 3 + 3) * 100} to-purple-${(index % 3 + 3) * 100} transition-all duration-500`} style={{ width: '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Wallet className="h-6 w-6 mr-3 text-cyan-400" />
              Transacciones Recientes
            </h3>
            
            <div className="space-y-3">
              {filteredTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 rounded-xl bg-black/20 hover:bg-white/5 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      transaction.amount > 0 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {transaction.amount > 0 ? (
                        <ArrowUpRight className="h-6 w-6" />
                      ) : (
                        <ArrowDownRight className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{transaction.description}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <span>Categoría</span>
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
        </div>

        {/* Financial Health */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Target className="h-6 w-6 mr-3 text-green-400" />
            Salud Financiera
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Tasa de Ahorro</span>
                <span className="text-sm font-semibold text-green-400">{currentMetrics.savingsRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-black/20 rounded-full h-3">
                <div 
                  className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-500"
                  style={{ width: `${Math.min(currentMetrics.savingsRate * 4, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Meta: 20%</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Ratio de Gastos</span>
                <span className="text-sm font-semibold text-yellow-400">
                  {currentMetrics.income > 0 ? Math.round((currentMetrics.expenses / currentMetrics.income) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-black/20 rounded-full h-3">
                <div 
                  className="h-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                  style={{ width: `${currentMetrics.income > 0 ? Math.min((currentMetrics.expenses / currentMetrics.income) * 100, 100) : 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Recomendado: &lt;70%</p>
            </div>

            <div className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-xl p-4 border border-blue-500/20">
              <h4 className="text-sm font-semibold text-white mb-2">💡 Recomendaciones</h4>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• Comienza creando tus cuentas</li>
                <li>• Registra tus primeras transacciones</li>
                <li>• Establece metas de ahorro</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
