'use client';

import {
  Target,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import type { Budget } from '@/types';
import { ProgressRing } from '@/components/ui/progress-ring';

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
  const isNearLimit = percentage >= 80;

  const formatCurrency = (amountMinor: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amountMinor / 100);
  };

  const formatMonth = (monthYYYYMM: string) => {
    const year = monthYYYYMM.substring(0, 4);
    const month = monthYYYYMM.substring(4, 6);
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  const getAlertBgColor = () => {
    if (isOverBudget) return 'bg-red-500/10 border-red-500/20';
    if (isNearLimit) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-card/90 backdrop-blur-xl border-border/40';
  };

  return (
    <div className={`rounded-3xl p-5 border transition-all hover:shadow-xl group ${getAlertBgColor()}`}>
      {/* Header with Progress Ring */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {/* Progress Ring */}
          <ProgressRing
            progress={percentage}
            size={64}
            strokeWidth={5}
            showPercentage={true}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category?.color || '#3b82f6' }}
              />
              <h3 className="text-lg font-semibold text-foreground truncate">
                {category?.name || 'Categoría'}
              </h3>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatMonth(budget.monthYYYYMM)}
            </div>
          </div>
        </div>

        {/* Status Icon & Actions */}
        <div className="flex items-center space-x-2">
          {isOverBudget ? (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          ) : isNearLimit ? (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}

          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onView && (
              <button
                onClick={() => onView(budget.id)}
                className="p-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                title="Ver detalles"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(budget)}
                className="p-1.5 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors"
                title="Editar presupuesto"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(budget.id)}
                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Eliminar presupuesto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-muted/10 rounded-xl">
          <p className="text-xs text-muted-foreground mb-1">Presupuesto</p>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(budgetAmount)}
          </p>
        </div>
        <div className="text-center p-3 bg-muted/10 rounded-xl">
          <p className="text-xs text-muted-foreground mb-1">Gastado</p>
          <p className={`text-sm font-semibold ${isOverBudget ? 'text-red-500' : 'text-foreground'}`}>
            {formatCurrency(spentAmount)}
          </p>
        </div>
        <div className="text-center p-3 bg-muted/10 rounded-xl">
          <p className="text-xs text-muted-foreground mb-1">
            {remainingAmount >= 0 ? 'Restante' : 'Excedido'}
          </p>
          <p className={`text-sm font-semibold ${remainingAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(Math.abs(remainingAmount))}
          </p>
        </div>
      </div>

      {/* Alert Message */}
      {(isOverBudget || isNearLimit) && (
        <div className={`p-3 rounded-xl border ${isOverBudget
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
          }`}>
          <div className="flex items-center space-x-2 text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              {isOverBudget
                ? `Excedido por ${formatCurrency(Math.abs(remainingAmount))}`
                : `${Math.round(percentage)}% del presupuesto usado`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
