'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { PeriodSelector } from './period-selector';
import { useRepository } from '@/providers/repository-provider';
import { useAuth } from '@/hooks/use-auth';
import { TimePeriod, formatDateForAPI } from '@/lib/dates/periods';
import { 
  Filter, 
  Search, 
  DollarSign,
  Tag,
  X,
  ArrowUpDown
} from 'lucide-react';

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

export function TransactionFilters({ onFiltersChange, className }: TransactionFiltersProps) {
  const { user } = useAuth();
  const repository = useRepository();
  const [isExpanded, setIsExpanded] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([{ value: '', label: 'Todas las cuentas' }]);
  const [categories, setCategories] = useState<any[]>([{ value: '', label: 'Todas las categorías' }]);
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
    sortBy: 'date_desc',
  });

  // Load accounts and categories from database
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        const [userAccounts, allCategories] = await Promise.all([
          repository.accounts.findByUserId(user.id),
          repository.categories.findAll()
        ]);

        setAccounts([
          { value: '', label: 'Todas las cuentas' },
          ...userAccounts.map(acc => ({ value: acc.id, label: acc.name }))
        ]);

        setCategories([
          { value: '', label: 'Todas las categorías' },
          ...allCategories.map(cat => ({ value: cat.id, label: cat.name }))
        ]);
      } catch (error) {
      }
    };

    loadData();
  }, [user, repository]);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handlePeriodChange = (period: TimePeriod | null) => {
    if (period) {
      const newFilters = {
        ...filters,
        period: period.id,
        dateFrom: formatDateForAPI(period.startDate),
        dateTo: formatDateForAPI(period.endDate)
      };
      setFilters(newFilters);
      onFiltersChange(newFilters);
    } else {
      const newFilters = {
        ...filters,
        period: '',
        dateFrom: '',
        dateTo: ''
      };
      setFilters(newFilters);
      onFiltersChange(newFilters);
    }
  };

  const clearFilters = () => {
    const clearedFilters = {
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
      sortBy: 'date_desc',
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    key !== 'sortBy' && value !== ''
  );

  return (
    <div className={`bg-background-elevated border border-border-primary rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <Filter className="h-5 w-5 text-text-secondary" />
          <h3 className="font-medium text-text-primary">Filtros</h3>
          {hasActiveFilters && (
            <span className="px-2 py-1 bg-accent-primary text-background-primary text-xs rounded-full">
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
              <X className="h-3 w-3 mr-1" />
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
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        <PeriodSelector
          selectedPeriod={filters.period}
          onPeriodChange={handlePeriodChange}
        />
        
        <Select
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          options={transactionTypes}
          placeholder="Tipo"
          className="min-w-[120px]"
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
        <div className="border-t border-border-primary p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              placeholder="Buscar por descripción o nota..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Account and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                label="Monto mínimo"
                type="number"
                placeholder="0.00"
                value={filters.amountMin}
                onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                label="Monto máximo"
                type="number"
                placeholder="0.00"
                value={filters.amountMax}
                onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Custom Date Range (when no period selected) */}
          {!filters.period && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
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
