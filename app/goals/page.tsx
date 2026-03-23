'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MainLayout } from '@/components/layout/main-layout';
import { GoalCard } from '@/components/goals';
import { useModal } from '@/hooks';
import {
  Plus,
  Target,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Filter,
  Search,
  Loader2,
} from 'lucide-react';
import { useRepository } from '@/providers/repository-provider';
import { useAuth } from '@/hooks/use-auth';
import type { GoalWithProgress } from '@/repositories/contracts';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressRing } from '@/components/ui/progress-ring';
import { FormLoading } from '@/components/ui/suspense-loading';
import type { SavingsGoal } from '@/types';
import { toast } from 'sonner';

const GoalForm = dynamic(
  () => import('@/components/forms/goal-form').then((mod) => mod.GoalForm),
  { loading: () => <FormLoading />, ssr: false }
);

export default function GoalsPage() {
  const { isOpen, openModal, closeModal } = useModal();
  const repository = useRepository();
  const { user } = useAuth();
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingGoalId, setRefreshingGoalId] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    'all' | 'active' | 'completed' | 'overdue'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');

  const reloadGoalsData = async () => {
    const [goalsData, stats] = await Promise.all([
      repository.goals.getGoalsWithProgress(),
      repository.goals.getGoalsSummary(),
    ]);
    setGoals(goalsData);
    setSummary(stats);
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        await reloadGoalsData();
      } catch (error) {
        console.error('Failed to load goals:', error);
        toast.error('No se pudieron cargar las metas');
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [user, repository]);

  const filteredGoals = goals.filter((goal) => {
    const matchesSearch =
      goal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (goal.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const isCompleted = goal.currentBaseMinor >= goal.targetBaseMinor;
    const isOverdue =
      goal.targetDate && new Date(goal.targetDate) < new Date() && !isCompleted;

    switch (filter) {
      case 'completed':
        return isCompleted;
      case 'overdue':
        return isOverdue;
      case 'active':
        return goal.active && !isCompleted && !isOverdue;
      default:
        return true;
    }
  });

  const totalGoals = summary?.totalGoals ?? goals.length;
  const completedGoals =
    summary?.completedGoals ??
    goals.filter((goal) => goal.currentBaseMinor >= goal.targetBaseMinor)
      .length;
  const activeGoals =
    summary?.activeGoals ??
    goals.filter(
      (goal) => goal.active && goal.currentBaseMinor < goal.targetBaseMinor
    ).length;
  const overdueGoals = goals.filter(
    (goal) =>
      goal.targetDate &&
      new Date(goal.targetDate) < new Date() &&
      goal.currentBaseMinor < goal.targetBaseMinor
  ).length;

  const totalTarget =
    summary?.totalTargetBaseMinor ??
    goals.reduce((sum, goal) => sum + goal.targetBaseMinor, 0);
  const totalSaved =
    summary?.totalSavedBaseMinor ??
    goals.reduce((sum, goal) => sum + goal.currentBaseMinor, 0);
  const overallProgress =
    summary?.averageProgress ??
    (totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0);

  const handleNewGoal = () => {
    setSelectedGoal(null);
    openModal();
  };

  const handleEditGoal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    openModal();
  };

  const handleSaveGoal = async (goalData: Partial<SavingsGoal>) => {
    try {
      setLoading(true);
      if (selectedGoal) {
        await repository.goals.update(selectedGoal.id, {
          ...goalData,
          id: selectedGoal.id,
        } as any);
        toast.success('Meta actualizada correctamente');
      } else {
        await repository.goals.create({
          name: goalData.name!,
          description: goalData.description,
          targetBaseMinor: goalData.targetBaseMinor!,
          targetDate: goalData.targetDate,
          accountId: goalData.accountId,
          active: true,
        });
        toast.success('Meta creada correctamente');
      }

      await reloadGoalsData();
      closeModal();
    } catch (error) {
      console.error('Failed to save goal:', error);
      toast.error('No se pudo guardar la meta');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta meta?'))
      return;

    try {
      setLoading(true);
      await repository.goals.delete(goalId);
      await reloadGoalsData();
      toast.success('Meta eliminada correctamente');
    } catch (error) {
      console.error('Failed to delete goal:', error);
      toast.error('No se pudo eliminar la meta');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoney = async (goalId: string) => {
    const amount = window.prompt('¿Cuánto deseas aportar? (Ej: 100.00)');
    if (!amount) return;

    const amountMinor = Math.round(Number.parseFloat(amount) * 100);
    if (Number.isNaN(amountMinor) || amountMinor <= 0) {
      window.alert('Por favor ingresa un monto válido');
      return;
    }

    try {
      setLoading(true);
      await repository.goals.addContribution(
        goalId,
        amountMinor,
        'Aporte manual desde la UI'
      );
      await reloadGoalsData();
      toast.success('Aporte registrado correctamente');
    } catch (error) {
      console.error('Failed to add contribution:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo registrar el aporte'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshGoalProgress = async (goalId: string) => {
    try {
      setRefreshingGoalId(goalId);
      await repository.goals.updateGoalProgress(goalId);
      await reloadGoalsData();
      toast.success('Progreso refrescado correctamente');
    } catch (error) {
      console.error('Failed to refresh goal progress:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo refrescar el progreso de la meta'
      );
    } finally {
      setRefreshingGoalId(null);
    }
  };

  const formatCurrency = (amountMinor: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amountMinor / 100);
  };

  return (
    <MainLayout>
      <div className="animate-fade-in space-y-8">
        {/* iOS-style Header */}
        <div className="py-8 text-center">
          <div className="mb-4 inline-flex items-center space-x-2 text-muted-foreground">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
            <span className="text-ios-caption font-medium">Objetivos</span>
          </div>

          <h1 className="mb-6 bg-gradient-to-r from-primary via-green-600 to-emerald-500 bg-clip-text text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-6xl">
            🎯 Metas de Ahorro
          </h1>
          <p className="mb-6 font-light text-muted-foreground">
            Define y sigue el progreso de tus objetivos financieros
          </p>

          {/* Quick Actions Header - Hidden on mobile */}
          <div className="mb-4 hidden items-center justify-center space-x-4 sm:flex">
            <button
              onClick={handleNewGoal}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-green-600 px-6 py-3 text-ios-body font-medium text-white shadow-lg transition-all duration-300 hover:from-green-600 hover:to-primary"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:animate-pulse group-hover:opacity-20"></div>
              <div className="relative flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Nueva Meta</span>
              </div>
            </button>
          </div>
        </div>

        {/* iOS-style Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="group rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
              <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
                TOTAL METAS
              </h3>
            </div>
            <p className="mb-2 text-3xl font-light text-foreground">
              {totalGoals}
            </p>
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-ios-footnote font-medium text-blue-600">
                Objetivos
              </span>
            </div>
          </div>

          <div className="group rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
              <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
                COMPLETADAS
              </h3>
            </div>
            <p className="mb-2 text-3xl font-light text-foreground">
              {completedGoals}
            </p>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-ios-footnote font-medium text-green-600">
                Logradas
              </span>
            </div>
          </div>

          <div className="group rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
              <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
                EN PROGRESO
              </h3>
            </div>
            <p className="mb-2 text-3xl font-light text-foreground">
              {activeGoals}
            </p>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-ios-footnote font-medium text-blue-600">
                Activas
              </span>
            </div>
          </div>

          <div className="group rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500"></div>
              <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
                VENCIDAS
              </h3>
            </div>
            <p className="mb-2 text-3xl font-light text-foreground">
              {overdueGoals}
            </p>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-ios-footnote font-medium text-red-600">
                Retrasadas
              </span>
            </div>
          </div>
        </div>

        {/* iOS-style Overall Progress */}
        <div className="rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl">
          <div className="mb-6 flex items-center space-x-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
            <h2 className="text-ios-title font-semibold text-foreground">
              Progreso General
            </h2>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <span className="text-ios-body text-muted-foreground">
              Completado
            </span>
            <span className="text-ios-body font-medium text-foreground">
              {Math.round(overallProgress)}%
            </span>
          </div>

          <div className="mb-6 h-3 w-full overflow-hidden rounded-full bg-muted/30">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-primary via-green-500 to-emerald-400 shadow-inner transition-all duration-500 ease-out"
              style={{ width: `${Math.min(overallProgress, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <p className="mb-2 text-ios-caption tracking-wide text-muted-foreground">
                TOTAL AHORRADO
              </p>
              <p className="text-2xl font-light text-foreground">
                {formatCurrency(totalSaved)}
              </p>
              <div className="mt-2 flex items-center justify-center space-x-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-ios-footnote font-medium text-green-600">
                  Acumulado
                </span>
              </div>
            </div>
            <div className="text-center">
              <p className="mb-2 text-ios-caption tracking-wide text-muted-foreground">
                META TOTAL
              </p>
              <p className="text-2xl font-light text-foreground">
                {formatCurrency(totalTarget)}
              </p>
              <div className="mt-2 flex items-center justify-center space-x-1">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="text-ios-footnote font-medium text-blue-600">
                  Objetivo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar metas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              <option value="active">En Progreso</option>
              <option value="completed">Completadas</option>
              <option value="overdue">Vencidas</option>
            </select>
          </div>
        </div>

        {/* Goals Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Tus Metas</h2>
            <span className="text-sm text-gray-400">
              {filteredGoals.length} meta{filteredGoals.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
              <p className="mt-4 text-muted-foreground">
                Cargando tus metas...
              </p>
            </div>
          ) : filteredGoals.length === 0 ? (
            <EmptyState
              title={
                searchTerm || filter !== 'all'
                  ? 'No se encontraron metas'
                  : 'No tienes metas de ahorro'
              }
              description={
                searchTerm || filter !== 'all'
                  ? 'Intenta cambiar los filtros o términos de búsqueda'
                  : 'Crea tu primera meta de ahorro para comenzar a alcanzar tus objetivos financieros'
              }
              icon={<Target className="h-12 w-12 text-muted-foreground" />}
              actionLabel={
                !searchTerm && filter === 'all'
                  ? 'Crear Primera Meta'
                  : undefined
              }
              onAction={
                !searchTerm && filter === 'all' ? handleNewGoal : undefined
              }
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredGoals.map((goal) => {
                return (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={() => handleEditGoal(goal)}
                    onDelete={() => handleDeleteGoal(goal.id)}
                    onAddMoney={goal.accountId ? undefined : handleAddMoney}
                    onRefreshProgress={
                      goal.accountId ? handleRefreshGoalProgress : undefined
                    }
                    isRefreshing={refreshingGoalId === goal.id}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <GoalForm
          isOpen={isOpen}
          onClose={closeModal}
          goal={selectedGoal}
          onSave={handleSaveGoal}
        />
      )}

      {/* Floating Action Button for Mobile */}
      <FloatingActionButton
        onClick={handleNewGoal}
        label="Nueva Meta"
        icon={<Plus className="h-6 w-6" />}
        mobileOnly={true}
        position="bottom-right"
        variant="warning"
      />
    </MainLayout>
  );
}
