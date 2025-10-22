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
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    try {
      // Aquí implementarías la lógica real de eliminación
      setBudgets(prev => prev.filter(budget => budget.id !== budgetId));
    } catch (error) {
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
      <div className="space-y-8 animate-fade-in">
        {/* iOS-style Header */}
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-muted-foreground mb-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-ios-caption font-medium">Planificación</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-bold mb-6 tracking-tight bg-gradient-to-r from-primary via-blue-600 to-indigo-500 bg-clip-text text-white">
            💰 Presupuestos
          </h1>
          <p className="text-muted-foreground font-light mb-6">
            Controla tus gastos con presupuestos mensuales
          </p>
          
          {/* Quick Actions Header */}
          <div className="flex items-center justify-center space-x-4 mb-4">
            <button
              onClick={handleNewBudget}
              className="relative px-6 py-3 rounded-xl text-white font-medium shadow-lg overflow-hidden group transition-all duration-300 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-ios-body"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></div>
              <div className="relative flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Nuevo Presupuesto</span>
              </div>
            </button>
          </div>
        </div>

        {/* iOS-style Month Selector */}
        <div className="bg-card/60 backdrop-blur-xl rounded-3xl p-6 border border-border/20 shadow-lg">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <h2 className="text-ios-title font-semibold text-foreground">Período</h2>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="text-foreground font-medium text-ios-body">Mes seleccionado:</span>
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-card border border-border/40 text-foreground rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-ios-body"
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* iOS-style Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">PRESUPUESTADO</h3>
            </div>
            <p className="text-3xl font-light text-foreground mb-2">
              {formatCurrency(totalBudgeted)}
            </p>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-ios-footnote text-blue-600 font-medium">Total planificado</span>
            </div>
          </div>

          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">GASTADO</h3>
            </div>
            <p className="text-3xl font-light text-foreground mb-2">
              {formatCurrency(totalSpent)}
            </p>
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-ios-footnote text-red-600 font-medium">Gastado real</span>
            </div>
          </div>

          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center space-x-2 mb-4">
              <div className={`w-2 h-2 ${remaining >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full animate-pulse`}></div>
              <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">DISPONIBLE</h3>
            </div>
            <p className={`text-3xl font-light mb-2 ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(remaining)}
            </p>
            <div className="flex items-center space-x-2">
              <TrendingUp className={`h-4 w-4 ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              <span className={`text-ios-footnote font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {remaining >= 0 ? 'Disponible' : 'Sobrepasado'}
              </span>
            </div>
          </div>

          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">ALERTAS</h3>
            </div>
            <p className="text-3xl font-light text-foreground mb-2">
              {overBudgetCount}
            </p>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-ios-footnote text-amber-600 font-medium">Sobrepasados</span>
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
