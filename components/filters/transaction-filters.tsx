'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { PeriodSelector } from './period-selector';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { TimePeriod, formatDateForAPI } from '@/lib/dates/periods';
import { Filter, Search, DollarSign, Tag, X, ArrowUpDown } from 'lucide-react';

interface TransactionFiltersProps {
  onFiltersChange: (filters: any) => void;
  className?: string;
}

const transactionTypes = [
  { value: '', label: 'Todos los tipos' },
  { value: 'INCOME', label: 'Ingresos' },
  { value: 'EXPENSE', label: 'Gastos' },
  { value: 'TRANSFER_OUT', label: 'Transferencias Salida' },
  { value: 'TRANSFER_IN', label: 'Transferencias Entrada' },
];

const sortOptions = [
  { value: 'date_desc', label: 'Fecha (Más reciente)' },
  { value: 'date_asc', label: 'Fecha (Más antigua)' },
  { value: 'amount_desc', label: 'Monto (Mayor a menor)' },
  { value: 'amount_asc', label: 'Monto (Menor a mayor)' },
  { value: 'description_asc', label: 'Descripción (A-Z)' },
];

const debtModeOptions = [
  { value: 'ALL', label: 'Deuda: Todas' },
  { value: 'ONLY_DEBT', label: 'Deuda: Solo deudas' },
  { value: 'EXCLUDE_DEBT', label: 'Deuda: Excluir deudas' },
];

export function TransactionFilters({
  onFiltersChange,
  className,
}: TransactionFiltersProps) {
  const { accounts: rawAccounts, categories: rawCategories } =
    useOptimizedData();
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    accountId: '',
    categoryId: '',
    type: '',
    period: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    tags: '',
    debtMode: 'ALL',
    sortBy: 'date_desc',
  });

  // * Debounce filter changes to parent to prevent excessive re-renders/CPU usage
  useEffect(() => {
    const handler = setTimeout(() => {
      onFiltersChange(filters);
    }, 300);

    return () => clearTimeout(handler);
  }, [filters, onFiltersChange]);

  // Memoized accounts and categories options
  const accounts = useMemo(
    () => [
      { value: '', label: 'Todas las cuentas' },
      ...rawAccounts.map((acc) => ({ value: acc.id, label: acc.name })),
    ],
    [rawAccounts]
  );

  const categories = useMemo(
    () => [
      { value: '', label: 'Todas las categorías' },
      ...rawCategories.map((cat) => ({ value: cat.id, label: cat.name })),
    ],
    [rawCategories]
  );

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handlePeriodChange = useCallback((period: TimePeriod | null) => {
    setFilters((prev) =>
      period
        ? {
            ...prev,
            period: period.id,
            dateFrom: formatDateForAPI(period.startDate),
            dateTo: formatDateForAPI(period.endDate),
          }
        : {
            ...prev,
            period: '',
            dateFrom: '',
            dateTo: '',
          }
    );
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      accountId: '',
      categoryId: '',
      type: '',
      period: '',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
      tags: '',
      debtMode: 'ALL',
      sortBy: 'date_desc',
    });
  }, []);

  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => key !== 'sortBy' && value !== ''
  );

  return (
    <div
      className={`overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <Filter className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
          <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
            Filtros
          </h3>
          {hasActiveFilters && (
            <span className="rounded-full bg-primary-600 px-2 py-1 text-xs text-white dark:bg-primary-500">
              Activos
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              <X className="mr-1 h-3 w-3" />
              Limpiar
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Ocultar' : 'Mostrar'} Filtros
          </Button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex touch-manipulation flex-wrap gap-3 px-4 pb-4 md:gap-2">
        <PeriodSelector
          selectedPeriod={filters.period}
          onPeriodChange={handlePeriodChange}
        />

        <Select
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          options={transactionTypes}
          className="min-w-[140px]"
        />

        <Select
          value={filters.debtMode}
          onChange={(e) => handleFilterChange('debtMode', e.target.value)}
          options={debtModeOptions}
          className="min-w-[190px]"
        />

        <Select
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          options={sortOptions}
          className="min-w-[160px]"
        />
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="space-y-4 border-t border-neutral-200 p-4 dark:border-neutral-700">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-neutral-500 dark:text-neutral-400" />
            <Input
              placeholder="Buscar por descripción o nota..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Account and Category */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Cuenta"
              value={filters.accountId}
              onChange={(e) => handleFilterChange('accountId', e.target.value)}
              options={accounts}
            />

            <Select
              label="Categoría"
              value={filters.categoryId}
              onChange={(e) => handleFilterChange('categoryId', e.target.value)}
              options={categories}
            />
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-neutral-500 dark:text-neutral-400" />
              <Input
                label="Monto mínimo"
                type="number"
                placeholder="0.00"
                value={filters.amountMin}
                onChange={(e) =>
                  handleFilterChange('amountMin', e.target.value)
                }
                className="pl-10"
              />
            </div>

            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-neutral-500 dark:text-neutral-400" />
              <Input
                label="Monto máximo"
                type="number"
                placeholder="0.00"
                value={filters.amountMax}
                onChange={(e) =>
                  handleFilterChange('amountMax', e.target.value)
                }
                className="pl-10"
              />
            </div>
          </div>

          {/* Custom Date Range (when no period selected) */}
          {!filters.period && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Fecha desde"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />

              <Input
                label="Fecha hasta"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          )}

          {/* Tags */}
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-neutral-500 dark:text-neutral-400" />
            <Input
              label="Etiquetas"
              placeholder="etiqueta1, etiqueta2..."
              value={filters.tags}
              onChange={(e) => handleFilterChange('tags', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
