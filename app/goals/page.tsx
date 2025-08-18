'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { GoalForm } from '@/components/forms';
import { GoalCard } from '@/components/goals';
import { Button } from '@/components/ui';
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
  Search
} from 'lucide-react';
import type { SavingsGoal } from '@/types';

// Mock goals data
const mockGoals: SavingsGoal[] = [
  {
    id: '1',
    name: 'Casa Nueva',
    description: 'Ahorrar para el enganche de una casa',
    targetBaseMinor: 5000000, // $50,000.00
    currentBaseMinor: 1250000, // $12,500.00
    targetDate: '2025-12-31',
    accountId: '1',
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Fondo de Emergencia',
    description: 'Equivalente a 6 meses de gastos',
    targetBaseMinor: 3000000, // $30,000.00
    currentBaseMinor: 2700000, // $27,000.00
    targetDate: '2024-12-31',
    accountId: '1',
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Vacaciones Europa',
    description: 'Viaje de 2 semanas por Europa',
    targetBaseMinor: 800000, // $8,000.00
    currentBaseMinor: 320000, // $3,200.00
    targetDate: '2025-06-15',
    accountId: '2',
    active: true,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: '4',
    name: 'Auto Nuevo',
    description: 'Reemplazar el auto actual',
    targetBaseMinor: 2500000, // $25,000.00
    currentBaseMinor: 450000, // $4,500.00
    targetDate: '2025-08-01',
    accountId: '3',
    active: true,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: '5',
    name: 'Laptop Nueva',
    description: 'MacBook Pro para trabajo',
    targetBaseMinor: 300000, // $3,000.00
    currentBaseMinor: 300000, // $3,000.00
    targetDate: '2024-11-30',
    accountId: '2',
    active: true,
    createdAt: '2024-09-01T00:00:00Z',
    updatedAt: '2024-11-30T00:00:00Z',
  },
  {
    id: '6',
    name: 'Curso de Especialización',
    description: 'MBA en finanzas',
    targetBaseMinor: 1500000, // $15,000.00
    currentBaseMinor: 200000, // $2,000.00
    targetDate: '2026-01-15',
    accountId: '4',
    active: true,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
];

// Mock accounts for display
const mockAccounts = [
  { id: '1', name: 'Cuenta de Ahorros', type: 'BANK' },
  { id: '2', name: 'Efectivo', type: 'CASH' },
  { id: '3', name: 'Cuenta Corriente', type: 'BANK' },
  { id: '4', name: 'Inversiones', type: 'INVESTMENT' },
];

export default function GoalsPage() {
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [goals, setGoals] = useState(mockGoals);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter goals
  const filteredGoals = goals.filter(goal => {
    const matchesSearch = goal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (goal.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    const isCompleted = goal.currentBaseMinor >= goal.targetBaseMinor;
    const isOverdue = goal.targetDate && new Date(goal.targetDate) < new Date() && !isCompleted;

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

  // Calculate statistics
  const totalGoals = goals.length;
  const completedGoals = goals.filter(goal => goal.currentBaseMinor >= goal.targetBaseMinor).length;
  const activeGoals = goals.filter(goal => 
    goal.active && goal.currentBaseMinor < goal.targetBaseMinor
  ).length;
  const overdueGoals = goals.filter(goal => 
    goal.targetDate && 
    new Date(goal.targetDate) < new Date() && 
    goal.currentBaseMinor < goal.targetBaseMinor
  ).length;

  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetBaseMinor, 0);
  const totalSaved = goals.reduce((sum, goal) => sum + goal.currentBaseMinor, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const handleNewGoal = () => {
    setSelectedGoal(null);
    openModal();
  };

  const handleEditGoal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    openModal();
  };

  const handleSaveGoal = (goalData: Partial<SavingsGoal>) => {
    if (selectedGoal) {
      // Update existing goal
      setGoals(prev => prev.map(goal => 
        goal.id === selectedGoal.id 
          ? { ...goal, ...goalData }
          : goal
      ));
    } else {
      // Add new goal
      setGoals(prev => [...prev, goalData as SavingsGoal]);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(goal => goal.id !== goalId));
  };

  const handleAddMoney = (goalId: string) => {
    // This would typically open a transaction form or modal
    console.log('Add money to goal:', goalId);
    // For demo purposes, add $100 to the goal
    setGoals(prev => prev.map(goal => 
      goal.id === goalId 
        ? { ...goal, currentBaseMinor: goal.currentBaseMinor + 10000 } // Add $100
        : goal
    ));
  };

  const formatCurrency = (amountMinor: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amountMinor / 100);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Metas de Ahorro</h1>
            <p className="text-gray-400">Define y sigue el progreso de tus objetivos financieros</p>
          </div>
          <Button
            onClick={handleNewGoal}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nueva Meta
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total de Metas</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {totalGoals}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Completadas</p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {completedGoals}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">En Progreso</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">
                  {activeGoals}
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
                <p className="text-gray-400 text-sm font-medium">Vencidas</p>
                <p className="text-2xl font-bold text-red-400 mt-1">
                  {overdueGoals}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Progreso General</h3>
            <span className="text-sm text-gray-400">
              {Math.round(overallProgress)}% completado
            </span>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
            <div 
              className="h-4 bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(overallProgress, 100)}%` }}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Ahorrado</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(totalSaved)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Meta Total</p>
              <p className="text-2xl font-bold text-blue-400">
                {formatCurrency(totalTarget)}
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar metas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <h2 className="text-xl font-semibold text-white">
              Tus Metas
            </h2>
            <span className="text-sm text-gray-400">
              {filteredGoals.length} meta{filteredGoals.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filteredGoals.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {searchTerm || filter !== 'all' 
                  ? 'No se encontraron metas'
                  : 'No tienes metas de ahorro'
                }
              </h3>
              <p className="text-gray-400 mb-4">
                {searchTerm || filter !== 'all'
                  ? 'Intenta cambiar los filtros o términos de búsqueda'
                  : 'Crea tu primera meta de ahorro para comenzar a alcanzar tus objetivos financieros'
                }
              </p>
              {!searchTerm && filter === 'all' && (
                <Button
                  onClick={handleNewGoal}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Crear Primera Meta
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredGoals.map((goal) => {
                const account = mockAccounts.find(acc => acc.id === goal.accountId);
                return (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    account={account}
                    onEdit={() => handleEditGoal(goal)}
                    onDelete={() => handleDeleteGoal(goal.id)}
                    onAddMoney={() => handleAddMoney(goal.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <GoalForm
        isOpen={isOpen}
        onClose={closeModal}
        goal={selectedGoal}
        onSave={handleSaveGoal}
      />
    </MainLayout>
  );
}