'use client';

import {
  Target,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Eye,
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

export function BudgetCard({
  budget,
  category,
  onEdit,
  onDelete,
  onView,
}: BudgetCardProps) {
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
    return date
      .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  const getAlertBgColor = () => {
    if (isOverBudget) return 'bg-red-500/10 border-red-500/20';
    if (isNearLimit) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-card/90 border-border/40';
  };

  return (
    <div
      className={`group rounded-3xl border p-5 transition-all hover:shadow-xl ${getAlertBgColor()}`}
    >
      {/* Header with Progress Ring */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Progress Ring */}
          <ProgressRing
            progress={percentage}
            size={64}
            strokeWidth={5}
            showPercentage={true}
          />

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center space-x-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: category?.color || '#3b82f6' }}
              />
              <h3 className="truncate text-lg font-semibold text-foreground">
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

          <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onView && (
              <button
                onClick={() => onView(budget.id)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-500"
                title="Ver detalles"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(budget)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-yellow-500/10 hover:text-yellow-500"
                title="Editar presupuesto"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(budget.id)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                title="Eliminar presupuesto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Amounts */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-muted/10 p-3 text-center">
          <p className="mb-1 text-xs text-muted-foreground">Presupuesto</p>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(budgetAmount)}
          </p>
        </div>
        <div className="rounded-xl bg-muted/10 p-3 text-center">
          <p className="mb-1 text-xs text-muted-foreground">Gastado</p>
          <p
            className={`text-sm font-semibold ${isOverBudget ? 'text-red-500' : 'text-foreground'}`}
          >
            {formatCurrency(spentAmount)}
          </p>
        </div>
        <div className="rounded-xl bg-muted/10 p-3 text-center">
          <p className="mb-1 text-xs text-muted-foreground">
            {remainingAmount >= 0 ? 'Restante' : 'Excedido'}
          </p>
          <p
            className={`text-sm font-semibold ${remainingAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}
          >
            {formatCurrency(Math.abs(remainingAmount))}
          </p>
        </div>
      </div>

      {/* Alert Message */}
      {(isOverBudget || isNearLimit) && (
        <div
          className={`rounded-xl border p-3 ${
            isOverBudget
              ? 'border-red-500/20 bg-red-500/10 text-red-400'
              : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
          }`}
        >
          <div className="flex items-center space-x-2 text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              {isOverBudget
                ? `Excedido por ${formatCurrency(Math.abs(remainingAmount))}`
                : `${Math.round(percentage)}% del presupuesto usado`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
