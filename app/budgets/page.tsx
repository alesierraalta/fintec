'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { BudgetForm } from '@/components/forms';
import { BudgetCard } from '@/components/budgets';
import { Button } from '@/components/ui';
import { useModal } from '@/hooks';
import { useAuth } from '@/hooks/use-auth';
import { useRepository } from '@/providers/repository-provider';
import { Plus, TrendingUp, TrendingDown, AlertTriangle, Calendar } from 'lucide-react';
import type { Budget, Category } from '@/types';

export default function BudgetsPage() {
  const { isOpen, openModal, closeModal } = useModal();
  const { user } = useAuth();
  const repository = useRepository();
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('202412');
  const [loading, setLoading] = useState(true);

  // Load budgets and categories from database
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const [allBudgets, allCategories] = await Promise.all([
          repository.budgets.findAll(),
          repository.categories.findAll()
        ]);
        setBudgets(allBudgets);
        setCategories(allCategories);
      } catch (error) {
        console.error('Error loading budgets data:', error);
        setBudgets([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, repository]);

  // Generate month options
  const generateMonthOptions = () => {
    const months = [];
    const now = new Date();
    
    for (let i = -2; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long' 
      });
      
      months.push({
        value: monthKey,
        label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      });
    }
    
    return months;
  };

  const monthOptions = generateMonthOptions();
  const filteredBudgets = budgets.filter(budget => budget.monthYYYYMM === selectedMonth);

  // Calculate statistics
  const totalBudgeted = filteredBudgets.reduce((sum, budget) => sum + budget.amountBaseMinor, 0);
  const totalSpent = filteredBudgets.reduce((sum, budget) => sum + (budget.spentMinor || 0), 0);
  const remaining = totalBudgeted - totalSpent;
  const overBudgetCount = filteredBudgets.filter(budget => 
    (budget.spentMinor || 0) > budget.amountBaseMinor
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
      if (selectedBudget) {
        // Update existing budget - aquí implementarías la lógica real
        setBudgets(prev => prev.map(budget => 
          budget.id === selectedBudget.id 
            ? { ...budget, ...budgetData }
            : budget
        ));
      } else {
        // Add new budget - aquí implementarías la lógica real
        setBudgets(prev => [...prev, budgetData as Budget]);
      }
      closeModal();
    } catch (error) {
      console.error('Error saving budget:', error);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    try {
      // Aquí implementarías la lógica real de eliminación
      setBudgets(prev => prev.filter(budget => budget.id !== budgetId));
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  const formatCurrency = (amountMinor: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amountMinor / 100);
  };

  const selectedMonthLabel = monthOptions.find(month => month.value === selectedMonth)?.label || 'Mes Actual';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Presupuestos</h1>
            <p className="text-gray-400">Controla tus gastos con presupuestos mensuales</p>
          </div>
          <Button
            onClick={handleNewBudget}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Presupuesto
          </Button>
        </div>

        {/* Month Selector */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">Período:</span>
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Presupuestado</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {formatCurrency(totalBudgeted)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Gastado</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {formatCurrency(totalSpent)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Disponible</p>
                <p className={`text-2xl font-bold mt-1 ${
                  remaining >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatCurrency(remaining)}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                remaining >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                <TrendingUp className={`h-6 w-6 ${
                  remaining >= 0 ? 'text-green-400' : 'text-red-400'
                }`} />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Sobrepasados</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {overBudgetCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              </div>
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
              {filteredBudgets.length} presupuesto{filteredBudgets.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Cargando presupuestos...</p>
            </div>
          ) : filteredBudgets.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No hay presupuestos para {selectedMonthLabel}
              </h3>
              <p className="text-gray-400 mb-4">
                Crea tu primer presupuesto para comenzar a controlar tus gastos
              </p>
              <Button
                onClick={handleNewBudget}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-5 w-5 mr-2" />
                Crear Presupuesto
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredBudgets.map((budget) => {
                const category = categories.find(cat => cat.id === budget.categoryId);
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

      <BudgetForm
        isOpen={isOpen}
        onClose={closeModal}
        budget={selectedBudget}
        onSave={handleSaveBudget}
      />
    </MainLayout>
  );
}