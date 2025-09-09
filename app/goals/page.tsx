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

// Goals and accounts will be loaded from Supabase database
const mockGoals: SavingsGoal[] = [];
const mockAccounts: any[] = [];

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
      <div className="space-y-8 animate-fade-in">
        {/* iOS-style Header */}
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-muted-foreground mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-ios-caption font-medium">Objetivos</span>
          </div>
          
          <h1 className="text-ios-large-title font-bold mb-6 tracking-tight bg-gradient-to-r from-primary via-green-600 to-emerald-500 bg-clip-text text-transparent">
            🎯 Metas de Ahorro
          </h1>
          <p className="text-muted-foreground font-light mb-6">
            Define y sigue el progreso de tus objetivos financieros
          </p>
          
          {/* Quick Actions Header */}
          <div className="flex items-center justify-center space-x-4 mb-4">
            <button
              onClick={handleNewGoal}
              className="relative px-6 py-3 rounded-xl text-white font-medium shadow-lg overflow-hidden group transition-all duration-300 bg-gradient-to-r from-primary to-green-600 hover:from-green-600 hover:to-primary text-ios-body"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></div>
              <div className="relative flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Nueva Meta</span>
              </div>
            </button>
          </div>
        </div>

        {/* iOS-style Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">TOTAL METAS</h3>
            </div>
            <p className="text-3xl font-light text-foreground mb-2">
              {totalGoals}
            </p>
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-ios-footnote text-blue-600 font-medium">Objetivos</span>
            </div>
          </div>

          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">COMPLETADAS</h3>
            </div>
            <p className="text-3xl font-light text-foreground mb-2">
              {completedGoals}
            </p>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-ios-footnote text-green-600 font-medium">Logradas</span>
            </div>
          </div>

          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">EN PROGRESO</h3>
            </div>
            <p className="text-3xl font-light text-foreground mb-2">
              {activeGoals}
            </p>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-ios-footnote text-blue-600 font-medium">Activas</span>
            </div>
          </div>

          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">VENCIDAS</h3>
            </div>
            <p className="text-3xl font-light text-foreground mb-2">
              {overdueGoals}
            </p>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-ios-footnote text-red-600 font-medium">Retrasadas</span>
            </div>
          </div>
        </div>

        {/* iOS-style Overall Progress */}
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg">
          <div className="flex items-center space-x-2 mb-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="text-ios-title font-semibold text-foreground">Progreso General</h2>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <span className="text-ios-body text-muted-foreground">
              Completado
            </span>
            <span className="text-ios-body font-medium text-foreground">
              {Math.round(overallProgress)}%
            </span>
          </div>
          
          <div className="w-full bg-muted/30 rounded-full h-3 mb-6 overflow-hidden">
            <div 
              className="h-3 bg-gradient-to-r from-primary via-green-500 to-emerald-400 rounded-full transition-all duration-500 ease-out shadow-inner"
              style={{ width: `${Math.min(overallProgress, 100)}%` }}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-ios-caption text-muted-foreground mb-2 tracking-wide">TOTAL AHORRADO</p>
              <p className="text-2xl font-light text-foreground">
                {formatCurrency(totalSaved)}
              </p>
              <div className="flex items-center justify-center space-x-1 mt-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-ios-footnote text-green-600 font-medium">Acumulado</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-ios-caption text-muted-foreground mb-2 tracking-wide">META TOTAL</p>
              <p className="text-2xl font-light text-foreground">
                {formatCurrency(totalTarget)}
              </p>
              <div className="flex items-center justify-center space-x-1 mt-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="text-ios-footnote text-blue-600 font-medium">Objetivo</span>
              </div>
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
