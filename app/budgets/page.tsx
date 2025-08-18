'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { BudgetForm } from '@/components/forms';
import { BudgetCard } from '@/components/budgets';
import { Button } from '@/components/ui';
import { useModal } from '@/hooks';
import { Plus, TrendingUp, TrendingDown, AlertTriangle, Calendar } from 'lucide-react';
import type { Budget } from '@/types';

// Mock budget data
const mockBudgets: Budget[] = [
  {
    id: '1',
    userId: 'user_1',
    monthYYYYMM: '202412',
    categoryId: '1',
    amountBaseMinor: 80000, // $800.00
    spentMinor: 65000, // $650.00
  },
  {
    id: '2',
    userId: 'user_1',
    monthYYYYMM: '202412',
    categoryId: '2',
    amountBaseMinor: 30000, // $300.00
    spentMinor: 35000, // $350.00
  },
  {
    id: '3',
    userId: 'user_1',
    monthYYYYMM: '202412',
    categoryId: '3',
    amountBaseMinor: 20000, // $200.00
    spentMinor: 12000, // $120.00
  },
  {
    id: '4',
    userId: 'user_1',
    monthYYYYMM: '202412',
    categoryId: '4',
    amountBaseMinor: 15000, // $150.00
    spentMinor: 8000, // $80.00
  },
  {
    id: '5',
    userId: 'user_1',
    monthYYYYMM: '202412',
    categoryId: '5',
    amountBaseMinor: 25000, // $250.00
    spentMinor: 18000, // $180.00
  },
  {
    id: '6',
    userId: 'user_1',
    monthYYYYMM: '202412',
    categoryId: '6',
    amountBaseMinor: 40000, // $400.00
    spentMinor: 32000, // $320.00
  },
];

// Mock categories for display
const mockCategories = [
  { id: '1', name: 'Alimentación', color: '#10b981', icon: 'UtensilsCrossed' },
  { id: '2', name: 'Transporte', color: '#f59e0b', icon: 'Car' },
  { id: '3', name: 'Entretenimiento', color: '#8b5cf6', icon: 'Gamepad2' },
  { id: '4', name: 'Salud', color: '#ef4444', icon: 'Heart' },
  { id: '5', name: 'Educación', color: '#3b82f6', icon: 'GraduationCap' },
  { id: '6', name: 'Hogar', color: '#06b6d4', icon: 'Home' },
];

export default function BudgetsPage() {
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [budgets, setBudgets] = useState(mockBudgets);
  const [selectedMonth, setSelectedMonth] = useState('202412');

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

  const handleSaveBudget = (budgetData: Partial<Budget>) => {
    if (selectedBudget) {
      // Update existing budget
      setBudgets(prev => prev.map(budget => 
        budget.id === selectedBudget.id 
          ? { ...budget, ...budgetData }
          : budget
      ));
    } else {
      // Add new budget
      setBudgets(prev => [...prev, budgetData as Budget]);
    }
  };

  const handleDeleteBudget = (budgetId: string) => {
    setBudgets(prev => prev.filter(budget => budget.id !== budgetId));
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

          {filteredBudgets.length === 0 ? (
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
                const category = mockCategories.find(cat => cat.id === budget.categoryId);
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