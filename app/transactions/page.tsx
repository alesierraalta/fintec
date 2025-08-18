'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { TransactionForm } from '@/components/forms/transaction-form';
import { TransactionFilters } from '@/components/filters/transaction-filters';
import { Button } from '@/components/ui';
import { useModal } from '@/hooks';
import { 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Repeat,
  Download,
  MoreVertical,
  Edit,
  Trash2,
  Sparkles
} from 'lucide-react';

const mockTransactions = [
  {
    id: '1',
    type: 'INCOME',
    description: 'Salario Mensual',
    category: 'Trabajo',
    account: 'Banco Principal',
    amount: 3200.00,
    date: '2024-01-15',
    tags: ['salario', 'mensual'],
  },
  {
    id: '2',
    type: 'EXPENSE',
    description: 'Supermercado Central',
    category: 'Alimentación',
    account: 'Tarjeta Débito',
    amount: -85.50,
    date: '2024-01-14',
    tags: ['comida', 'semanal'],
  },
  {
    id: '3',
    type: 'TRANSFER_OUT',
    description: 'Transferencia a Ahorros',
    category: 'Transferencia',
    account: 'Banco Principal → Ahorros',
    amount: -500.00,
    date: '2024-01-13',
    tags: ['ahorro'],
  },
  {
    id: '4',
    type: 'EXPENSE',
    description: 'Gasolina Shell',
    category: 'Transporte',
    account: 'Tarjeta Crédito',
    amount: -45.00,
    date: '2024-01-12',
    tags: ['combustible'],
  },
  {
    id: '5',
    type: 'INCOME',
    description: 'Freelance Proyecto Web',
    category: 'Trabajo',
    account: 'Cuenta Freelance',
    amount: 750.00,
    date: '2024-01-11',
    tags: ['freelance', 'web'],
  },
  {
    id: '6',
    type: 'EXPENSE',
    description: 'Netflix Suscripción',
    category: 'Entretenimiento',
    account: 'Tarjeta Crédito',
    amount: -15.99,
    date: '2024-01-10',
    tags: ['streaming', 'mensual'],
  },
  {
    id: '7',
    type: 'EXPENSE',
    description: 'Farmacia San Pablo',
    category: 'Salud',
    account: 'Efectivo',
    amount: -32.50,
    date: '2024-01-09',
    tags: ['medicina'],
  },
  {
    id: '8',
    type: 'INCOME',
    description: 'Dividendos Acciones',
    category: 'Inversiones',
    account: 'Cuenta Inversión',
    amount: 125.00,
    date: '2024-01-08',
    tags: ['dividendos', 'inversión'],
  },
];

export default function TransactionsPage() {
  const router = useRouter();
  const { isOpen, openModal, closeModal } = useModal();
  const [filteredTransactions, setFilteredTransactions] = useState(mockTransactions);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const handleFiltersChange = (filters: any) => {
    // Aquí aplicarías los filtros a las transacciones
    console.log('Filters applied:', filters);
    // Por ahora, solo mostramos todas las transacciones
    setFilteredTransactions(mockTransactions);
  };

  const handleNewTransaction = () => {
    router.push('/transactions/add');
  };

  const handleQuickAdd = () => {
    setSelectedTransaction(null);
    openModal();
  };

  const handleEditTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    openModal();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'INCOME':
        return <ArrowDownLeft className="h-4 w-4 text-green-400" />;
      case 'EXPENSE':
        return <ArrowUpRight className="h-4 w-4 text-red-400" />;
      case 'TRANSFER_OUT':
      case 'TRANSFER_IN':
        return <Repeat className="h-4 w-4 text-blue-400" />;
      default:
        return <ArrowUpRight className="h-4 w-4 text-gray-400" />;
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'text-green-400';
      case 'EXPENSE':
        return 'text-red-400';
      case 'TRANSFER_OUT':
      case 'TRANSFER_IN':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'Ingreso';
      case 'EXPENSE':
        return 'Gasto';
      case 'TRANSFER_OUT':
        return 'Transferencia Salida';
      case 'TRANSFER_IN':
        return 'Transferencia Entrada';
      default:
        return type;
    }
  };

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const netAmount = totalIncome - totalExpenses;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 truncate">Transacciones</h1>
            <p className="text-gray-400 text-sm sm:text-base">Historial completo de ingresos y gastos</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <Button
              variant="secondary"
              icon={<Download className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              <span className="sm:inline hidden">Exportar CSV</span>
              <span className="sm:hidden">Exportar</span>
            </Button>
            <Button
              variant="secondary"
              onClick={handleQuickAdd}
              icon={<Plus className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              <span className="sm:inline hidden">Agregar Rápido</span>
              <span className="sm:hidden">Rápido</span>
            </Button>
            <Button
              onClick={handleNewTransaction}
              icon={<Sparkles className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              <span className="sm:inline hidden">Nueva Transacción</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 min-w-0">
            <h3 className="text-sm font-medium text-gray-400 mb-2 truncate">Total Ingresos</h3>
            <p className="text-xl sm:text-2xl font-bold text-green-400 truncate">
              ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 min-w-0">
            <h3 className="text-sm font-medium text-gray-400 mb-2 truncate">Total Gastos</h3>
            <p className="text-xl sm:text-2xl font-bold text-red-400 truncate">
              ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 min-w-0">
            <h3 className="text-sm font-medium text-gray-400 mb-2 truncate">Balance Neto</h3>
            <p className={`text-xl sm:text-2xl font-bold truncate ${netAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${netAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 min-w-0">
            <h3 className="text-sm font-medium text-gray-400 mb-2 truncate">Transacciones</h3>
            <p className="text-xl sm:text-2xl font-bold text-white truncate">{filteredTransactions.length}</p>
          </div>
        </div>

        {/* Filters */}
        <TransactionFilters
          onFiltersChange={handleFiltersChange}
        />

        {/* Transactions List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white">
              Todas las Transacciones ({filteredTransactions.length})
            </h3>
          </div>
          
          <div className="divide-y divide-gray-800">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="p-4 sm:p-6 hover:bg-gray-800/50 transition-colors overflow-hidden">
                <div className="flex items-start justify-between min-w-0">
                  <div className="flex items-start space-x-3 flex-1 min-w-0 overflow-hidden">
                    <div className="p-2 sm:p-3 bg-gray-800 rounded-lg flex-shrink-0">
                      {getIcon(transaction.type)}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h4 className="text-base sm:text-lg font-medium text-white truncate mb-1">{transaction.description}</h4>
                      
                      {/* Desktop info */}
                      <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-400 overflow-hidden">
                        <span className="flex-shrink-0">{getTypeLabel(transaction.type)}</span>
                        <span className="flex-shrink-0">•</span>
                        <span className="truncate">{transaction.category}</span>
                        <span className="flex-shrink-0">•</span>
                        <span className="truncate">{transaction.account}</span>
                        <span className="flex-shrink-0">•</span>
                        <span className="flex-shrink-0">{transaction.date}</span>
                      </div>
                      
                      {/* Mobile info - stacked */}
                      <div className="sm:hidden space-y-1 text-sm text-gray-400">
                        <div className="flex items-center space-x-2">
                          <span className="flex-shrink-0">{getTypeLabel(transaction.type)}</span>
                          <span>•</span>
                          <span className="truncate">{transaction.category}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="truncate">{transaction.account}</span>
                          <span>•</span>
                          <span className="flex-shrink-0">{transaction.date}</span>
                        </div>
                      </div>
                      
                      {transaction.tags.length > 0 && (
                        <div className="flex items-center space-x-1 mt-2 overflow-x-auto">
                          {transaction.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full flex-shrink-0"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2 sm:space-x-4 ml-2 sm:ml-4 flex-shrink-0">
                    <div className="text-right">
                      <p className={`text-sm sm:text-xl font-semibold truncate ${getAmountColor(transaction.type)}`}>
                        {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    
                    <div className="relative">
                      <button className="p-1 sm:p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {/* Dropdown menu would go here */}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TransactionForm
        isOpen={isOpen}
        onClose={closeModal}
        type={selectedTransaction?.type || 'EXPENSE'}
      />
    </MainLayout>
  );
}
