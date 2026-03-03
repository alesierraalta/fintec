'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MainLayout } from '@/components/layout/main-layout';
import { CategoryCard } from '@/components/categories';
import { Button } from '@/components/ui';
import { formatCurrencyWithBCV } from '@/lib/currency-ves';
import { useCurrencyConverter } from '@/hooks/use-currency-converter';
import { useModal } from '@/hooks';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import type { Category } from '@/types';
import { useRepository } from '@/providers/repository-provider';
import { useAuth } from '@/hooks/use-auth';
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
  RefreshCw,
} from 'lucide-react';
import { FormLoading } from '@/components/ui/suspense-loading';
import { toast } from 'sonner';

const CategoryForm = dynamic(
  () =>
    import('@/components/forms/category-form').then((mod) => mod.CategoryForm),
  { loading: () => <FormLoading />, ssr: false }
);

export default function CategoriesPage() {
  const repository = useRepository();
  const { user } = useAuth();
  const { isOpen, openModal, closeModal } = useModal();

  // Use a single optimized data hook instance
  const optimized = useOptimizedData();
  const {
    categories: rawCategories,
    transactions: rawTransactions,
    invalidateCache,
    loadAllData,
  } = optimized;

  useEffect(() => {
    // Ensure latest real data: clear cache and load everything in parallel
    invalidateCache();
    loadAllData(true);
  }, [invalidateCache, loadAllData]);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState(false);

  // Currency converter (same logic as transactions/accounts)
  const { convertToUSD } = useCurrencyConverter();

  // Memoized categories with transaction statistics
  const categories = useMemo(() => {
    if (!rawCategories || !rawTransactions) return [] as any[];

    // Filter categories to show only user's categories or default categories
    const filteredCategories = rawCategories.filter((category) => {
      // Show default categories to everyone
      if (category.isDefault) return true;

      // Show user's own categories if authenticated
      if (user && category.userId === user.id) return true;

      // Don't show other users' categories
      return false;
    });

    return filteredCategories.map((category) => {
      const categoryTransactions = rawTransactions.filter(
        (t) => t.categoryId === category.id
      );
      const transactionCount = categoryTransactions.length;

      // Totals per currency in minor units
      const totalVESMinor = categoryTransactions
        .filter((t) => t.currencyCode === 'VES')
        .reduce((sum, t) => sum + (t.amountMinor || 0), 0);
      const totalUSDMinor = categoryTransactions
        .filter((t) => t.currencyCode === 'USD')
        .reduce((sum, t) => sum + (t.amountMinor || 0), 0);

      // USD equivalent using shared converter
      const totalEquivUSDMinor = categoryTransactions.reduce((sum, t) => {
        const usd = convertToUSD(t.amountMinor || 0, t.currencyCode);
        return sum + Math.round(usd * 100);
      }, 0);

      return {
        ...category,
        transactionCount,
        totalVESMinor,
        totalUSDMinor,
        totalEquivUSDMinor,
      };
    });
  }, [rawCategories, rawTransactions, convertToUSD, user]);

  const loading = !rawCategories || !rawTransactions;

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

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const canDelete = await repository.categories.canDelete(categoryId);
      if (!canDelete) {
        toast.error(
          'No puedes eliminar esta categoria porque tiene transacciones o subcategorias asociadas.'
        );
        return;
      }

      setCategoryToDelete(categoryId);
    } catch (error) {
      toast.error('No se pudo eliminar la categoria. Intentalo de nuevo.');
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      setDeletingCategory(true);
      await repository.categories.delete(categoryToDelete);
      await loadAllData(true);
      toast.success('Categoria eliminada correctamente');
      setCategoryToDelete(null);
    } catch (error) {
      toast.error('No se pudo eliminar la categoria. Intentalo de nuevo.');
    } finally {
      setDeletingCategory(false);
    }
  };

  const cancelDeleteCategory = () => {
    if (deletingCategory) return;
    setCategoryToDelete(null);
  };

  const handleCategorySaved = () => {
    closeModal();
    // Data is refreshed via optimized loader
    loadAllData(true);
  };

  const handleViewCategory = (categoryId: string) => {
    // Navigate to detailed view if needed
  };

  const handleRefreshStats = () => {
    loadAllData(true);
  };

  // Filter categories
  const filteredCategories = categories.filter((category) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'income' && category.kind === 'INCOME') ||
      (filter === 'expense' && category.kind === 'EXPENSE');

    const matchesSearch = category.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const incomeCategories = categories.filter((c) => c.kind === 'INCOME');
  const expenseCategories = categories.filter((c) => c.kind === 'EXPENSE');

  // Calculate statistics broken down by currency, mirroring /transactions behavior
  const incomeTransactions = (rawTransactions || []).filter(
    (t) => t.type === 'INCOME'
  );
  const expenseTransactions = (rawTransactions || []).filter(
    (t) => t.type === 'EXPENSE'
  );

  const sumMinor = (items: any[], selector: (t: any) => number) =>
    items.reduce((sum, t) => sum + (selector(t) || 0), 0);

  // Convert a single transaction to USD minor using its exchange rate
  const toUsdMinor = (t: any): number => {
    if (!t) return 0;
    // Delegate to shared converter for consistency
    const usdMajor = convertToUSD(t.amountMinor || 0, t.currencyCode);
    return Math.round(usdMajor * 100);
  };

  // Income totals
  const totalIncomeVESMinor = sumMinor(
    incomeTransactions.filter((t) => t.currencyCode === 'VES'),
    (t) => t.amountMinor
  );
  const totalIncomeUSDMinor = sumMinor(
    incomeTransactions.filter((t) => t.currencyCode === 'USD'),
    (t) => t.amountMinor
  );
  const totalIncomeEquivUSDMinor = sumMinor(incomeTransactions, toUsdMinor);

  // Expense totals
  const totalExpensesVESMinor = sumMinor(
    expenseTransactions.filter((t) => t.currencyCode === 'VES'),
    (t) => t.amountMinor
  );
  const totalExpensesUSDMinor = sumMinor(
    expenseTransactions.filter((t) => t.currencyCode === 'USD'),
    (t) => t.amountMinor
  );
  const totalExpensesEquivUSDMinor = sumMinor(expenseTransactions, toUsdMinor);

  return (
    <MainLayout>
      <div className="animate-fade-in space-y-8">
        {/* iOS-style Header */}
        <div className="py-8 text-center">
          <div className="mb-4 inline-flex items-center space-x-2 text-muted-foreground">
            <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500"></div>
            <span className="text-ios-caption font-medium">Organización</span>
          </div>

          <h1 className="mb-6 bg-gradient-to-r from-primary via-purple-600 to-blue-500 bg-clip-text text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-6xl">
            🏷️ Categorías
          </h1>
          <p className="mb-6 font-light text-muted-foreground">
            Organiza tus transacciones por categorías
          </p>

          {/* Quick Actions Header */}
          <div className="mb-4 flex items-center justify-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex rounded-2xl bg-muted/20 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded-xl p-3 transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded-xl p-3 transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Lista
              </button>
            </div>
          </div>
        </div>

        {/* Content would continue here using filteredCategories, totals, etc. */}

        {/* iOS-style Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="group rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
              <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
                INGRESOS
              </h3>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-medium text-foreground">
                Bs. {formatCurrencyWithBCV(totalIncomeVESMinor, 'VES')}
              </p>
              <p className="text-sm text-muted-foreground">VES</p>
              <p className="text-lg font-medium text-foreground">
                {(totalIncomeUSDMinor / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                })}
              </p>
              <p className="text-sm text-muted-foreground">USD</p>
              <p className="text-sm text-green-600">
                Total equiv.:{' '}
                {(totalIncomeEquivUSDMinor / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                })}
              </p>
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-ios-footnote font-medium text-green-600">
                {incomeTransactions.length} ingresos
              </span>
            </div>
          </div>

          <div className="group rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500"></div>
              <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
                GASTOS
              </h3>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-medium text-foreground">
                Bs. {formatCurrencyWithBCV(totalExpensesVESMinor, 'VES')}
              </p>
              <p className="text-sm text-muted-foreground">VES</p>
              <p className="text-lg font-medium text-foreground">
                {(totalExpensesUSDMinor / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                })}
              </p>
              <p className="text-sm text-muted-foreground">USD</p>
              <p className="text-sm text-red-600">
                Total equiv.:{' '}
                {(totalExpensesEquivUSDMinor / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                })}
              </p>
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-ios-footnote font-medium text-red-600">
                {expenseTransactions.length} gastos
              </span>
            </div>
          </div>

          <div className="group rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500"></div>
              <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
                TOTAL
              </h3>
            </div>
            <p className="mb-2 text-3xl font-light text-foreground">
              {categories.length}
            </p>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-purple-600" />
              <span className="text-ios-footnote font-medium text-purple-600">
                Disponibles
              </span>
            </div>
          </div>
        </div>

        {/* iOS-style Filters and Search */}
        <div className="rounded-3xl border border-border/20 bg-card/60 p-6 shadow-lg backdrop-blur-xl">
          <div className="mb-6 flex items-center space-x-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
            <h2 className="text-ios-title font-semibold text-foreground">
              Buscar y Filtrar
            </h2>
          </div>

          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            {/* iOS Search */}
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar categorías..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-border/40 bg-card/80 py-3 pl-12 pr-4 text-foreground placeholder-muted-foreground transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* iOS Filter buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-xl px-4 py-2 text-ios-caption font-medium transition-all duration-200 ${
                  filter === 'all'
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                Todas ({categories.length})
              </button>
              <button
                onClick={() => setFilter('income')}
                className={`rounded-xl px-4 py-2 text-ios-caption font-medium transition-all duration-200 ${
                  filter === 'income'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                Ingresos ({incomeCategories.length})
              </button>
              <button
                onClick={() => setFilter('expense')}
                className={`rounded-xl px-4 py-2 text-ios-caption font-medium transition-all duration-200 ${
                  filter === 'expense'
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                Gastos ({expenseCategories.length})
              </button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
            <p className="text-gray-400">Cargando categorías...</p>
          </div>
        ) : (
          /* Categories Grid/List */
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'
                : 'space-y-4'
            }
          >
            {filteredCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
                onView={handleViewCategory}
                onAddSubcategory={handleAddSubcategory}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {filteredCategories.length === 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <Filter className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              No se encontraron categorías
            </h3>
            <p className="mb-4 text-gray-400">
              {searchTerm
                ? `No hay categorías que coincidan con "${searchTerm}"`
                : 'No hay categorías para mostrar con los filtros actuales'}
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

      {isOpen && (
        <CategoryForm
          isOpen={isOpen}
          onClose={handleCategorySaved}
          category={selectedCategory}
          parentCategoryId={parentCategoryId}
        />
      )}

      {categoryToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
            aria-describedby="delete-category-description"
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card/95 p-6"
          >
            <div className="mb-4 flex items-center space-x-3">
              <div className="rounded-lg bg-destructive/15 p-2">
                <Filter className="h-5 w-5 text-destructive" />
              </div>
              <h3
                id="delete-category-title"
                className="text-lg font-semibold text-foreground"
              >
                Eliminar Categoria
              </h3>
            </div>

            <p
              id="delete-category-description"
              className="mb-6 text-muted-foreground"
            >
              Esta accion eliminara la categoria seleccionada. Esta accion no se
              puede deshacer.
            </p>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={cancelDeleteCategory}
                disabled={deletingCategory}
                className="focus-ring flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-muted/40 px-4 py-2 text-foreground transition-colors hover:bg-muted/60 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                disabled={deletingCategory}
                className="focus-ring flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-destructive px-4 py-2 text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {deletingCategory ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
