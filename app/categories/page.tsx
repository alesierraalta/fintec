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
  TrendingDown,
  ShoppingCart,
  Home,
  Car,
  Coffee,
  Gamepad2,
  Heart,
  PiggyBank,
  Briefcase,
  Gift,
  Plane,
  CreditCard,
  Wallet,
  GraduationCap,
  RefreshCw
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



  // Helper function to enrich categories with transaction statistics
  const enrichCategoriesWithStats = async (categories: Category[]) => {
    const enrichedCategories = await Promise.all(
      categories.map(async (category) => {
        try {
          const [transactionCount, totalAmount] = await Promise.all([
            repository.categories.getUsageCount(category.id),
            repository.transactions.getTotalByCategoryId(category.id)
          ]);
          
          return {
            ...category,
            transactionCount,
            totalAmount
          };
        } catch (error) {
          console.error(`Error enriching category ${category.id}:`, error);
          return {
            ...category,
            transactionCount: 0,
            totalAmount: 0
          };
        }
      })
    );
    
    return enrichedCategories;
  };

  // Load categories from database
  useEffect(() => {
    const loadCategories = async () => {
      if (!user) return;
      try {
        setLoading(true);
        
        let allCategories = await repository.categories.findAll();
        
        // If no categories exist, trigger migration
        if (allCategories.length === 0) {
          try {
            const response = await fetch('/api/migrate-categories', { method: 'POST' });
            const result = await response.json();
            
            // Reload categories after migration
            allCategories = await repository.categories.findAll();
          } catch (migrationError) {
            setCategories([]);
            return;
          }
        }

        // Enrich categories with transaction statistics
        const enrichedCategories = await enrichCategoriesWithStats(allCategories);
        setCategories(enrichedCategories);
        
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, [user, repository]);

  // Auto-refresh when user navigates back to this page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && categories.length > 0) {
        // Page became visible, refresh statistics
        handleRefreshStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, categories.length]);

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
    // Aquí implementarías la lógica de eliminación
  };

  const handleCategorySaved = () => {
    closeModal();
    // Reload categories with statistics after creating/updating
    const loadCategories = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const allCategories = await repository.categories.findAll();
        const enrichedCategories = await enrichCategoriesWithStats(allCategories);
        setCategories(enrichedCategories);
      } catch (error) {
        console.error('Error reloading categories:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  };

  const handleViewCategory = (categoryId: string) => {
    // Aquí podrías navegar a una vista detallada
  };

  const handleRefreshStats = async () => {
    if (!user || loading) return;
    
    try {
      setLoading(true);
      const enrichedCategories = await enrichCategoriesWithStats(categories.map(cat => ({
        ...cat,
        transactionCount: undefined,
        totalAmount: undefined
      })));
      setCategories(enrichedCategories);
    } catch (error) {
      console.error('Error refreshing category statistics:', error);
    } finally {
      setLoading(false);
    }
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
      <div className="space-y-8 animate-fade-in">
        {/* iOS-style Header */}
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-muted-foreground mb-4">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            <span className="text-ios-caption font-medium">Organización</span>
          </div>
          
          <h1 className="text-ios-large-title font-bold mb-6 tracking-tight bg-gradient-to-r from-primary via-purple-600 to-blue-500 bg-clip-text text-transparent">
            🏷️ Categorías
          </h1>
          <p className="text-muted-foreground font-light mb-6">
            Organiza tus transacciones por categorías
          </p>
          
          {/* Quick Actions Header */}
          <div className="flex items-center justify-center space-x-4 mb-4">
            {/* View Mode Toggle */}
            <div className="flex bg-muted/20 rounded-2xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  viewMode === 'grid' 
                    ? 'bg-primary text-white shadow-lg' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  viewMode === 'list' 
                    ? 'bg-primary text-white shadow-lg' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            
            <button
              onClick={handleRefreshStats}
              disabled={loading}
              className="px-4 py-2 rounded-xl transition-all duration-200 flex items-center space-x-2 bg-muted hover:bg-muted/80 text-muted-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Actualizar</span>
            </button>
            
            <button
              onClick={handleNewCategory}
              className="relative px-6 py-3 rounded-xl text-white font-medium shadow-lg overflow-hidden group transition-all duration-300 bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary text-ios-body"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></div>
              <div className="relative flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Nueva Categoría</span>
              </div>
            </button>
          </div>
        </div>

        {/* iOS-style Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">INGRESOS</h3>
            </div>
            <p className="text-3xl font-light text-foreground mb-2">{incomeCategories.length}</p>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-ios-footnote text-green-600 font-medium">Categorías activas</span>
            </div>
          </div>
          
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">GASTOS</h3>
            </div>
            <p className="text-3xl font-light text-foreground mb-2">{expenseCategories.length}</p>
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-ios-footnote text-red-600 font-medium">Categorías activas</span>
            </div>
          </div>
          
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">TOTAL</h3>
            </div>
            <p className="text-3xl font-light text-foreground mb-2">{categories.length}</p>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-purple-600" />
              <span className="text-ios-footnote text-purple-600 font-medium">Disponibles</span>
            </div>
          </div>
        </div>

        {/* iOS-style Filters and Search */}
        <div className="bg-card/60 backdrop-blur-xl rounded-3xl p-6 border border-border/20 shadow-lg">
          <div className="flex items-center space-x-2 mb-6">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <h2 className="text-ios-title font-semibold text-foreground">Buscar y Filtrar</h2>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* iOS Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar categorías..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-card/80 border border-border/40 rounded-2xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
              />
            </div>

            {/* iOS Filter buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl text-ios-caption font-medium transition-all duration-200 ${
                  filter === 'all' 
                    ? 'bg-primary text-white shadow-lg' 
                    : 'bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                Todas ({categories.length})
              </button>
              <button
                onClick={() => setFilter('income')}
                className={`px-4 py-2 rounded-xl text-ios-caption font-medium transition-all duration-200 ${
                  filter === 'income' 
                    ? 'bg-green-600 text-white shadow-lg' 
                    : 'bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                Ingresos ({incomeCategories.length})
              </button>
              <button
                onClick={() => setFilter('expense')}
                className={`px-4 py-2 rounded-xl text-ios-caption font-medium transition-all duration-200 ${
                  filter === 'expense' 
                    ? 'bg-red-600 text-white shadow-lg' 
                    : 'bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40'
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
