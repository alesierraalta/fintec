'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MainLayout } from '@/components/layout/main-layout';
import { BudgetCard } from '@/components/budgets';
import { useModal } from '@/hooks';
import { useAuth } from '@/hooks/use-auth';
import { useRepository } from '@/providers/repository-provider';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormLoading } from '@/components/ui/suspense-loading';
import type { Budget, Category } from '@/types';
import { toast } from 'sonner';

const BudgetForm = dynamic(
  () => import('@/components/forms/budget-form').then((mod) => mod.BudgetForm),
  { loading: () => <FormLoading />, ssr: false }
);

export default function BudgetsPage() {
  const { isOpen, openModal, closeModal } = useModal();
  const { user } = useAuth();
  const repository = useRepository();
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [budgets, setBudgets] = useState<
    import('@/repositories/contracts').BudgetWithProgress[]
  >([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copyingBudgets, setCopyingBudgets] = useState(false);

  const reloadBudgetData = async (month: string) => {
    const [budgetsWithProgress, allCategories, monthSummary] =
      await Promise.all([
        repository.budgets.getBudgetsWithProgress(month),
        repository.categories.findAll(),
        repository.budgets.getMonthlyBudgetSummary(month),
      ]);
    setBudgets(budgetsWithProgress);
    setCategories(allCategories);
    setSummary(monthSummary);
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        await reloadBudgetData(selectedMonth);
      } catch (error) {
        console.error('Failed to load budget data:', error);
        setBudgets([]);
        setCategories([]);
        setSummary(null);
        toast.error('No se pudieron cargar los presupuestos');
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [user, repository, selectedMonth]);

  const generateMonthOptions = () => {
    const months = [];
    const now = new Date();

    for (let i = -2; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = `${date.getFullYear()}${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
      });

      months.push({
        value: monthKey,
        label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      });
    }

    return months;
  };

  const getPreviousMonth = (monthYYYYMM: string) => {
    const year = Number.parseInt(monthYYYYMM.slice(0, 4), 10);
    const month = Number.parseInt(monthYYYYMM.slice(4, 6), 10) - 1;
    const date = new Date(year, month - 1, 1);
    return `${date.getFullYear()}${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
  };

  const monthOptions = generateMonthOptions();
  const filteredBudgets = budgets.filter(
    (budget) => budget.monthYYYYMM === selectedMonth
  );

  const totalBudgeted =
    summary?.totalBudgetBaseMinor ??
    budgets.reduce((sum, budget) => sum + budget.amountBaseMinor, 0);
  const totalSpent =
    summary?.totalSpentBaseMinor ??
    budgets.reduce((sum, budget) => sum + (budget.spentMinor || 0), 0);
  const remaining =
    summary?.totalRemainingBaseMinor ?? totalBudgeted - totalSpent;
  const overBudgetCount =
    summary?.overBudgetCount ??
    budgets.filter(
      (budget) => (budget.spentMinor || 0) > budget.amountBaseMinor
    ).length;

  const handleNewBudget = () => {
    setSelectedBudget(null);
    openModal();
  };

  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    openModal();
  };

  const handleSaveBudget = async (budgetData: Partial<Budget>) => {
    try {
      setLoading(true);
      if (selectedBudget) {
        await repository.budgets.update(selectedBudget.id, {
          ...budgetData,
          id: selectedBudget.id,
        } as any);
        toast.success('Presupuesto actualizado correctamente');
      } else {
        await repository.budgets.create({
          categoryId: budgetData.categoryId!,
          monthYear: selectedMonth,
          amountBaseMinor: budgetData.amountBaseMinor || 0,
          active: true,
        });
        toast.success('Presupuesto creado correctamente');
      }

      await reloadBudgetData(selectedMonth);
      closeModal();
    } catch (error) {
      console.error('Failed to save budget:', error);
      toast.error('No se pudo guardar el presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (
      !window.confirm('¿Estás seguro de que deseas eliminar este presupuesto?')
    )
      return;

    try {
      setLoading(true);
      await repository.budgets.delete(budgetId);
      await reloadBudgetData(selectedMonth);
      toast.success('Presupuesto eliminado correctamente');
    } catch (error) {
      console.error('Failed to delete budget:', error);
      toast.error('No se pudo eliminar el presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPreviousMonth = async () => {
    const previousMonth = getPreviousMonth(selectedMonth);

    try {
      setCopyingBudgets(true);
      const sourceBudgets =
        await repository.budgets.findByMonthYear(previousMonth);
      if (sourceBudgets.length === 0) {
        toast.info('El mes anterior no tiene presupuestos para copiar');
        return;
      }

      const copiedBudgets = await repository.budgets.copyBudgetsToNextMonth(
        previousMonth,
        selectedMonth
      );
      const skippedCount = sourceBudgets.length - copiedBudgets.length;

      await reloadBudgetData(selectedMonth);

      if (copiedBudgets.length === 0) {
        toast.info(
          'Todos los presupuestos del mes anterior ya existen en este mes'
        );
        return;
      }

      toast.success(
        `Copiados ${copiedBudgets.length} presupuesto${copiedBudgets.length === 1 ? '' : 's'}; ${skippedCount} omitido${skippedCount === 1 ? '' : 's'}`
      );
    } catch (error) {
      console.error('Failed to copy budgets:', error);
      toast.error('No se pudieron copiar los presupuestos del mes anterior');
    } finally {
      setCopyingBudgets(false);
    }
  };

  const formatCurrency = (amountMinor: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amountMinor / 100);
  };

  const selectedMonthLabel =
    monthOptions.find((month) => month.value === selectedMonth)?.label ||
    'Mes Actual';

  return (
    <MainLayout>
      <div className="animate-fade-in space-y-8">
        {/* iOS-style Header */}
        <div className="py-8 text-center">
          <div className="mb-4 inline-flex items-center space-x-2 text-muted-foreground">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
            <span className="text-ios-caption font-medium">Planificación</span>
          </div>

          <h1 className="mb-6 bg-gradient-to-r from-primary via-blue-600 to-indigo-500 bg-clip-text text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-6xl">
            💰 Presupuestos
          </h1>
          <p className="mb-6 font-light text-muted-foreground">
            Controla tus gastos con presupuestos mensuales
          </p>

          {/* Quick Actions Header - Hidden on mobile */}
          <div className="mb-4 hidden items-center justify-center space-x-4 sm:flex">
            <button
              onClick={handleNewBudget}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-blue-600 px-6 py-3 text-ios-body font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-600 hover:to-primary"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:animate-pulse group-hover:opacity-20"></div>
              <div className="relative flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Nuevo Presupuesto</span>
              </div>
            </button>
          </div>
        </div>

        {/* iOS-style Month Selector */}
        <div className="rounded-3xl border border-border/20 bg-card/60 p-6 shadow-lg backdrop-blur-xl">
          <div className="mb-4 flex items-center space-x-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
            <h2 className="text-ios-title font-semibold text-foreground">
              Período
            </h2>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="text-ios-body font-medium text-foreground">
                Mes seleccionado:
              </span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-2xl border border-border/40 bg-card px-4 py-3 text-ios-body text-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCopyPreviousMonth}
                disabled={copyingBudgets}
                className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-200 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copyingBudgets
                  ? 'Copiando presupuestos...'
                  : 'Copiar presupuestos del mes anterior'}
              </button>
            </div>
          </div>
        </div>

        {/* iOS-style Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="group rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
              <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
                PRESUPUESTADO
              </h3>
            </div>
            <p className="mb-2 text-3xl font-light text-foreground">
              {formatCurrency(totalBudgeted)}
            </p>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-ios-footnote font-medium text-blue-600">
                Total planificado
              </span>
            </div>
          </div>

          <div className="group rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500"></div>
              <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
                GASTADO
              </h3>
            </div>
            <p className="mb-2 text-3xl font-light text-foreground">
              {formatCurrency(totalSpent)}
            </p>
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-ios-footnote font-medium text-red-600">
                Gastado real
              </span>
            </div>
          </div>

          <div className="group rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
            <div className="mb-4 flex items-center space-x-2">
              <div
                className={`h-2 w-2 ${remaining >= 0 ? 'bg-green-500' : 'bg-red-500'} animate-pulse rounded-full`}
              ></div>
              <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
                DISPONIBLE
              </h3>
            </div>
            <p
              className={`mb-2 text-3xl font-light ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(remaining)}
            </p>
            <div className="flex items-center space-x-2">
              <TrendingUp
                className={`h-4 w-4 ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}
              />
              <span
                className={`text-ios-footnote font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {remaining >= 0 ? 'Disponible' : 'Sobrepasado'}
              </span>
            </div>
          </div>

          <div className="group rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500"></div>
              <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
                ALERTAS
              </h3>
            </div>
            <p className="mb-2 text-3xl font-light text-foreground">
              {overBudgetCount}
            </p>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-ios-footnote font-medium text-amber-600">
                Sobrepasados
              </span>
            </div>
          </div>
        </div>

        {/* Budget Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              Presupuestos - {selectedMonthLabel}
            </h2>
            <span className="text-sm text-gray-400">
              {filteredBudgets.length} presupuesto
              {filteredBudgets.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
              <p className="text-gray-400">Cargando presupuestos...</p>
            </div>
          ) : filteredBudgets.length === 0 ? (
            <EmptyState
              title={`No hay presupuestos para ${selectedMonthLabel}`}
              description="Crea tu primer presupuesto para comenzar a controlar tus gastos"
              icon={
                <AlertTriangle className="h-12 w-12 text-muted-foreground" />
              }
              actionLabel="Crear Presupuesto"
              onAction={handleNewBudget}
            />
          ) : (
            <div className="grid gap-4">
              {budgets.map((budget) => {
                const category = categories.find(
                  (cat) => cat.id === budget.categoryId
                );
                return (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    category={category}
                    onEdit={() => handleEditBudget(budget)}
                    onDelete={() => handleDeleteBudget(budget.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <BudgetForm
          isOpen={isOpen}
          onClose={closeModal}
          budget={selectedBudget}
          onSave={handleSaveBudget}
        />
      )}

      {/* Floating Action Button for Mobile */}
      <FloatingActionButton
        onClick={handleNewBudget}
        label="Nuevo Presupuesto"
        icon={<Plus className="h-6 w-6" />}
        mobileOnly={true}
        position="bottom-right"
        variant="primary"
      />
    </MainLayout>
  );
}
