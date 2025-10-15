'use client';

import { useState } from 'react';
import { Transaction, TransactionType } from '@/types/domain';
import { formatCurrency } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onViewAll?: () => void;
  onTransactionClick?: (transaction: Transaction) => void;
  isLoading?: boolean;
}

export function RecentTransactions({
  transactions,
  onViewAll,
  onTransactionClick,
  isLoading = false
}: RecentTransactionsProps) {
  const [hoveredTransaction, setHoveredTransaction] = useState<string | null>(null);

  const formatAmount = (transaction: Transaction) => {
    const isNegative = transaction.type === TransactionType.EXPENSE || 
                      transaction.type === TransactionType.TRANSFER_OUT;
    
    const formattedAmount = formatCurrency(
      transaction.amountMinor,
      transaction.currencyCode,
      { showSymbol: true }
    );
    
    return isNegative ? `-${formattedAmount}` : formattedAmount;
  };

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.INCOME:
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case TransactionType.EXPENSE:
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case TransactionType.TRANSFER_OUT:
      case TransactionType.TRANSFER_IN:
        return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getTransactionBadge = (type: TransactionType) => {
    switch (type) {
      case TransactionType.INCOME:
        return <Badge variant="default" className="bg-green-100 text-green-800">Ingreso</Badge>;
      case TransactionType.EXPENSE:
        return <Badge variant="default" className="bg-red-100 text-red-800">Gasto</Badge>;
      case TransactionType.TRANSFER_OUT:
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Transferencia</Badge>;
      case TransactionType.TRANSFER_IN:
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Transferencia</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Movimientos Recientes</h2>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="space-y-1">
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Movimientos Recientes</h2>
        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-blue-600 hover:text-blue-700"
          >
            Ver todas
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <TrendingUp className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-500 text-sm">No hay transacciones recientes</p>
          <p className="text-gray-400 text-xs">Las transacciones aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.slice(0, 5).map((transaction) => (
            <div
              key={transaction.id}
              className={`flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 transition-all duration-200 cursor-pointer ${
                hoveredTransaction === transaction.id 
                  ? 'shadow-md border-blue-200 bg-blue-50' 
                  : 'hover:shadow-sm hover:border-gray-300'
              }`}
              onMouseEnter={() => setHoveredTransaction(transaction.id)}
              onMouseLeave={() => setHoveredTransaction(null)}
              onClick={() => onTransactionClick?.(transaction)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                  {getTransactionIcon(transaction.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {transaction.description || 'Transacción sin descripción'}
                    </p>
                    {getTransactionBadge(transaction.type)}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>
                      {formatDistanceToNow(new Date(transaction.date), {
                        addSuffix: true,
                        locale: es
                      })}
                    </span>
                    {transaction.categoryId && (
                      <>
                        <span>•</span>
                        <span>Categoría</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${
                  transaction.type === TransactionType.INCOME || transaction.type === TransactionType.TRANSFER_IN
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {formatAmount(transaction)}
                </p>
                {transaction.pending && (
                  <p className="text-xs text-amber-600">Pendiente</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}