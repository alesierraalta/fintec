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
  Clock
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
}

export function GoalCard({ goal, account, onEdit, onDelete, onView, onAddMoney }: GoalCardProps) {
  const targetAmount = goal.targetBaseMinor;
  const currentAmount = goal.currentBaseMinor;
  const percentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const remainingAmount = targetAmount - currentAmount;
  const isCompleted = currentAmount >= targetAmount;
  
  // Format currency
  const formatCurrency = (amountMinor: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amountMinor / 100);
  };

  // Format date
  const formatDate = (dateISO?: string) => {
    if (!dateISO) return null;
    return new Date(dateISO).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate days remaining
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
  const isNearDeadline = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0;
  
  // Determinar color de la barra de progreso
  const getProgressColor = () => {
    if (isCompleted) return 'bg-green-500';
    if (isOverdue) return 'bg-red-500';
    if (isNearDeadline) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  // Obtener el color del fondo
  const getCardBgColor = () => {
    if (isCompleted) return 'bg-green-500/10 border-green-500/20';
    if (isOverdue) return 'bg-red-500/10 border-red-500/20';
    if (isNearDeadline) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-gray-900 border-gray-800';
  };

  return (
    <div className={`rounded-xl p-6 border transition-all hover:shadow-lg group ${getCardBgColor()}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <Target className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white truncate">
              {goal.name}
            </h3>
            {isCompleted && <CheckCircle className="h-5 w-5 text-green-500" />}
          </div>
          {goal.description && (
            <p className="text-sm text-gray-400 mb-2 line-clamp-2">
              {goal.description}
            </p>
          )}
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            {account && (
              <span>{account.name}</span>
            )}
            {goal.targetDate && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(goal.targetDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Icon and Actions */}
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
          
          {/* Actions */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onView && (
              <button
                onClick={() => onView(goal.id)}
                className="p-1 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                title="Ver detalles"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(goal)}
                className="p-1 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-colors"
                title="Editar meta"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(goal.id)}
                className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                title="Eliminar meta"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Progreso</span>
          <span className={`font-medium ${
            isCompleted ? 'text-green-400' : 
            isOverdue ? 'text-red-400' : 
            isNearDeadline ? 'text-yellow-400' : 'text-blue-400'
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
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-400 mb-1">Ahorrado</p>
          <p className="text-xl font-bold text-white">
            {formatCurrency(currentAmount)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">
            {isCompleted ? 'Meta Alcanzada' : 'Falta'}
          </p>
          <p className={`text-xl font-bold ${
            isCompleted ? 'text-green-400' : 'text-blue-400'
          }`}>
            {isCompleted ? '¡Completado!' : formatCurrency(remainingAmount)}
          </p>
        </div>
      </div>

      {/* Timeline Info */}
      {daysRemaining !== null && (
        <div className={`p-3 rounded-lg border mb-4 ${
          isCompleted 
            ? 'bg-green-500/10 border-green-500/20'
            : isOverdue 
              ? 'bg-red-500/10 border-red-500/20 text-red-300'
              : isNearDeadline 
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
        }`}>
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>
              {isCompleted 
                ? '¡Meta completada!'
                : isOverdue 
                  ? `Venció hace ${Math.abs(daysRemaining)} días`
                  : `${daysRemaining} días restantes`
              }
            </span>
          </div>
        </div>
      )}

      {/* Action Button */}
      {!isCompleted && onAddMoney && (
        <button
          onClick={() => onAddMoney(goal.id)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <TrendingUp className="h-4 w-4" />
          <span>Agregar Dinero</span>
        </button>
      )}

      {/* Target amount indicator */}
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{formatCurrency(0)}</span>
        <span>{formatCurrency(targetAmount)}</span>
      </div>
    </div>
  );
}
