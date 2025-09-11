'use client';

import { useState, useMemo, useCallback, memo, Suspense } from 'react';
import { FormLoading } from '@/components/ui/suspense-loading';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { TransactionForm } from '@/components/forms';
import { TransactionFilters } from '@/components/filters/transaction-filters';
import { TransactionActionsDropdown } from '@/components/transactions/transaction-actions-dropdown';
import { Button } from '@/components/ui';
import { useModal } from '@/hooks';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { useRepository } from '@/providers';
import type { Transaction, TransactionType } from '@/types/domain';
import { 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Repeat,
  Download,
  Trash2,
  Sparkles
} from 'lucide-react';

export default function TransactionsPage() {
  const router = useRouter();
  const { isOpen, openModal, closeModal } = useModal();
  const repository = useRepository();
  const { transactions, accounts, categories, loading } = useOptimizedData();
  
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<{
    search?: string;
    type?: TransactionType;
    accountId?: string;
    categoryId?: string;
    sortBy?: string;
    dateFrom?: string;
    dateTo?: string;
    amountMin?: string;
    amountMax?: string;
    tags?: string;
  }>({});

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Memoized filtered transactions
  const filteredTransactionsMemo = useMemo(() => {
    let filtered = [...transactions];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(searchTerm) ||
        t.note?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply account filter
    if (filters.accountId) {
      filtered = filtered.filter(t => t.accountId === filters.accountId);
    }

    // Apply category filter
    if (filters.categoryId) {
      filtered = filtered.filter(t => t.categoryId === filters.categoryId);
    }

    // Apply type filter
    if (filters.type) {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    // Apply date range filter
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.date);
        const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
        const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
        
        if (fromDate && transactionDate < fromDate) return false;
        if (toDate && transactionDate > toDate) return false;
        return true;
      });
    }

    // Apply amount filters
    if (filters.amountMin) {
      const minAmount = parseFloat(filters.amountMin) * 100;
      filtered = filtered.filter(t => Math.abs(t.amountMinor) >= minAmount);
    }
    
    if (filters.amountMax) {
      const maxAmount = parseFloat(filters.amountMax) * 100;
      filtered = filtered.filter(t => Math.abs(t.amountMinor) <= maxAmount);
    }

    // Apply tags filter
    if (filters.tags) {
      const tags = filters.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      if (tags.length > 0) {
        filtered = filtered.filter(t => 
          t.tags?.some(tag => tags.includes(tag))
        );
      }
    }

    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'date_desc':
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          case 'date_asc':
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          case 'amount_desc':
            return Math.abs(b.amountMinor) - Math.abs(a.amountMinor);
          case 'amount_asc':
            return Math.abs(a.amountMinor) - Math.abs(b.amountMinor);
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [transactions, filters]);

  // Helper functions memoized
  const getAccountName = useCallback((id?: string) => 
    accounts.find(a => a.id === id)?.name || 'Cuenta', [accounts]
  );
  
  const getCategoryName = useCallback((id?: string) => 
    categories.find(c => c.id === id)?.name || 'Categoría', [categories]
  );
  
  const formatAmount = useCallback((minor: number) => 
    (minor / 100).toFixed(2), []
  );

  // Optimized filter handler
  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, []);

  // Update filteredTransactions when memoized value changes
  useMemo(() => {
    setFilteredTransactions(filteredTransactionsMemo);
  }, [filteredTransactionsMemo]);

  // Optimized sorting handler
  const sortTransactions = useCallback((sortBy: string) => {
    setFilters(prev => ({ ...prev, sortBy }));
  }, []);

  const handleNewTransaction = useCallback(() => router.push('/transactions/add'), [router]);
  const handleQuickAdd = useCallback(() => { setSelectedTransaction(null); openModal(); }, [openModal]);
  const handleEditTransaction = useCallback((t: Transaction) => { setSelectedTransaction(t); openModal(); }, [openModal]);
  const handleDeleteTransaction = useCallback((t: Transaction) => { setTransactionToDelete(t); setShowDeleteModal(true); }, []);

  const confirmDelete = useCallback(async () => {
    if (!transactionToDelete) return;
    
    try {
      setDeleting(true);
      await repository.transactions.delete(transactionToDelete.id);
      
      // Update local state
      setFilteredTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
      
      // Close modal
      setShowDeleteModal(false);
      setTransactionToDelete(null);
    } catch (error) {
      alert('Error al eliminar la transacción');
    } finally {
      setDeleting(false);
    }
  }, [transactionToDelete, repository]);

  const cancelDelete = useCallback(() => setShowDeleteModal(false), []);

  const handleTransactionUpdated = useCallback(() => {
    // Update filtered transactions to reflect current data
    setFilteredTransactions(transactions);
  }, [transactions]);

  const getIcon = useCallback((type: string) => {
    switch (type) {
      case 'INCOME':
        return <ArrowDownLeft className="h-4 w-4" style={{ color: '#4ade80' }} />;
      case 'EXPENSE':
        return <ArrowUpRight className="h-4 w-4" style={{ color: '#10069f' }} />;
      case 'TRANSFER_OUT':
      case 'TRANSFER_IN':
        return <Repeat className="h-4 w-4" style={{ color: '#06b6d4' }} />;
      default:
        return <ArrowUpRight className="h-4 w-4 text-gray-400" />;
    }
  }, []);

  const getAmountColor = useCallback((type: string) => {
    switch (type) {
      case 'INCOME':
        return 'text-green-400';
      case 'EXPENSE':
        return 'text-blue-600';
      case 'TRANSFER_OUT':
      case 'TRANSFER_IN':
        return 'text-cyan-500';
      default:
        return 'text-gray-400';
    }
  }, []);

  const getTypeLabel = useCallback((type: string) => {
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
  }, []);

  // Cálculos memoizados
  const { totalIncome, totalExpenses, netAmount } = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + (t.amountMinor / 100), 0);
    const expenses = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + (t.amountMinor / 100), 0);
    return {
      totalIncome: income,
      totalExpenses: expenses,
      netAmount: income - expenses
    };
  }, [filteredTransactions]);

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* iOS-style Header */}
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-muted-foreground mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-ios-caption font-medium">Tus finanzas</span>
          </div>
          
          <h1 className="text-ios-large-title font-bold mb-6 tracking-tight bg-gradient-to-r from-primary via-blue-600 to-green-500 bg-clip-text text-transparent">
            💳 Transacciones
          </h1>
          <p className="text-muted-foreground font-light mb-6">
            Controla todos tus ingresos y gastos
          </p>
          
          {/* Quick Actions Header */}
          <div className="flex items-center justify-center space-x-4 mb-4">
            <button
              onClick={handleQuickAdd}
              className="px-4 py-2 rounded-xl transition-all duration-200 flex items-center space-x-2 bg-muted hover:bg-muted/80 text-muted-foreground hidden sm:flex"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Agregar</span>
            </button>
            
            <button
              onClick={handleNewTransaction}
              className="relative px-6 py-3 rounded-xl text-white font-medium shadow-lg overflow-hidden group transition-all duration-300 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-ios-body"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></div>
              <div className="relative flex items-center space-x-2">
                <Sparkles className="h-5 w-5" />
                <span>Nueva Transacción</span>
              </div>
            </button>
          </div>
        </div>

        {/* iOS-style Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">TOTAL INGRESOS</h3>
            </div>
            <p className="text-3xl font-light text-foreground mb-2">
              ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center space-x-2">
              <ArrowDownLeft className="h-4 w-4 text-green-600" />
              <span className="text-ios-footnote text-green-600 font-medium">Ingresos</span>
            </div>
          </div>
          
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">TOTAL GASTOS</h3>
            </div>
            <p className="text-3xl font-light text-foreground mb-2">
              ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center space-x-2">
              <ArrowUpRight className="h-4 w-4 text-red-600" />
              <span className="text-ios-footnote text-red-600 font-medium">Gastos</span>
            </div>
          </div>
          
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center space-x-2 mb-4">
              <div className={`w-2 h-2 ${netAmount >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full animate-pulse`}></div>
              <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">BALANCE NETO</h3>
            </div>
            <p className={`text-3xl font-light mb-2 ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(netAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center space-x-2">
              {netAmount >= 0 ? (
                <ArrowDownLeft className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowUpRight className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-ios-footnote font-medium ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netAmount >= 0 ? 'Positivo' : 'Negativo'}
              </span>
            </div>
          </div>
          
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">TRANSACCIONES</h3>
            </div>
            <p className="text-3xl font-light text-foreground mb-2">
              {filteredTransactions.length}
            </p>
            <div className="flex items-center space-x-2">
              <Repeat className="h-4 w-4 text-blue-600" />
              <span className="text-ios-footnote text-blue-600 font-medium">Total</span>
            </div>
          </div>
        </div>

        {/* iOS-style Filters */}
        <div className="bg-card/60 backdrop-blur-xl rounded-3xl p-6 border border-border/20 shadow-lg">
          <div className="flex items-center space-x-2 mb-6">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <h2 className="text-ios-title font-semibold text-foreground">Filtros</h2>
          </div>
          <TransactionFilters
            onFiltersChange={handleFiltersChange}
          />
        </div>

        {/* iOS-style Transactions List */}
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl border border-border/40 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-border/40">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <h3 className="text-ios-title font-semibold text-foreground">
                Todas las Transacciones ({filteredTransactions.length})
              </h3>
            </div>
          </div>
          
          <div className="divide-y divide-border/40">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground text-ios-body">✨ Cargando transacciones...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="h-20 w-20 text-muted-foreground mx-auto mb-6">💳</div>
                <h3 className="text-ios-title font-semibold text-foreground mb-3">
                  🎯 ¡Comienza tu Gestión Financiera!
                </h3>
                <p className="text-muted-foreground text-ios-body mb-8 max-w-sm mx-auto leading-relaxed">
                  Crea tu primera transacción para empezar a controlar tus ingresos y gastos
                </p>
                <button
                  onClick={handleNewTransaction}
                  className="text-white font-medium px-8 py-4 rounded-2xl shadow-lg transition-all duration-300 relative overflow-hidden group bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-ios-body"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></div>
                  <div className="relative flex items-center space-x-2">
                    <Plus className="h-5 w-5" />
                    <span>Crear Primera Transacción</span>
                    <Sparkles className="h-4 w-4" />
                  </div>
                </button>
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="p-6 hover:bg-card/60 transition-all duration-200 relative group cursor-pointer border-l-0 hover:border-l-4 hover:border-l-primary/40">
                <div className="flex items-start justify-between min-w-0">
                  <div className="flex items-start space-x-3 flex-1 min-w-0 overflow-hidden">
                    <div className="p-3 bg-muted/20 group-hover:bg-primary/10 rounded-2xl transition-colors duration-200 flex-shrink-0">
                      {getIcon(transaction.type)}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h4 className="text-ios-body font-medium text-foreground truncate mb-2">{transaction.description || 'Sin descripción'}</h4>
                      
                      {/* Desktop info */}
                      <div className="hidden sm:flex items-center space-x-2 text-ios-caption text-muted-foreground overflow-hidden">
                        <span className="flex-shrink-0">{getTypeLabel(transaction.type)}</span>
                        <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                        <span className="truncate">{getCategoryName(transaction.categoryId)}</span>
                        <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                        <span className="truncate">{getAccountName(transaction.accountId)}</span>
                        <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                        <span className="flex-shrink-0">{transaction.date}</span>
                      </div>
                      
                      {/* Mobile info - stacked */}
                      <div className="sm:hidden space-y-1 text-ios-caption text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <span className="flex-shrink-0">{getTypeLabel(transaction.type)}</span>
                          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                          <span className="truncate">{getCategoryName(transaction.categoryId)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="truncate">{getAccountName(transaction.accountId)}</span>
                          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
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
                    
                    <TransactionActionsDropdown
                      transaction={transaction}
                      onEdit={handleEditTransaction}
                      onDelete={handleDeleteTransaction}
                    />
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
        </div>
      </div>

      <Suspense fallback={<FormLoading />}>
        <TransactionForm
          isOpen={isOpen}
          onClose={closeModal}
          transaction={selectedTransaction}
          onSuccess={handleTransactionUpdated}
          type={(selectedTransaction?.type || 'EXPENSE') as TransactionType}
        />
      </Suspense>

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


    </MainLayout>
  );
}
