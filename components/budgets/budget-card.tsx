'use client';

import { 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  TrendingDown,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import type { Budget } from '@/types';

interface BudgetCardProps {
  budget: Budget;
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
  onEdit?: (budget: Budget) => void;
  onDelete?: (budgetId: string) => void;
  onView?: (budgetId: string) => void;
}

export function BudgetCard({ budget, category, onEdit, onDelete, onView }: BudgetCardProps) {
  const spentAmount = budget.spentMinor || 0;
  const budgetAmount = budget.amountBaseMinor;
  const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
  const remainingAmount = budgetAmount - spentAmount;
  const isOverBudget = spentAmount > budgetAmount;
  const isNearLimit = percentage >= 80; // 80% threshold
  
  // Format currency
  const formatCurrency = (amountMinor: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amountMinor / 100);
  };

  // Format month for display
  const formatMonth = (monthYYYYMM: string) => {
    const year = monthYYYYMM.substring(0, 4);
    const month = monthYYYYMM.substring(4, 6);
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      .replace(/^\w/, (c) => c.toUpperCase());
  };
  
  // Determinar color de la barra de progreso
  const getProgressColor = () => {
    if (isOverBudget) return 'bg-red-500';
    if (isNearLimit) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Obtener el color del fondo de alerta
  const getAlertBgColor = () => {
    if (isOverBudget) return 'bg-red-500/10 border-red-500/20';
    if (isNearLimit) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-gray-900 border-gray-800';
  };

  return (
    <div className={`rounded-xl p-6 border transition-all hover:shadow-lg group ${getAlertBgColor()}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: category?.color || '#3b82f6' }}
            />
            <h3 className="text-lg font-semibold text-white truncate">
              {category?.name || 'Categoría'}
            </h3>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <span>{formatMonth(budget.monthYYYYMM)}</span>
          </div>
        </div>

        {/* Status Icon */}
        <div className="flex items-center space-x-2">
          {isOverBudget ? (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          ) : isNearLimit ? (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          
          {/* Actions */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onView && (
              <button
                onClick={() => onView(budget.id)}
                className="p-1 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                title="Ver detalles"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(budget)}
                className="p-1 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-colors"
                title="Editar presupuesto"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(budget.id)}
                className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                title="Eliminar presupuesto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-400 mb-1">Gastado</p>
          <p className={`text-xl font-bold ${
            isOverBudget ? 'text-red-400' : 'text-white'
          }`}>
            {formatCurrency(spentAmount)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">
            {remainingAmount >= 0 ? 'Restante' : 'Excedido'}
          </p>
          <p className={`text-xl font-bold ${
            remainingAmount >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {formatCurrency(Math.abs(remainingAmount))}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Progreso</span>
          <span className={`font-medium ${
            isOverBudget ? 'text-red-400' : 
            isNearLimit ? 'text-yellow-400' : 'text-gray-300'
          }`}>
            {Math.round(percentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatCurrency(0)}</span>
          <span>{formatCurrency(budgetAmount)}</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-1 text-gray-400">
          <Target className="h-4 w-4" />
          <span>Presupuesto: {formatCurrency(budgetAmount)}</span>
        </div>
        
        {/* Alert threshold indicator */}
        <div className="text-xs text-gray-500">
          Alerta: 80%
        </div>
      </div>

      {/* Alert Message */}
      {(isOverBudget || isNearLimit) && (
        <div className={`mt-4 p-3 rounded-lg border ${
          isOverBudget 
            ? 'bg-red-500/10 border-red-500/20 text-red-300'
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
        }`}>
          <div className="flex items-center space-x-2 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>
              {isOverBudget 
                ? `Has excedido el presupuesto por ${formatCurrency(Math.abs(remainingAmount))}`
                : `Has alcanzado el ${Math.round(percentage)}% del presupuesto`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
