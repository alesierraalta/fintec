'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { CategoryForm } from '@/components/forms';
import { CategoryCard } from '@/components/categories';
import { Button } from '@/components/ui';
import { useModal } from '@/hooks';
import { useAuth } from '@/hooks/use-auth';
import { useRepository } from '@/providers/repository-provider';
import type { Category } from '@/types';
import { 
  Plus, 
  Filter,
  Grid3X3,
  List,
  Search,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export default function CategoriesPage() {
  const { isOpen, openModal, closeModal } = useModal();
  const { user } = useAuth();
  const repository = useRepository();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Load categories from database
  useEffect(() => {
    const loadCategories = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const allCategories = await repository.categories.findAll();
        setCategories(allCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, [user, repository]);

  const handleNewCategory = () => {
    setSelectedCategory(null);
    setParentCategoryId(null);
    openModal();
  };

  const handleAddSubcategory = (parentId: string) => {
    setSelectedCategory(null);
    setParentCategoryId(parentId);
    openModal();
  };

  const handleEditCategory = (category: any) => {
    setSelectedCategory(category);
    setParentCategoryId(null);
    openModal();
  };

  const handleDeleteCategory = (categoryId: string) => {
    console.log('Delete category:', categoryId);
    // Aquí implementarías la lógica de eliminación
  };

  const handleCategorySaved = () => {
    closeModal();
    // Reload categories after creating/updating
    const loadCategories = async () => {
      if (!user) return;
      try {
        const allCategories = await repository.categories.findAll();
        setCategories(allCategories);
      } catch (error) {
        console.error('Error reloading categories:', error);
      }
    };
    loadCategories();
  };

  const handleViewCategory = (categoryId: string) => {
    console.log('View category:', categoryId);
    // Aquí podrías navegar a una vista detallada
  };

  // Filter categories
  const filteredCategories = categories.filter(category => {
    const matchesFilter = filter === 'all' || 
      (filter === 'income' && category.kind === 'INCOME') ||
      (filter === 'expense' && category.kind === 'EXPENSE');
    
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  // Calculate statistics (optimized with minimal code)
  const incomeCategories = categories.filter(c => c.kind === 'INCOME');
  const expenseCategories = categories.filter(c => c.kind === 'EXPENSE');

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Categorías</h1>
            <p className="text-gray-400">Organiza tus transacciones por categorías</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-primary-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-primary-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button
              onClick={handleNewCategory}
              icon={<Plus className="h-4 w-4" />}
            >
              Nueva Categoría
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <h3 className="text-sm font-medium text-gray-400">Categorías de Ingresos</h3>
            </div>
            <p className="text-2xl font-bold text-white">{incomeCategories.length}</p>
            <p className="text-sm text-green-400 mt-1">
              Activas
            </p>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-2">
              <TrendingDown className="h-5 w-5 text-red-400" />
              <h3 className="text-sm font-medium text-gray-400">Categorías de Gastos</h3>
            </div>
            <p className="text-2xl font-bold text-white">{expenseCategories.length}</p>
            <p className="text-sm text-red-400 mt-1">
              Activas
            </p>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-2">
              <Filter className="h-5 w-5 text-blue-400" />
              <h3 className="text-sm font-medium text-gray-400">Total Categorías</h3>
            </div>
            <p className="text-2xl font-bold text-white">{categories.length}</p>
            <p className="text-sm text-gray-400 mt-1">
              Disponibles
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar categorías..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Todas ({categories.length})
              </button>
              <button
                onClick={() => setFilter('income')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'income' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Ingresos ({incomeCategories.length})
              </button>
              <button
                onClick={() => setFilter('expense')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'expense' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Gastos ({expenseCategories.length})
              </button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Cargando categorías...</p>
          </div>
        ) : (
          /* Categories Grid/List */
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }>
            {filteredCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
                onView={handleViewCategory}
                onAddSubcategory={handleAddSubcategory}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {filteredCategories.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No se encontraron categorías
            </h3>
            <p className="text-gray-400 mb-4">
              {searchTerm 
                ? `No hay categorías que coincidan con "${searchTerm}"`
                : 'No hay categorías para mostrar con los filtros actuales'
              }
            </p>
            {!searchTerm && (
              <Button
                onClick={handleNewCategory}
                icon={<Plus className="h-4 w-4" />}
              >
                Crear Primera Categoría
              </Button>
            )}
          </div>
        )}
      </div>

      <CategoryForm
        isOpen={isOpen}
        onClose={handleCategorySaved}
        category={selectedCategory}
        parentCategoryId={parentCategoryId}
      />
    </MainLayout>
  );
}
