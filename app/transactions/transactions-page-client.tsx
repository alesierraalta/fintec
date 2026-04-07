'use client';

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
  useRef,
  useDeferredValue,
  Suspense,
} from 'react';
import dynamic from 'next/dynamic';
import { FormLoading } from '@/components/ui/suspense-loading';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { TransactionFilters } from '@/components/filters/transaction-filters';
import { TransactionActionsDropdown } from '@/components/transactions/transaction-actions-dropdown';
import { TransactionDetailPanel } from '@/components/transactions/transaction-detail-panel';
import { Button } from '@/components/ui';
import { useModal, useMediaQuery } from '@/hooks';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { useCurrencyConverter } from '@/hooks/use-currency-converter';
import { useActiveUsdVesRate } from '@/lib/rates';
import { useAppStore } from '@/lib/store';
import type { Transaction, TransactionType } from '@/types/domain';
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  Download,
  Trash2,
  Sparkles,
  Filter,
  Edit,
  ArrowRight,
} from 'lucide-react';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { SwipeableCard } from '@/components/ui/swipeable-card';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';

const TransactionForm = dynamic(
  () =>
    import('@/components/forms/transaction-form').then(
      (mod) => mod.TransactionForm
    ),
  { loading: () => <FormLoading />, ssr: false }
);

const ITEMS_PER_PAGE = 50;

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  VES: 'Bs.',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  BRL: 'R$',
  PEN: 'S/',
  MXN: 'MX$',
  ARS: 'AR$',
  COP: 'CO$',
  CLP: 'CL$',
};

export default function TransactionsPage() {
  // Detail panel state
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [selectedDetailTransaction, setSelectedDetailTransaction] =
    useState<Transaction | null>(null);
  const router = useRouter();
  const { isOpen, openModal, closeModal } = useModal();
  const {
    transactions,
    accounts,
    categories,
    loading,
    loadAllData,
    deleteTransaction,
  } = useOptimizedData();
  const { convert, convertToUSD } = useCurrencyConverter();
  const activeUsdVes = useActiveUsdVesRate();
  const selectedRateSource = useAppStore((s) => s.selectedRateSource);

  const convertMinorToUSDSelected = useCallback(
    (amountMinor: number, currencyCode: string) => {
      if (!amountMinor || !isFinite(amountMinor)) return 0;
      const amount = amountMinor / 100;
      if (currencyCode === 'USD') return amount;
      if (currencyCode === 'VES') {
        return activeUsdVes > 0 ? amount / activeUsdVes : 0;
      }
      // Fallback for other currencies to existing converter
      return convertToUSD(amountMinor, currencyCode);
    },
    [activeUsdVes, convertToUSD]
  );

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [filters, setFilters] = useState<{
    search?: string;
    type?: TransactionType;
    accountId?: string;
    categoryId?: string;
    sortBy?: string;
    dateFrom?: string;
    dateTo?: string;
    amountMin?: string;
    amountMax?: string;
    tags?: string;
    debtMode?: 'ALL' | 'ONLY_DEBT' | 'EXCLUDE_DEBT';
  }>({});

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteModal(true);
  };

  // Virtual pagination state
  const ITEMS_PER_PAGE = 50;
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Memoized filtered transactions
  const filteredTransactionsMemo = useMemo(() => {
    let filtered = [...transactions];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description?.toLowerCase().includes(searchTerm) ||
          t.note?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply account filter
    if (filters.accountId) {
      filtered = filtered.filter((t) => t.accountId === filters.accountId);
    }

    // Apply category filter
    if (filters.categoryId) {
      filtered = filtered.filter((t) => t.categoryId === filters.categoryId);
    }

    // Apply type filter
    if (filters.type) {
      filtered = filtered.filter((t) => t.type === filters.type);
    }

    // Apply date range filter
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter((t) => {
        // * Optimize date comparison: Compare strings directly (YYYY-MM-DD is sortable)
        // instead of creating Date objects for every item
        const transactionDate = t.date;
        const fromDate = filters.dateFrom;
        const toDate = filters.dateTo;

        if (fromDate && transactionDate < fromDate) return false;
        if (toDate && transactionDate > toDate) return false;
        return true;
      });
    }

    // Apply amount filters
    if (filters.amountMin) {
      const minAmount = parseFloat(filters.amountMin) * 100;
      filtered = filtered.filter((t) => Math.abs(t.amountMinor) >= minAmount);
    }

    if (filters.amountMax) {
      const maxAmount = parseFloat(filters.amountMax) * 100;
      filtered = filtered.filter((t) => Math.abs(t.amountMinor) <= maxAmount);
    }

    // Apply tags filter
    if (filters.tags) {
      const tags = filters.tags
        .split(',')
        .map((tag: string) => tag.trim())
        .filter(Boolean);
      if (tags.length > 0) {
        filtered = filtered.filter((t) =>
          t.tags?.some((tag) => tags.includes(tag))
        );
      }
    }

    if (filters.debtMode === 'ONLY_DEBT') {
      filtered = filtered.filter((t) => t.isDebt === true);
    }

    if (filters.debtMode === 'EXCLUDE_DEBT') {
      filtered = filtered.filter((t) => t.isDebt !== true);
    }

    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'date_desc':
            // * Optimization: String comparison is much faster than Date parsing
            return b.date.localeCompare(a.date);
          case 'date_asc':
            return a.date.localeCompare(b.date);
          case 'amount_desc':
            return Math.abs(b.amountMinor) - Math.abs(a.amountMinor);
          case 'amount_asc':
            return Math.abs(a.amountMinor) - Math.abs(b.amountMinor);
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [transactions, filters]);

  // * Use deferred value for the filtered list to keep UI responsive during heavy filtering
  // This allows the browser to prioritize input updates (typing) over list rendering
  const deferredFilteredTransactions = useDeferredValue(
    filteredTransactionsMemo
  );

  // Visible transactions for virtual pagination
  // * Derived from deferred list
  const visibleTransactions = useMemo(
    () => deferredFilteredTransactions.slice(0, displayedCount),
    [deferredFilteredTransactions, displayedCount]
  );

  // Load more function for infinite scroll
  const loadMore = useCallback(() => {
    setDisplayedCount((prev) =>
      Math.min(prev + ITEMS_PER_PAGE, filteredTransactionsMemo.length)
    );
  }, [filteredTransactionsMemo.length]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          displayedCount < filteredTransactionsMemo.length
        ) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [loadMore, displayedCount, filteredTransactionsMemo.length]);

  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [filters]);

  // Helper functions memoized
  const getAccountName = useCallback(
    (id?: string) => accounts.find((a) => a.id === id)?.name || 'Cuenta',
    [accounts]
  );

  const getCategoryName = useCallback(
    (id?: string) => categories.find((c) => c.id === id)?.name || 'Categoría',
    [categories]
  );

  const formatAmount = useCallback((minor: number) => {
    if (!minor || isNaN(minor) || !isFinite(minor)) {
      return '0.00';
    }
    return (minor / 100).toFixed(2);
  }, []);

  const getCurrencySymbol = useCallback((currencyCode: string) => {
    return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  }, []);

  // Optimized filter handler
  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, []);

  // Optimized sorting handler
  const sortTransactions = useCallback(
    (sortBy: string) => {
      setFilters((prev) => ({ ...prev, sortBy }));
    },
    [setFilters]
  );

  const handleNewTransaction = useCallback(
    () => router.push('/transactions/add'),
    [router]
  );

  const handleEditTransaction = useCallback(
    (t: Transaction) => {
      setSelectedTransaction(t);
      openModal();
    },
    [openModal]
  );
  const handleDeleteTransaction = useCallback((t: Transaction) => {
    setTransactionToDelete(t);
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!transactionToDelete) return;

    try {
      setDeleting(true);
      await deleteTransaction(transactionToDelete.id);

      // Close modal
      setShowDeleteModal(false);
      setTransactionToDelete(null);
    } catch (error) {
      toast.error('Error al eliminar la transaccion');
    } finally {
      setDeleting(false);
    }
  }, [transactionToDelete, deleteTransaction]);

  const cancelDelete = useCallback(() => setShowDeleteModal(false), []);

  const handleTransactionUpdated = useCallback(() => {
    // Rely on useOptimizedData cache invalidation
  }, []);

  const getIcon = useCallback((type: string) => {
    switch (type) {
      case 'INCOME':
        return <ArrowDownLeft className="h-4 w-4 text-success" />;
      case 'EXPENSE':
        return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      case 'TRANSFER_OUT':
      case 'TRANSFER_IN':
        return <Repeat className="h-4 w-4 text-primary" />;
      default:
        return <ArrowUpRight className="h-4 w-4 text-muted-foreground" />;
    }
  }, []);

  const getAmountColor = useCallback((type: string) => {
    switch (type) {
      case 'INCOME':
        return 'text-success';
      case 'EXPENSE':
        return 'text-destructive';
      case 'TRANSFER_OUT':
      case 'TRANSFER_IN':
        return 'text-primary';
      default:
        return 'text-muted-foreground';
    }
  }, []);

  const getTypeLabel = useCallback((type: string) => {
    switch (type) {
      case 'INCOME':
        return 'Ingreso';
      case 'EXPENSE':
        return 'Gasto';
      case 'TRANSFER_OUT':
        return 'Transferencia Salida';
      case 'TRANSFER_IN':
        return 'Transferencia Entrada';
      default:
        return type;
    }
  }, []);

  // Calcular totales por moneda
  const totalesPorMoneda = useMemo(() => {
    const resultado: Record<string, { income: number; expenses: number }> = {};

    filteredTransactionsMemo.forEach((t) => {
      const currency = t.currencyCode || 'USD';
      if (!resultado[currency]) {
        resultado[currency] = { income: 0, expenses: 0 };
      }

      const amount = (t.amountMinor || 0) / 100;
      if (t.type === 'INCOME') {
        resultado[currency].income += amount;
      } else if (t.type === 'EXPENSE') {
        resultado[currency].expenses += amount;
      }
    });

    return resultado;
  }, [filteredTransactionsMemo]);

  // Convertir a USD para mostrar equivalente
  const totalesEnUSD = useMemo(() => {
    let totalIncomeUSD = 0;
    let totalExpensesUSD = 0;

    Object.entries(totalesPorMoneda).forEach(([currency, totals]) => {
      totalIncomeUSD += convertMinorToUSDSelected(
        Math.round(totals.income * 100),
        currency
      );
      totalExpensesUSD += convertMinorToUSDSelected(
        Math.round(totals.expenses * 100),
        currency
      );
    });

    return {
      income: totalIncomeUSD,
      expenses: totalExpensesUSD,
      net: totalIncomeUSD - totalExpensesUSD,
    };
  }, [totalesPorMoneda, convertMinorToUSDSelected]);

  const handleTransactionClick = useCallback((transaction: Transaction) => {
    setSelectedDetailTransaction(transaction);
    setDetailPanelOpen(true);
  }, []);

  const showTransactionsLoading =
    loading && filteredTransactionsMemo.length === 0;

  return (
    <>
      <MainLayout>
        <div className="animate-fade-in space-y-8">
          {/* iOS-style Header */}
          <div className="py-8 text-center">
            <div className="mb-4 inline-flex items-center space-x-2 text-muted-foreground">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
              <span className="text-ios-caption font-medium">Tus finanzas</span>
            </div>

            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-6xl">
              <span className="mr-2">💳</span>
              <span className="bg-gradient-to-r from-primary via-blue-600 to-green-500 bg-clip-text text-transparent">
                Transacciones
              </span>
            </h1>
            <p className="mb-6 font-light text-muted-foreground">
              Controla todos tus ingresos y gastos
            </p>

            {/* Quick Actions Header - Hidden on mobile (FAB replaces it) */}
            <div className="mb-4 hidden items-center justify-center space-x-4 sm:flex">
              <button
                type="button"
                onClick={handleNewTransaction}
                className="focus-ring group relative min-h-[44px] overflow-hidden rounded-xl bg-gradient-to-r from-primary to-blue-600 px-6 py-3 text-ios-body font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-600 hover:to-primary"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:animate-pulse group-hover:opacity-20"></div>
                <div className="relative flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span>Nueva Transacción</span>
                </div>
              </button>
            </div>
          </div>

          {/* iOS-style Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="group rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
              <div className="mb-4 flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
                  TOTAL INGRESOS
                </h3>
              </div>

              {/* Desglose por moneda */}
              <div className="mb-3 space-y-2">
                {Object.entries(totalesPorMoneda).map(
                  ([currency, totals]) =>
                    totals.income > 0 && (
                      <div
                        key={`income-${currency}`}
                        className="flex items-baseline justify-between"
                      >
                        <span className="amount-positive text-2xl">
                          {getCurrencySymbol(currency)}
                          {totals.income.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {currency}
                        </span>
                      </div>
                    )
                )}
                {Object.keys(totalesPorMoneda).every(
                  (currency) => totalesPorMoneda[currency].income === 0
                ) && <p className="amount-positive text-2xl">$0.00</p>}
              </div>

              {/* Total en USD */}
              {Object.keys(totalesPorMoneda).length > 1 && (
                <div className="mt-3 border-t border-border/20 pt-3">
                  <span className="text-xs text-muted-foreground">
                    Total equiv.:
                  </span>
                  <p className="amount-positive text-lg">
                    $
                    {totalesEnUSD.income.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    USD
                  </p>
                </div>
              )}

              <div className="mt-3 flex items-center space-x-2">
                <ArrowDownLeft className="h-4 w-4 text-green-600" />
                <span className="text-ios-footnote font-medium text-green-600">
                  Ingresos
                </span>
              </div>
            </div>

            <div className="group rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
              <div className="mb-4 flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-red-500"></div>
                <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
                  TOTAL GASTOS
                </h3>
              </div>

              {/* Desglose por moneda */}
              <div className="mb-3 space-y-2">
                {Object.entries(totalesPorMoneda).map(
                  ([currency, totals]) =>
                    totals.expenses > 0 && (
                      <div
                        key={`expense-${currency}`}
                        className="flex items-baseline justify-between"
                      >
                        <span className="amount-negative text-2xl">
                          {getCurrencySymbol(currency)}
                          {totals.expenses.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {currency}
                        </span>
                      </div>
                    )
                )}
                {Object.keys(totalesPorMoneda).every(
                  (currency) => totalesPorMoneda[currency].expenses === 0
                ) && <p className="amount-negative text-2xl">$0.00</p>}
              </div>

              {/* Total en USD */}
              {Object.keys(totalesPorMoneda).length > 1 && (
                <div className="mt-3 border-t border-border/20 pt-3">
                  <span className="text-xs text-muted-foreground">
                    Total equiv.:
                  </span>
                  <p className="amount-negative text-lg">
                    $
                    {totalesEnUSD.expenses.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    USD
                  </p>
                </div>
              )}

              <div className="mt-3 flex items-center space-x-2">
                <ArrowUpRight className="h-4 w-4 text-red-600" />
                <span className="text-ios-footnote font-medium text-red-600">
                  Gastos
                </span>
              </div>
            </div>

            <div className="group rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
              <div className="mb-4 flex items-center space-x-2">
                <div
                  className={`h-2 w-2 ${totalesEnUSD.net >= 0 ? 'bg-green-500' : 'bg-red-500'} animate-pulse rounded-full`}
                ></div>
                <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
                  BALANCE NETO
                </h3>
              </div>

              {/* Desglose por moneda */}
              <div className="mb-3 space-y-2">
                {Object.entries(totalesPorMoneda).map(([currency, totals]) => {
                  const net = totals.income - totals.expenses;
                  if (net === 0) return null;
                  return (
                    <div
                      key={`net-${currency}`}
                      className="flex items-baseline justify-between"
                    >
                      <span
                        className={`text-2xl ${net >= 0 ? 'amount-positive' : 'amount-negative'}`}
                      >
                        {net >= 0 ? '+' : ''}
                        {getCurrencySymbol(currency)}
                        {net.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {currency}
                      </span>
                    </div>
                  );
                })}
                {Object.keys(totalesPorMoneda).length === 0 && (
                  <p className="text-2xl font-light text-foreground">$0.00</p>
                )}
              </div>

              {/* Total en USD */}
              {Object.keys(totalesPorMoneda).length > 1 && (
                <div className="mt-3 border-t border-border/20 pt-3">
                  <span className="text-xs text-muted-foreground">
                    Total equiv.:
                  </span>
                  <p
                    className={`text-lg ${totalesEnUSD.net >= 0 ? 'amount-positive' : 'amount-negative'}`}
                  >
                    {totalesEnUSD.net >= 0 ? '+' : ''}$
                    {totalesEnUSD.net.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    USD
                  </p>
                </div>
              )}

              <div className="mt-3 flex items-center space-x-2">
                {totalesEnUSD.net >= 0 ? (
                  <ArrowDownLeft className="h-4 w-4 text-green-600" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-red-600" />
                )}
                <span
                  className={`text-ios-footnote font-medium ${totalesEnUSD.net >= 0 ? 'amount-positive' : 'amount-negative'}`}
                >
                  {totalesEnUSD.net >= 0 ? 'Positivo' : 'Negativo'}
                </span>
              </div>
            </div>

            <div className="group rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
              <div className="mb-4 flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
                <h3 className="text-ios-caption font-medium tracking-wide text-muted-foreground">
                  TRANSACCIONES
                </h3>
              </div>
              <p className="amount-emphasis-white mb-2 text-3xl text-white">
                {filteredTransactionsMemo.length}
              </p>
              <div className="flex items-center space-x-2">
                <Repeat className="h-4 w-4 text-blue-600" />
                <span className="text-ios-footnote font-medium text-blue-600">
                  Total
                </span>
              </div>
            </div>
          </div>

          {/* Collapsible Filters */}
          <CollapsibleSection
            title="🔍 Filtros"
            storageKey="transactions-filters"
            collapseOnMobile={true}
            defaultExpanded={false}
            icon={<Filter className="h-5 w-5" />}
          >
            <TransactionFilters onFiltersChange={handleFiltersChange} />
          </CollapsibleSection>

          {/* iOS-style Transactions List */}
          <div className="overflow-hidden rounded-3xl border border-border/40 bg-card/90 shadow-lg backdrop-blur-xl">
            <div className="border-b border-border/40 p-6">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
                <h3 className="text-ios-title font-semibold text-foreground">
                  Todas las Transacciones ({filteredTransactionsMemo.length})
                </h3>
              </div>
              <div className="transactions-mobile-swipe-hint sm:hidden">
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
                <span>Desliza una fila para ver acciones</span>
              </div>
            </div>

            <div className="divide-y divide-border/40">
              {showTransactionsLoading ? (
                <div className="p-8 text-center">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                  <p className="text-ios-body text-muted-foreground">
                    ✨ Cargando transacciones...
                  </p>
                </div>
              ) : filteredTransactionsMemo.length === 0 ? (
                <EmptyState
                  title="¡Comienza tu Gestión Financiera!"
                  description="Crea tu primera transacción para empezar a controlar tus ingresos y gastos"
                  icon={<div className="text-4xl">💳</div>}
                  actionLabel="Crear Primera Transacción"
                  onAction={handleNewTransaction}
                />
              ) : (
                visibleTransactions.map((transaction) => {
                  const swipeActions = [
                    {
                      label: 'Editar',
                      icon: <Edit className="mb-1 h-5 w-5" />,
                      onClick: () => handleEditTransaction(transaction),
                      color: 'amber' as const,
                    },
                    {
                      label: 'Eliminar',
                      icon: <Trash2 className="mb-1 h-5 w-5" />,
                      onClick: () => handleDeleteClick(transaction),
                      color: 'red' as const,
                    },
                  ];

                  return (
                    <div
                      key={transaction.id}
                      className="content-visibility-auto"
                    >
                      <SwipeableCard
                        actions={swipeActions}
                        onClick={() => handleTransactionClick(transaction)}
                        showSwipeHint={false}
                        className="cursor-pointer border-l-0 p-4 transition-all duration-200 hover:border-l-4 hover:border-l-primary/40 hover:bg-card/60 sm:p-6"
                      >
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 flex-1 items-start space-x-3 overflow-hidden">
                            <div className="flex-shrink-0 rounded-2xl bg-muted/20 p-3 transition-colors duration-200 group-hover:bg-primary/10">
                              {getIcon(transaction.type)}
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <h4 className="mb-2 truncate text-ios-body font-medium text-foreground">
                                {transaction.description || 'Sin descripción'}
                              </h4>

                              {/* Desktop info */}
                              <div className="hidden items-center space-x-2 overflow-hidden text-ios-caption text-muted-foreground sm:flex">
                                <span className="flex-shrink-0">
                                  {getTypeLabel(transaction.type)}
                                </span>
                                {transaction.isDebt === true && (
                                  <>
                                    <div className="h-1 w-1 rounded-full bg-amber-500"></div>
                                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-700">
                                      {transaction.debtDirection === 'OWE'
                                        ? 'Deuda: Debo'
                                        : transaction.debtDirection ===
                                            'OWED_TO_ME'
                                          ? 'Deuda: Me deben'
                                          : 'Deuda'}
                                    </span>
                                    {transaction.debtStatus && (
                                      <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                                        {transaction.debtStatus === 'SETTLED'
                                          ? 'Saldada'
                                          : 'Abierta'}
                                      </span>
                                    )}
                                  </>
                                )}
                                <div className="h-1 w-1 rounded-full bg-muted-foreground"></div>
                                <span className="break-words">
                                  {getCategoryName(transaction.categoryId)}
                                </span>
                                <div className="h-1 w-1 rounded-full bg-muted-foreground"></div>
                                <span className="break-words">
                                  {getAccountName(transaction.accountId)}
                                </span>
                                <div className="h-1 w-1 rounded-full bg-muted-foreground"></div>
                                <span className="flex-shrink-0">
                                  {transaction.date}
                                </span>
                              </div>

                              {/* Mobile info - stacked */}
                              <div className="space-y-1 text-ios-caption text-muted-foreground sm:hidden">
                                <div className="flex min-w-0 items-center space-x-2">
                                  <span className="flex-shrink-0">
                                    {getTypeLabel(transaction.type)}
                                  </span>
                                  {transaction.isDebt === true && (
                                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-700">
                                      {transaction.debtDirection === 'OWE'
                                        ? 'Debo'
                                        : transaction.debtDirection ===
                                            'OWED_TO_ME'
                                          ? 'Me deben'
                                          : 'Deuda'}
                                    </span>
                                  )}
                                  <div className="h-1 w-1 rounded-full bg-muted-foreground"></div>
                                  <span className="min-w-0 truncate">
                                    {getCategoryName(transaction.categoryId)}
                                  </span>
                                </div>
                                <div className="flex min-w-0 items-center space-x-2">
                                  <span className="min-w-0 truncate">
                                    {getAccountName(transaction.accountId)}
                                  </span>
                                  <div className="h-1 w-1 rounded-full bg-muted-foreground"></div>
                                  <span className="flex-shrink-0">
                                    {transaction.date}
                                  </span>
                                </div>
                              </div>

                              {transaction.tags &&
                                transaction.tags.length > 0 && (
                                  <div className="mt-2 flex items-center space-x-1 overflow-x-auto">
                                    {transaction.tags.map((tag) => (
                                      <span
                                        key={tag}
                                        className="flex-shrink-0 rounded-full bg-muted/60 px-2 py-1 text-xs text-muted-foreground"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>

                          <div className="ml-0 flex flex-shrink-0 items-start space-x-2 self-end sm:ml-4 sm:space-x-4">
                            <div className="text-right">
                              <p
                                className={`truncate text-sm font-semibold sm:text-xl ${transaction.type === 'INCOME' ? 'amount-positive' : transaction.type === 'EXPENSE' ? 'amount-negative' : 'amount-emphasis-white'}`}
                              >
                                {transaction.type === 'INCOME'
                                  ? '+'
                                  : transaction.type === 'EXPENSE'
                                    ? '-'
                                    : ''}
                                {getCurrencySymbol(transaction.currencyCode)}
                                {formatAmount(
                                  transaction.amountMinor &&
                                    !isNaN(transaction.amountMinor)
                                    ? Math.abs(transaction.amountMinor)
                                    : 0
                                )}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {transaction.currencyCode}
                              </span>
                              {/* Selected rate equivalence */}
                              {(transaction.currencyCode === 'VES' ||
                                transaction.currencyCode === 'USD') && (
                                <div className="mt-1 text-[11px] text-muted-foreground/70">
                                  {(() => {
                                    const usd = convertMinorToUSDSelected(
                                      Math.abs(transaction.amountMinor || 0),
                                      transaction.currencyCode
                                    );
                                    return `≈ $${usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD · ${selectedRateSource.toUpperCase()}`;
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </SwipeableCard>
                    </div>
                  );
                })
              )}

              {/* Infinite scroll sentinel */}
              {displayedCount < filteredTransactionsMemo.length && (
                <div ref={sentinelRef} className="p-4 text-center">
                  <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">
                    Cargando más transacciones...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {isOpen && (
          <TransactionForm
            isOpen={isOpen}
            onClose={closeModal}
            transaction={selectedTransaction}
            onSuccess={handleTransactionUpdated}
            type={(selectedTransaction?.type || 'EXPENSE') as TransactionType}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && transactionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            {/* * Modal with max-height for mobile scrolling */}
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-transaction-title"
              aria-describedby="delete-transaction-description"
              className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl border border-border/60 bg-card/95 p-6"
            >
              <div className="mb-4 flex items-center space-x-3">
                <div className="rounded-lg bg-destructive/15 p-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <h3
                  id="delete-transaction-title"
                  className="text-lg font-semibold text-foreground"
                >
                  Eliminar Transacción
                </h3>
              </div>

              <div className="mb-6">
                <p
                  id="delete-transaction-description"
                  className="mb-2 text-muted-foreground"
                >
                  ¿Estás seguro de que deseas eliminar esta transacción?
                </p>
                <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                  <p className="font-medium text-foreground">
                    {transactionToDelete.description || 'Sin descripción'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatAmount(transactionToDelete.amountMinor)} •{' '}
                    {transactionToDelete.date}
                  </p>
                </div>
                <p className="mt-2 text-sm text-destructive">
                  Esta acción no se puede deshacer.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={cancelDelete}
                  disabled={deleting}
                  className="focus-ring flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-muted/40 px-4 py-2 text-foreground transition-colors hover:bg-muted/60 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="focus-ring flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-destructive px-4 py-2 text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                >
                  {deleting ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    'Eliminar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </MainLayout>
      {/* Transaction Detail Panel */}
      {selectedDetailTransaction && (
        <TransactionDetailPanel
          transaction={selectedDetailTransaction}
          isOpen={detailPanelOpen}
          onClose={() => setDetailPanelOpen(false)}
          onEdit={(t) => {
            setDetailPanelOpen(false);
            handleEditTransaction(t);
          }}
          isMobile={isMobile}
          accountName={getAccountName(selectedDetailTransaction.accountId)}
          categoryName={getCategoryName(selectedDetailTransaction.categoryId)}
          formatAmount={formatAmount}
          getCurrencySymbol={getCurrencySymbol}
        />
      )}
    </>
  );
}
