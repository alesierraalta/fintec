'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { RecurringTransaction } from '@/types/recurring-transactions';
import { getFrequencyDescription } from '@/lib/dates/recurring';
import { 
  Calendar, 
  Clock, 
  MoreVertical, 
  Play, 
  Pause, 
  Edit, 
  Trash2,
  Plus,
  ArrowRight
} from 'lucide-react';
import { logger } from '@/lib/utils/logger';

export default function RecurringTransactionsPage() {
  const repository = useRepository();
  const { user } = useAuth();
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadRecurringTransactions = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const transactions = await repository.recurringTransactions.findByUserId(user.id);
      setRecurringTransactions(transactions);
    } catch (err) {
      setError('Error al cargar las transacciones recurrentes');
      logger.error('Error al cargar las transacciones recurrentes', err);
    } finally {
      setLoading(false);
    }
  }, [user, repository.recurringTransactions]);

  useEffect(() => {
    loadRecurringTransactions();
  }, [loadRecurringTransactions]);

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await repository.recurringTransactions.toggleActive(id, !isActive);
      await loadRecurringTransactions();
    } catch (err) {
      logger.error('Error toggling recurring transaction:', err);
    }
  };

  const deleteRecurring = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta transacción recurrente?')) return;
    
    try {
      await repository.recurringTransactions.delete(id);
      await loadRecurringTransactions();
    } catch (err) {
      logger.error('Error deleting recurring transaction:', err);
    }
  };

  const getNextExecutionText = (nextDate: string) => {
    const date = new Date(nextDate);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays < 0) return 'Vencida';
    return `En ${diffDays} días`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'EXPENSE':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'TRANSFER_OUT':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'Ingreso';
      case 'EXPENSE':
        return 'Gasto';
      case 'TRANSFER_OUT':
        return 'Transferencia';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Cargando transacciones recurrentes...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Transacciones Recurrentes</h1>
            <p className="text-gray-400">Gestiona tus transacciones automáticas</p>
          </div>
          <button
            onClick={() => window.location.href = '/transactions/add'}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Transacción</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {recurringTransactions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              No hay transacciones recurrentes
            </h3>
            <p className="text-gray-400 mb-6">
              Crea una transacción y activa la opción &quot;Recurrente&quot; para automatizar tus finanzas.
            </p>
            <button
              onClick={() => window.location.href = '/transactions/add'}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors mx-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Crear Primera Transacción Recurrente</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {recurringTransactions.map((recurring) => (
              <div
                key={recurring.id}
                className={`bg-white/5 border border-white/10 rounded-lg p-6 transition-all duration-200 ${
                  !recurring.isActive ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {recurring.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(recurring.type)}`}>
                        {getTypeLabel(recurring.type)}
                      </span>
                      {!recurring.isActive && (
                        <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs font-medium">
                          Pausada
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-300 mb-3">{recurring.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-white">
                          ${(recurring.amountMinor / 100).toLocaleString()}
                        </span>
                        <span className="text-gray-400">{recurring.currencyCode}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-gray-400">
                        <Clock className="h-4 w-4" />
                        <span>{getFrequencyDescription(recurring.frequency, recurring.intervalCount)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>Próxima: {getNextExecutionText(recurring.nextExecutionDate)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleActive(recurring.id, recurring.isActive)}
                      className={`p-2 rounded-lg transition-colors ${
                        recurring.isActive 
                          ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                      title={recurring.isActive ? 'Pausar' : 'Activar'}
                    >
                      {recurring.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    
                    <button
                      onClick={() => deleteRecurring(recurring.id)}
                      className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}



