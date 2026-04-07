'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import type { Transaction } from '@/types/domain';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  Calendar,
  Tag,
  FileText,
  Building2,
  Edit,
  X,
  TrendingUp,
} from 'lucide-react';
import { bcvHistoryService } from '@/lib/services/bcv-history-service';
import { binanceHistoryService } from '@/lib/services/binance-history-service';

interface TransactionDetailPanelProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  isMobile: boolean;
  accountName: string;
  categoryName: string;
  formatAmount: (minor: number) => string;
  getCurrencySymbol: (code: string) => string;
}

export function TransactionDetailPanel({
  transaction,
  isOpen,
  onClose,
  onEdit,
  isMobile,
  accountName,
  categoryName,
  formatAmount,
  getCurrencySymbol,
}: TransactionDetailPanelProps) {
  const [vesRates, setVesRates] = useState<{
    bcvUsd: number | null;
    bcvEur: number | null;
    binanceUsd: number | null;
    equivalentUsdBcv: string | null;
    equivalentEurBcv: string | null;
    equivalentUsdBinance: string | null;
  } | null>(null);

  // Fetch historical rates for VES transactions
  useEffect(() => {
    if (!isOpen || transaction.currencyCode !== 'VES') {
      setVesRates(null);
      return;
    }

    async function loadRates() {
      // Extract date from transaction (YYYY-MM-DD or ISO string)
      const txDate = transaction.date.split('T')[0];

      // Try historical rates first, fallback to latest available
      let bcvRecord = await bcvHistoryService.getRatesForDate(txDate);
      let binanceRecord = await binanceHistoryService.getRatesForDate(txDate);

      // Fallback to latest if no historical data
      if (!bcvRecord) {
        bcvRecord = await bcvHistoryService.getLatestRate();
      }
      if (!binanceRecord) {
        binanceRecord = await binanceHistoryService.getLatestRate();
      }

      const amountInBs =
        transaction.amountMinor && !isNaN(transaction.amountMinor)
          ? Math.abs(transaction.amountMinor) / 100 // Convert from minor units (céntimos)
          : 0;

      const bcvUsd = bcvRecord?.usd ?? null;
      const bcvEur = bcvRecord?.eur ?? null;
      const binanceUsd = binanceRecord?.usd ?? null;

      setVesRates({
        bcvUsd,
        bcvEur,
        binanceUsd,
        equivalentUsdBcv:
          bcvUsd && amountInBs > 0 ? (amountInBs / bcvUsd).toFixed(2) : null,
        equivalentEurBcv:
          bcvEur && amountInBs > 0 ? (amountInBs / bcvEur).toFixed(2) : null,
        equivalentUsdBinance:
          binanceUsd && amountInBs > 0
            ? (amountInBs / binanceUsd).toFixed(2)
            : null,
      });
    }

    loadRates();
  }, [
    isOpen,
    transaction.currencyCode,
    transaction.date,
    transaction.amountMinor,
    transaction.exchangeRate,
  ]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'INCOME':
        return <ArrowDownLeft className="h-6 w-6 text-green-500" />;
      case 'EXPENSE':
        return <ArrowUpRight className="h-6 w-6 text-red-500" />;
      case 'TRANSFER_OUT':
      case 'TRANSFER_IN':
        return <Repeat className="h-6 w-6 text-blue-500" />;
      default:
        return <ArrowUpRight className="h-6 w-6 text-gray-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
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
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'text-green-500';
      case 'EXPENSE':
        return 'text-red-500';
      case 'TRANSFER_OUT':
      case 'TRANSFER_IN':
        return 'text-blue-500';
      default:
        return 'text-gray-400';
    }
  };

  const amount =
    transaction.amountMinor && !isNaN(transaction.amountMinor)
      ? Math.abs(transaction.amountMinor)
      : 0;
  const formattedAmount = formatAmount(amount);
  const currencySymbol = getCurrencySymbol(transaction.currencyCode || 'USD');

  // Mobile: Full-screen modal overlay
  // Uses fixed positioning with z-[60] to appear above all UI elements (sidebar: z-50, floating button: z-40)
  // Includes backdrop for click-to-close and slide-in animation from bottom
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col">
        {/* Backdrop - click to close */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Panel - full screen with iOS-style rounded top corners */}
        <div className="relative mt-auto flex flex-1 animate-fade-in flex-col overflow-hidden rounded-t-3xl border-t border-border/40 bg-card/90 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-border/20 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="rounded-xl bg-muted/20 p-2">
                  {getIcon(transaction.type)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {getTypeLabel(transaction.type)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {transaction.date}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {/* Amount */}
            <div className="py-4 text-center">
              <p
                className={`text-3xl font-bold ${getAmountColor(transaction.type)}`}
              >
                {transaction.type === 'INCOME'
                  ? '+'
                  : transaction.type === 'EXPENSE'
                    ? '-'
                    : ''}
                {currencySymbol}
                {formattedAmount}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {transaction.currencyCode}
              </p>
            </div>

            {/* Details */}
            <div className="space-y-4">
              {/* Description */}
              <div>
                <h4 className="mb-2 flex items-center text-sm font-medium text-muted-foreground">
                  <FileText className="mr-2 h-4 w-4" />
                  Descripción
                </h4>
                <p className="rounded-lg bg-card/40 p-3 text-foreground">
                  {transaction.description || 'Sin descripción'}
                </p>
              </div>

              {/* Account & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="mb-2 flex items-center text-sm font-medium text-muted-foreground">
                    <Building2 className="mr-2 h-4 w-4" />
                    Cuenta
                  </h4>
                  <p className="rounded-lg bg-card/40 p-3 text-foreground">
                    {accountName}
                  </p>
                </div>
                <div>
                  <h4 className="mb-2 flex items-center text-sm font-medium text-muted-foreground">
                    <Tag className="mr-2 h-4 w-4" />
                    Categoría
                  </h4>
                  <p className="rounded-lg bg-card/40 p-3 text-foreground">
                    {categoryName}
                  </p>
                </div>
              </div>

              {/* Note */}
              {transaction.note && (
                <div>
                  <h4 className="mb-2 flex items-center text-sm font-medium text-muted-foreground">
                    <FileText className="mr-2 h-4 w-4" />
                    Nota
                  </h4>
                  <p className="rounded-lg bg-card/40 p-3 text-foreground">
                    {transaction.note}
                  </p>
                </div>
              )}

              {/* VES Exchange Rates */}
              {vesRates && (
                <div>
                  <h4 className="mb-2 flex items-center text-sm font-medium text-muted-foreground">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Tasas del día
                  </h4>
                  <div className="space-y-2">
                    {/* BCV USD */}
                    {vesRates.bcvUsd && vesRates.equivalentUsdBcv && (
                      <div className="rounded-lg bg-card/40 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              BCV USD
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              1 USD = {vesRates.bcvUsd.toFixed(2)} Bs
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              Equivale a
                            </p>
                            <p className="text-sm font-semibold text-green-500">
                              ${vesRates.equivalentUsdBcv}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* BCV EUR */}
                    {vesRates.bcvEur && vesRates.equivalentEurBcv && (
                      <div className="rounded-lg bg-card/40 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              BCV EUR
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              1 EUR = {vesRates.bcvEur.toFixed(2)} Bs
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              Equivale a
                            </p>
                            <p className="text-sm font-semibold text-blue-500">
                              €{vesRates.equivalentEurBcv}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Binance USD */}
                    {vesRates.binanceUsd && vesRates.equivalentUsdBinance && (
                      <div className="rounded-lg bg-card/40 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Binance USDT
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              1 USDT = {vesRates.binanceUsd.toFixed(2)} Bs
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              Equivale a
                            </p>
                            <p className="text-sm font-semibold text-yellow-500">
                              ${vesRates.equivalentUsdBinance}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* No rates available */}
                    {!vesRates.bcvUsd &&
                      !vesRates.bcvEur &&
                      !vesRates.binanceUsd && (
                        <div className="rounded-lg bg-card/40 p-3">
                          <p className="text-sm text-muted-foreground">
                            No hay tasas históricas disponibles para esta fecha
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {transaction.tags && transaction.tags.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center text-sm font-medium text-muted-foreground">
                    <Tag className="mr-2 h-4 w-4" />
                    Etiquetas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {transaction.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/20 px-3 py-1 text-sm text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions Footer - fixed at bottom */}
          <div className="flex-shrink-0 border-t border-border/20 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cerrar
              </Button>
              <Button
                onClick={() => onEdit(transaction)}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop: Side panel
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="animate-slide-in-right ml-auto w-full max-w-md border-l border-border/40 bg-card/90 shadow-2xl backdrop-blur-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-border/20 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="rounded-2xl bg-muted/20 p-3">
                  {getIcon(transaction.type)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {getTypeLabel(transaction.type)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {transaction.date}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {/* Amount */}
            <div className="py-6 text-center">
              <p
                className={`text-4xl font-bold ${getAmountColor(transaction.type)}`}
              >
                {transaction.type === 'INCOME'
                  ? '+'
                  : transaction.type === 'EXPENSE'
                    ? '-'
                    : ''}
                {currencySymbol}
                {formattedAmount}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {transaction.currencyCode}
              </p>
            </div>

            {/* Details */}
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="mb-3 flex items-center text-sm font-medium text-muted-foreground">
                  <FileText className="mr-2 h-4 w-4" />
                  Descripción
                </h3>
                <p className="rounded-xl bg-card/40 p-4 text-ios-body text-foreground">
                  {transaction.description || 'Sin descripción'}
                </p>
              </div>

              {/* Account & Category */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="mb-3 flex items-center text-sm font-medium text-muted-foreground">
                    <Building2 className="mr-2 h-4 w-4" />
                    Cuenta
                  </h3>
                  <p className="rounded-xl bg-card/40 p-4 text-foreground">
                    {accountName}
                  </p>
                </div>
                <div>
                  <h3 className="mb-3 flex items-center text-sm font-medium text-muted-foreground">
                    <Tag className="mr-2 h-4 w-4" />
                    Categoría
                  </h3>
                  <p className="rounded-xl bg-card/40 p-4 text-foreground">
                    {categoryName}
                  </p>
                </div>
              </div>

              {/* Note */}
              {transaction.note && (
                <div>
                  <h3 className="mb-3 flex items-center text-sm font-medium text-muted-foreground">
                    <FileText className="mr-2 h-4 w-4" />
                    Nota
                  </h3>
                  <p className="rounded-xl bg-card/40 p-4 text-ios-body text-foreground">
                    {transaction.note}
                  </p>
                </div>
              )}

              {/* VES Exchange Rates */}
              {vesRates && (
                <div>
                  <h3 className="mb-3 flex items-center text-sm font-medium text-muted-foreground">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Tasas del día
                  </h3>
                  <div className="space-y-2">
                    {/* BCV USD */}
                    {vesRates.bcvUsd && vesRates.equivalentUsdBcv && (
                      <div className="rounded-xl bg-card/40 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              BCV USD
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              1 USD = {vesRates.bcvUsd.toFixed(2)} Bs
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              Equivale a
                            </p>
                            <p className="text-sm font-semibold text-green-500">
                              ${vesRates.equivalentUsdBcv}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* BCV EUR */}
                    {vesRates.bcvEur && vesRates.equivalentEurBcv && (
                      <div className="rounded-xl bg-card/40 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              BCV EUR
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              1 EUR = {vesRates.bcvEur.toFixed(2)} Bs
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              Equivale a
                            </p>
                            <p className="text-sm font-semibold text-blue-500">
                              €{vesRates.equivalentEurBcv}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Binance USD */}
                    {vesRates.binanceUsd && vesRates.equivalentUsdBinance && (
                      <div className="rounded-xl bg-card/40 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Binance USDT
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              1 USDT = {vesRates.binanceUsd.toFixed(2)} Bs
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              Equivale a
                            </p>
                            <p className="text-sm font-semibold text-yellow-500">
                              ${vesRates.equivalentUsdBinance}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* No rates available */}
                    {!vesRates.bcvUsd &&
                      !vesRates.bcvEur &&
                      !vesRates.binanceUsd && (
                        <div className="rounded-xl bg-card/40 p-4">
                          <p className="text-sm text-muted-foreground">
                            No hay tasas históricas disponibles para esta fecha
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {transaction.tags && transaction.tags.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center text-sm font-medium text-muted-foreground">
                    <Tag className="mr-2 h-4 w-4" />
                    Etiquetas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {transaction.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/20 px-3 py-2 text-sm text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border/20 p-6">
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cerrar
              </Button>
              <Button
                onClick={() => onEdit(transaction)}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
