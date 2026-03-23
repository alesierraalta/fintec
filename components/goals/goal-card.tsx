'use client';

import {
  Target,
  Calendar,
  TrendingUp,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCcw,
  Wallet,
} from 'lucide-react';
import type { SavingsGoal } from '@/types';

interface GoalCardProps {
  goal: SavingsGoal;
  account?: {
    id: string;
    name: string;
    type: string;
  };
  onEdit?: (goal: SavingsGoal) => void;
  onDelete?: (goalId: string) => void;
  onView?: (goalId: string) => void;
  onAddMoney?: (goalId: string) => void;
  onRefreshProgress?: (goalId: string) => void;
  isRefreshing?: boolean;
}

export function GoalCard({
  goal,
  account,
  onEdit,
  onDelete,
  onView,
  onAddMoney,
  onRefreshProgress,
  isRefreshing = false,
}: GoalCardProps) {
  const targetAmount = goal.targetBaseMinor;
  const currentAmount = goal.currentBaseMinor;
  const percentage =
    targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const remainingAmount = targetAmount - currentAmount;
  const isCompleted = currentAmount >= targetAmount;
  const isLinkedAccountGoal = Boolean(goal.accountId);

  const formatCurrency = (amountMinor: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amountMinor / 100);
  };

  const formatDate = (dateISO?: string) => {
    if (!dateISO) return null;
    return new Date(dateISO).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysRemaining = () => {
    if (!goal.targetDate) return null;
    const today = new Date();
    const target = new Date(goal.targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();
  const isOverdue = daysRemaining !== null && daysRemaining < 0;
  const isNearDeadline =
    daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;

  const getProgressColor = () => {
    if (isCompleted) return 'bg-green-500';
    if (isOverdue) return 'bg-red-500';
    if (isNearDeadline) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getCardBgColor = () => {
    if (isCompleted) return 'bg-green-500/10 border-green-500/20';
    if (isOverdue) return 'bg-red-500/10 border-red-500/20';
    if (isNearDeadline) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-gray-900 border-gray-800';
  };

  return (
    <div
      className={`group rounded-xl border p-6 transition-all hover:shadow-lg ${getCardBgColor()}`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-400" />
            <h3 className="truncate text-lg font-semibold text-white">
              {goal.name}
            </h3>
            {isCompleted && <CheckCircle className="h-5 w-5 text-green-500" />}
          </div>
          {goal.description && (
            <p className="mb-2 line-clamp-2 text-sm text-gray-400">
              {goal.description}
            </p>
          )}
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            {account && <span>{account.name}</span>}
            {goal.targetDate && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(goal.targetDate)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isCompleted ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : isOverdue ? (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          ) : isNearDeadline ? (
            <Clock className="h-5 w-5 text-yellow-500" />
          ) : (
            <TrendingUp className="h-5 w-5 text-blue-500" />
          )}

          <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onView && (
              <button
                onClick={() => onView(goal.id)}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-blue-400/10 hover:text-blue-400"
                title="Ver detalles"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(goal)}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-yellow-400/10 hover:text-yellow-400"
                title="Editar meta"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(goal.id)}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-red-400/10 hover:text-red-400"
                title="Eliminar meta"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-gray-400">Progreso</span>
          <span
            className={`font-medium ${
              isCompleted
                ? 'text-green-400'
                : isOverdue
                  ? 'text-red-400'
                  : isNearDeadline
                    ? 'text-yellow-400'
                    : 'text-blue-400'
            }`}
          >
            {Math.round(percentage)}%
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-700">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <p className="mb-1 text-sm text-gray-400">Ahorrado</p>
          <p className="text-xl font-bold text-white">
            {formatCurrency(currentAmount)}
          </p>
        </div>
        <div>
          <p className="mb-1 text-sm text-gray-400">
            {isCompleted ? 'Meta Alcanzada' : 'Falta'}
          </p>
          <p
            className={`text-xl font-bold ${
              isCompleted ? 'text-green-400' : 'text-blue-400'
            }`}
          >
            {isCompleted ? '¡Completado!' : formatCurrency(remainingAmount)}
          </p>
        </div>
      </div>

      {daysRemaining !== null && (
        <div
          className={`mb-4 rounded-lg border p-3 ${
            isCompleted
              ? 'border-green-500/20 bg-green-500/10'
              : isOverdue
                ? 'border-red-500/20 bg-red-500/10 text-red-300'
                : isNearDeadline
                  ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300'
                  : 'border-blue-500/20 bg-blue-500/10 text-blue-300'
          }`}
        >
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>
              {isCompleted
                ? '¡Meta completada!'
                : isOverdue
                  ? `Venció hace ${Math.abs(daysRemaining)} días`
                  : `${daysRemaining} días restantes`}
            </span>
          </div>
        </div>
      )}

      {isLinkedAccountGoal && (
        <div className="mb-4 flex items-start space-x-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            El progreso se sincroniza con el saldo de la cuenta vinculada. Los
            aportes manuales están deshabilitados.
          </span>
        </div>
      )}

      {!isCompleted && !isLinkedAccountGoal && onAddMoney && (
        <button
          onClick={() => onAddMoney(goal.id)}
          className="flex w-full items-center justify-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          <TrendingUp className="h-4 w-4" />
          <span>Agregar Dinero</span>
        </button>
      )}

      {!isCompleted && isLinkedAccountGoal && onRefreshProgress && (
        <button
          onClick={() => onRefreshProgress(goal.id)}
          disabled={isRefreshing}
          className="flex w-full items-center justify-center space-x-2 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span>{isRefreshing ? 'Actualizando...' : 'Refrescar progreso'}</span>
        </button>
      )}

      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>{formatCurrency(0)}</span>
        <span>{formatCurrency(targetAmount)}</span>
      </div>
    </div>
  );
}
