'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { TransactionForm } from '@/components/forms/transaction-form';
import { TransactionFilters } from '@/components/filters/transaction-filters';
import { Button } from '@/components/ui';
import { useModal } from '@/hooks';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import type { Transaction } from '@/types/domain';
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

export default function TransactionsPage() {
  const router = useRouter();
  const { isOpen, openModal, closeModal } = useModal();
  const repository = useRepository();
  const { user } = useAuth();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{x: number, y: number} | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load transactions from database
  useEffect(() => {
    const loadTransactions = async () => {
      if (!user) {
        setError('Usuario no autenticado');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Load all data in parallel
        const [allTransactions, userAccounts, allCategories] = await Promise.all([
          repository.transactions.findAll(),
          repository.accounts.findByUserId(user.id),
          repository.categories.findAll()
        ]);
        
        setTransactions(allTransactions);
        setFilteredTransactions(allTransactions);
        setAccounts(userAccounts);
        setCategories(allCategories);
      } catch (err) {
        console.error('Error loading transactions:', err);
        setError('Error al cargar las transacciones');
        setTransactions([]);
        setFilteredTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [user, repository]);

  // Close dropdown when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
      setDropdownPosition(null);
    };
    
    const handleScroll = () => {
      setOpenDropdown(null);
      setDropdownPosition(null);
    };
    
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [openDropdown]);

  // Helper functions
  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || 'Cuenta desconocida';
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'Sin categoría';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Categoría desconocida';
  };

  const formatAmount = (amountMinor: number) => {
    return (amountMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
  };

  const handleFiltersChange = (filters: any) => {
    // Apply filters to transactions
    console.log('Filters applied:', filters);
    // TODO: Implement proper filtering logic
    setFilteredTransactions(transactions);
  };

  const handleNewTransaction = () => {
    router.push('/transactions/add');
  };

  const handleQuickAdd = () => {
    setSelectedTransaction(null);
    openModal();
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setOpenDropdown(null);
    setDropdownPosition(null);
    openModal();
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setOpenDropdown(null);
    setDropdownPosition(null);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    
    try {
      setDeleting(true);
      await repository.transactions.delete(transactionToDelete.id);
      
      // Update local state
      setTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
      setFilteredTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
      
      // Close modal
      setShowDeleteModal(false);
      setTransactionToDelete(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error al eliminar la transacción');
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setTransactionToDelete(null);
  };

  const handleTransactionUpdated = () => {
    // Reload transactions after edit
    const loadTransactions = async () => {
      try {
        const allTransactions = await repository.transactions.findAll();
        setTransactions(allTransactions);
        setFilteredTransactions(allTransactions);
      } catch (err) {
        console.error('Error reloading transactions:', err);
      }
    };
    loadTransactions();
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
    .reduce((sum, t) => sum + (t.amountMinor / 100), 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Math.abs(t.amountMinor / 100), 0);

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
          
          <div className="divide-y divide-gray-800 relative">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-gray-400">Cargando transacciones...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-red-400">{error}</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400 mb-4">No tienes transacciones aún</p>
                <Button onClick={handleNewTransaction} icon={<Plus className="h-4 w-4" />}>
                  Crear tu primera transacción
                </Button>
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="p-4 sm:p-6 hover:bg-gray-800/50 transition-colors overflow-hidden">
                <div className="flex items-start justify-between min-w-0">
                  <div className="flex items-start space-x-3 flex-1 min-w-0 overflow-hidden">
                    <div className="p-2 sm:p-3 bg-gray-800 rounded-lg flex-shrink-0">
                      {getIcon(transaction.type)}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h4 className="text-base sm:text-lg font-medium text-white truncate mb-1">{transaction.description || 'Sin descripción'}</h4>
                      
                      {/* Desktop info */}
                      <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-400 overflow-hidden">
                        <span className="flex-shrink-0">{getTypeLabel(transaction.type)}</span>
                        <span className="flex-shrink-0">•</span>
                        <span className="truncate">{getCategoryName(transaction.categoryId)}</span>
                        <span className="flex-shrink-0">•</span>
                        <span className="truncate">{getAccountName(transaction.accountId)}</span>
                        <span className="flex-shrink-0">•</span>
                        <span className="flex-shrink-0">{transaction.date}</span>
                      </div>
                      
                      {/* Mobile info - stacked */}
                      <div className="sm:hidden space-y-1 text-sm text-gray-400">
                        <div className="flex items-center space-x-2">
                          <span className="flex-shrink-0">{getTypeLabel(transaction.type)}</span>
                          <span>•</span>
                          <span className="truncate">{getCategoryName(transaction.categoryId)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="truncate">{getAccountName(transaction.accountId)}</span>
                          <span>•</span>
                          <span className="flex-shrink-0">{transaction.date}</span>
                        </div>
                      </div>
                      
                      {transaction.tags && transaction.tags.length > 0 && (
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
                        {transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : ''}${formatAmount(Math.abs(transaction.amountMinor))}
                      </p>
                    </div>
                    
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setDropdownPosition({
                            x: rect.right - 192, // 192px = w-48
                            y: rect.bottom + 4
                          });
                          setOpenDropdown(openDropdown === transaction.id ? null : transaction.id);
                        }}
                        className="p-1 sm:p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
        </div>
      </div>

      <TransactionForm
        isOpen={isOpen}
        onClose={closeModal}
        transaction={selectedTransaction}
        onSuccess={handleTransactionUpdated}
        type={selectedTransaction?.type || 'EXPENSE'}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && transactionToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Eliminar Transacción</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-2">
                ¿Estás seguro de que deseas eliminar esta transacción?
              </p>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-white font-medium">{transactionToDelete.description || 'Sin descripción'}</p>
                <p className="text-gray-400 text-sm">
                  {formatAmount(transactionToDelete.amountMinor)} • {transactionToDelete.date}
                </p>
              </div>
              <p className="text-red-400 text-sm mt-2">
                Esta acción no se puede deshacer.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {deleting ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  'Eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown Portal */}
      {openDropdown && dropdownPosition && typeof window !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => {
              setOpenDropdown(null);
              setDropdownPosition(null);
            }}
          ></div>
          
          {/* Menu */}
          <div 
            className="fixed w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-[9999]"
            style={{
              left: dropdownPosition.x,
              top: dropdownPosition.y
            }}
          >
            <div className="py-1">
              <button
                onClick={() => {
                  const transaction = transactions.find(t => t.id === openDropdown);
                  if (transaction) handleEditTransaction(transaction);
                }}
                className="flex items-center w-full px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors rounded-t-lg"
              >
                <Edit className="h-4 w-4 mr-3" />
                Editar transacción
              </button>
              <div className="border-t border-gray-700"></div>
              <button
                onClick={() => {
                  const transaction = transactions.find(t => t.id === openDropdown);
                  if (transaction) handleDeleteTransaction(transaction);
                }}
                className="flex items-center w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors rounded-b-lg"
              >
                <Trash2 className="h-4 w-4 mr-3" />
                Eliminar transacción
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </MainLayout>
  );
}
