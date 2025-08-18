'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { 
  Filter, 
  Search, 
  Calendar,
  DollarSign,
  Tag,
  X,
  ArrowUpDown
} from 'lucide-react';

interface TransactionFiltersProps {
  onFiltersChange: (filters: any) => void;
  className?: string;
}

const accounts = [
  { value: '', label: 'Todas las cuentas' },
  { value: 'acc1', label: 'Cuenta Principal' },
  { value: 'acc2', label: 'Tarjeta de Crédito' },
  { value: 'acc3', label: 'Cuenta de Ahorros' },
  { value: 'acc4', label: 'Efectivo' },
];

const categories = [
  { value: '', label: 'Todas las categorías' },
  { value: 'cat1', label: 'Alimentación' },
  { value: 'cat2', label: 'Transporte' },
  { value: 'cat3', label: 'Entretenimiento' },
  { value: 'cat4', label: 'Servicios' },
  { value: 'cat5', label: 'Salud' },
  { value: 'cat6', label: 'Salario' },
  { value: 'cat7', label: 'Freelance' },
];

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    accountId: '',
    categoryId: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    tags: '',
    sortBy: 'date_desc',
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      accountId: '',
      categoryId: '',
      type: '',
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
    <div className={`bg-gray-900 border border-gray-800 rounded-xl ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3 min-w-0">
            <Filter className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <h3 className="text-lg font-semibold text-white truncate">Filtros</h3>
            {hasActiveFilters && (
              <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded-full flex-shrink-0">
                Activos
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                icon={<X className="h-4 w-4" />}
                className="flex-shrink-0"
              >
                <span className="hidden sm:inline">Limpiar</span>
                <span className="sm:hidden">Clear</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-shrink-0"
            >
              {isExpanded ? 'Contraer' : 'Expandir'}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Search */}
      <div className="p-4 border-b border-gray-800">
        <Input
          placeholder="Buscar transacciones..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          icon={<Search className="h-4 w-4" />}
        />
      </div>

      {/* Basic Filters */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <Select
            label="Tipo"
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            options={transactionTypes}
          />
        </div>

        <div className="w-full sm:w-auto">
          <Select
            label="Ordenar por"
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            options={sortOptions}
          />
        </div>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-800 space-y-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Rango de Fechas
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="date"
                placeholder="Fecha desde"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                icon={<Calendar className="h-4 w-4" />}
              />
              <Input
                type="date"
                placeholder="Fecha hasta"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>
          </div>

          {/* Amount Range */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Rango de Montos
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="number"
                step="0.01"
                placeholder="Monto mínimo"
                value={filters.amountMin}
                onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                icon={<DollarSign className="h-4 w-4" />}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Monto máximo"
                value={filters.amountMax}
                onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                icon={<DollarSign className="h-4 w-4" />}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Input
              label="Etiquetas"
              placeholder="Ej: urgente, recurrente"
              value={filters.tags}
              onChange={(e) => handleFilterChange('tags', e.target.value)}
              icon={<Tag className="h-4 w-4" />}
            />
            <p className="text-xs text-gray-500 mt-1">
              Separa las etiquetas con comas
            </p>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex flex-wrap gap-2 overflow-hidden">
            {Object.entries(filters).map(([key, value]) => {
              if (!value || key === 'sortBy') return null;
              
              let label = '';
              switch (key) {
                case 'search':
                  label = `Buscar: "${value}"`;
                  break;
                case 'accountId':
                  label = `Cuenta: ${accounts.find(a => a.value === value)?.label}`;
                  break;
                case 'categoryId':
                  label = `Categoría: ${categories.find(c => c.value === value)?.label}`;
                  break;
                case 'type':
                  label = `Tipo: ${transactionTypes.find(t => t.value === value)?.label}`;
                  break;
                case 'dateFrom':
                  label = `Desde: ${value}`;
                  break;
                case 'dateTo':
                  label = `Hasta: ${value}`;
                  break;
                case 'amountMin':
                  label = `Min: $${value}`;
                  break;
                case 'amountMax':
                  label = `Max: $${value}`;
                  break;
                case 'tags':
                  label = `Tags: ${value}`;
                  break;
                default:
                  return null;
              }

              return (
                <span
                  key={key}
                  className="inline-flex items-center px-3 py-1 bg-primary-600/20 text-primary-400 text-sm rounded-full max-w-full"
                >
                  <span className="truncate">{label}</span>
                  <button
                    onClick={() => handleFilterChange(key, '')}
                    className="ml-2 hover:text-primary-300 flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
