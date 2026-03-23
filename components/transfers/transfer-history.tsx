'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowRightLeft,
  Calendar,
  Filter,
  Search,
  Wallet,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  Info,
} from 'lucide-react';
import { formatCurrencyWithBCV } from '@/lib/currency-ves';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { logger } from '@/lib/utils/logger';
import { useAuth } from '@/hooks/use-auth';

interface Transfer {
  id: string;
  fromTransaction: {
    id: string;
    accountId: string;
    accountName?: string;
    amount: number;
    amountMinor: number;
    currencyCode: string;
    date: string;
    description: string;
    exchangeRate?: number;
    amountBaseMinor?: number;
  };
  toTransaction: {
    id: string;
    accountId: string;
    accountName?: string;
    amount: number;
    amountMinor: number;
    currencyCode: string;
    date: string;
    description: string;
    exchangeRate?: number;
    amountBaseMinor?: number;
  };
  amount: number;
  date: string;
  description: string;
}

interface TransferHistoryProps {
  className?: string;
}

export function TransferHistory({ className = '' }: TransferHistoryProps) {
  const { session, loading: authLoading } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>(
    'date'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
  });
  const [showExchangeRates, setShowExchangeRates] = useState(false);

  // Get current BCV rates for comparison
  const currentBCVRates = useBCVRates();

  // Virtual list container ref
  const parentRef = useRef<HTMLDivElement>(null);

  const loadTransfers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateFilter.startDate)
        params.append('startDate', dateFilter.startDate);
      if (dateFilter.endDate) params.append('endDate', dateFilter.endDate);

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/transfers?${params.toString()}`, {
        headers,
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al cargar las transferencias');
      }

      setTransfers(result.data || []);
    } catch (err) {
      logger.error('Error loading transfers:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, session?.access_token]);

  useEffect(() => {
    // Wait for auth to resolve to avoid spurious unauthorized fetches
    if (authLoading) return;
    // If not authenticated, skip auto-load (handled by unauth UI below)
    if (!session?.access_token) {
      setLoading(false);
      return;
    }
    loadTransfers();
  }, [loadTransfers, authLoading, session?.access_token]);

  const filteredTransfers = transfers
    .filter((transfer) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        transfer.description.toLowerCase().includes(searchLower) ||
        transfer.fromTransaction.accountName
          ?.toLowerCase()
          .includes(searchLower) ||
        transfer.toTransaction.accountName?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Virtualizer for large lists (only virtualize if >15 items for performance)
  const shouldVirtualize = filteredTransfers.length > 15;
  const rowVirtualizer = useVirtualizer({
    count: filteredTransfers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated row height in pixels
    overscan: 5, // Render 5 extra items above/below viewport
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amountMinor: number, currencyCode: string) => {
    return formatCurrencyWithBCV(amountMinor, currencyCode, {
      showUSDEquivalent: currencyCode === 'VES',
      locale: 'es-ES',
    });
  };

  const getExchangeRateText = (transfer: Transfer) => {
    const from = transfer.fromTransaction;
    const to = transfer.toTransaction;
    if (
      !from ||
      !to ||
      !from.exchangeRate ||
      from.exchangeRate === 1 ||
      from.currencyCode === to.currencyCode
    )
      return null;

    const rate = from.exchangeRate;

    if (from.currencyCode === 'VES' && to.currencyCode === 'USD') {
      return `1 USD = ${(1 / rate).toFixed(2)} VES`;
    }
    if (from.currencyCode === 'USD' && to.currencyCode === 'VES') {
      return `1 USD = ${rate.toFixed(2)} VES`;
    }

    if (from.currencyCode === 'USD') {
      return `1 USD = ${rate.toFixed(4)} ${to.currencyCode}`;
    }
    if (to.currencyCode === 'USD') {
      return `1 USD = ${(1 / rate).toFixed(4)} ${from.currencyCode}`;
    }

    return `1 ${from.currencyCode} = ${rate.toFixed(4)} ${to.currencyCode}`;
  };

  const getExchangeRateInfo = (transfer: Transfer) => {
    const from = transfer.fromTransaction;
    if (!from || !from.exchangeRate || from.exchangeRate === 1) return null;

    const isVES =
      from.currencyCode === 'VES' ||
      transfer.toTransaction?.currencyCode === 'VES';
    const rateText = getExchangeRateText(transfer);

    return {
      text: rateText,
      isVES,
    };
  };

  const handleSort = (field: 'date' | 'amount' | 'description') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const clearFilters = () => {
    setDateFilter({ startDate: '', endDate: '' });
    setSearchTerm('');
  };

  if (authLoading || loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Historial de Transferencias
          </h2>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-8 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
              <span className="text-neutral-600 dark:text-neutral-400">
                Cargando transferencias...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated UX: show CTA to login instead of raw API error
  if (!session?.access_token) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Historial de Transferencias
          </h2>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-8 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="py-12 text-center">
            <ArrowRightLeft className="mx-auto mb-4 h-12 w-12 text-neutral-400" />
            <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Inicia sesión para ver tu historial
            </h3>
            <p className="mb-4 text-neutral-600 dark:text-neutral-400">
              Necesitas estar autenticado para consultar tus transferencias.
            </p>
            <a
              href="/auth/login"
              className="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
            >
              Ir a iniciar sesión
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Historial de Transferencias
          </h2>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-8 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="py-12 text-center">
            <div className="mb-4 text-red-500">
              <ArrowRightLeft className="mx-auto h-12 w-12" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Error al cargar transferencias
            </h3>
            <p className="mb-4 text-neutral-600 dark:text-neutral-400">
              {error}
            </p>
            <button
              onClick={loadTransfers}
              className="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Historial de Transferencias
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            {filteredTransfers.length} transferencia
            {filteredTransfers.length !== 1 ? 's' : ''} encontrada
            {filteredTransfers.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowExchangeRates(!showExchangeRates)}
            className={`flex items-center space-x-2 rounded-lg border px-4 py-2 transition-colors ${
              showExchangeRates
                ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300'
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Tasas de Cambio</span>
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 rounded-lg border px-4 py-2 transition-colors ${
              showFilters
                ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
            {showFilters ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={loadTransfers}
            className="flex items-center space-x-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-neutral-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por descripción o cuenta..."
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-10 pr-4 text-neutral-900 focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:focus:border-primary-400"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Fecha desde
              </label>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) =>
                  setDateFilter((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-900 focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:focus:border-primary-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Fecha hasta
              </label>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) =>
                  setDateFilter((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-900 focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:focus:border-primary-400"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-sm text-neutral-600 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {/* Transfers List */}
      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
        {filteredTransfers.length === 0 ? (
          <div className="py-12 text-center">
            <ArrowRightLeft className="mx-auto mb-4 h-12 w-12 text-neutral-400" />
            <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              No hay transferencias
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              {searchTerm || dateFilter.startDate || dateFilter.endDate
                ? 'No se encontraron transferencias con los filtros aplicados'
                : 'Aún no has realizado ninguna transferencia'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4 dark:border-neutral-600 dark:bg-neutral-700">
              <div
                className={`grid gap-4 text-sm font-medium text-neutral-600 dark:text-neutral-400 ${
                  showExchangeRates ? 'grid-cols-16' : 'grid-cols-12'
                }`}
              >
                <div
                  className={showExchangeRates ? 'col-span-2' : 'col-span-3'}
                >
                  <button
                    onClick={() => handleSort('description')}
                    className="flex items-center space-x-1 transition-colors hover:text-neutral-800 dark:hover:text-neutral-200"
                  >
                    <span>Descripción</span>
                    {sortBy === 'description' &&
                      (sortOrder === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </button>
                </div>
                <div className="col-span-2">
                  <span>Desde</span>
                </div>
                <div className="col-span-2">
                  <span>Hacia</span>
                </div>
                <div className="col-span-2">
                  <button
                    onClick={() => handleSort('amount')}
                    className="flex items-center space-x-1 transition-colors hover:text-neutral-800 dark:hover:text-neutral-200"
                  >
                    <span>Monto</span>
                    {sortBy === 'amount' &&
                      (sortOrder === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </button>
                </div>
                {showExchangeRates && (
                  <div className="col-span-3">
                    <span className="flex items-center space-x-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>Tasa de Cambio</span>
                    </span>
                  </div>
                )}
                <div className="col-span-2">
                  <button
                    onClick={() => handleSort('date')}
                    className="flex items-center space-x-1 transition-colors hover:text-neutral-800 dark:hover:text-neutral-200"
                  >
                    <span>Fecha</span>
                    {sortBy === 'date' &&
                      (sortOrder === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      ))}
                  </button>
                </div>
                <div className="col-span-1">
                  <span>Estado</span>
                </div>
              </div>
            </div>

            {/* Table Body - Virtualized for performance */}
            <div
              ref={parentRef}
              className="max-h-[600px] divide-y divide-neutral-200 overflow-auto dark:divide-neutral-600"
            >
              {shouldVirtualize ? (
                // Virtualized rendering for large lists
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const transfer = filteredTransfers[virtualRow.index];
                    const fromRateInfo = getExchangeRateInfo(transfer);
                    const toRateInfo = null;
                    const hasExchangeRates = fromRateInfo || toRateInfo;

                    return (
                      <div
                        key={transfer.id}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className="border-b border-neutral-200 px-6 py-4 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-700/50"
                      >
                        <div
                          className={`grid items-center gap-4 ${showExchangeRates ? 'grid-cols-16' : 'grid-cols-12'}`}
                        >
                          <div
                            className={
                              showExchangeRates ? 'col-span-2' : 'col-span-3'
                            }
                          >
                            <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                              {transfer.description}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <div className="flex items-center space-x-2">
                              <Wallet className="h-4 w-4 text-red-500" />
                              <span className="truncate text-sm text-neutral-700 dark:text-neutral-300">
                                {transfer.fromTransaction.accountName ||
                                  'Cuenta origen'}
                              </span>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="flex items-center space-x-2">
                              <Wallet className="h-4 w-4 text-green-500" />
                              <span className="truncate text-sm text-neutral-700 dark:text-neutral-300">
                                {transfer.toTransaction.accountName ||
                                  'Cuenta destino'}
                              </span>
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="flex items-center space-x-2">
                              <DollarSign className="h-4 w-4 text-primary-600" />
                              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                                {formatAmount(
                                  transfer.amount,
                                  transfer.fromTransaction.currencyCode
                                )}
                              </span>
                            </div>
                          </div>
                          {showExchangeRates && (
                            <div className="col-span-3">
                              {hasExchangeRates ? (
                                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                                  {fromRateInfo?.text || 'Tasa aplicada'}
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <Info className="h-3 w-3 text-neutral-400" />
                                  <span className="text-xs text-neutral-500">
                                    Sin tasa
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="col-span-2">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-neutral-500" />
                              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                {formatDate(transfer.date)}
                              </span>
                            </div>
                          </div>
                          <div className="col-span-1">
                            <div className="flex items-center space-x-2">
                              <div className="h-2 w-2 rounded-full bg-green-500"></div>
                              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                OK
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Regular rendering for small lists
                filteredTransfers.map((transfer) => {
                  const fromRateInfo = getExchangeRateInfo(transfer);
                  const toRateInfo = null;
                  const hasExchangeRates = fromRateInfo || toRateInfo;

                  return (
                    <div
                      key={transfer.id}
                      className="px-6 py-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                    >
                      <div
                        className={`grid items-center gap-4 ${showExchangeRates ? 'grid-cols-16' : 'grid-cols-12'}`}
                      >
                        <div
                          className={
                            showExchangeRates ? 'col-span-2' : 'col-span-3'
                          }
                        >
                          <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                            {transfer.description}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center space-x-2">
                            <Wallet className="h-4 w-4 text-red-500" />
                            <span className="truncate text-sm text-neutral-700 dark:text-neutral-300">
                              {transfer.fromTransaction.accountName ||
                                'Cuenta origen'}
                            </span>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center space-x-2">
                            <Wallet className="h-4 w-4 text-green-500" />
                            <span className="truncate text-sm text-neutral-700 dark:text-neutral-300">
                              {transfer.toTransaction.accountName ||
                                'Cuenta destino'}
                            </span>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-primary-600" />
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {formatAmount(
                                transfer.amount,
                                transfer.fromTransaction.currencyCode
                              )}
                            </span>
                          </div>
                        </div>
                        {showExchangeRates && (
                          <div className="col-span-3">
                            {hasExchangeRates ? (
                              <div className="space-y-1">
                                {fromRateInfo && fromRateInfo.text && (
                                  <div className="flex items-center space-x-2">
                                    <TrendingUp className="h-3 w-3 text-blue-500" />
                                    <span className="text-xs text-neutral-600 dark:text-neutral-400">
                                      {fromRateInfo.text}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Info className="h-3 w-3 text-neutral-400" />
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                  Sin tasa
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="col-span-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-neutral-500" />
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              {formatDate(transfer.date)}
                            </span>
                          </div>
                        </div>
                        <div className="col-span-1">
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              Completada
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
