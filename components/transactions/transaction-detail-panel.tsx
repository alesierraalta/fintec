'use client';

import { useEffect } from 'react';
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
  X
} from 'lucide-react';

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

  const amount = transaction.amountMinor && !isNaN(transaction.amountMinor) ? Math.abs(transaction.amountMinor) : 0;
  const formattedAmount = formatAmount(amount);
  const currencySymbol = getCurrencySymbol(transaction.currencyCode || 'USD');

  // Mobile: Inline expansion
  if (isMobile) {
    return (
      <div className="bg-card/60 backdrop-blur-sm border-t border-border/20 p-4 space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-muted/20 rounded-xl">
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
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Amount */}
        <div className="text-center py-4">
          <p className={`text-3xl font-bold ${getAmountColor(transaction.type)}`}>
            {transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : ''}
            {currencySymbol}{formattedAmount}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {transaction.currencyCode}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-4">
          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Descripción
            </h4>
            <p className="text-foreground bg-card/40 rounded-lg p-3">
              {transaction.description || 'Sin descripción'}
            </p>
          </div>

          {/* Account & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Cuenta
              </h4>
              <p className="text-foreground bg-card/40 rounded-lg p-3">
                {accountName}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                <Tag className="h-4 w-4 mr-2" />
                Categoría
              </h4>
              <p className="text-foreground bg-card/40 rounded-lg p-3">
                {categoryName}
              </p>
            </div>
          </div>

          {/* Note */}
          {transaction.note && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Nota
              </h4>
              <p className="text-foreground bg-card/40 rounded-lg p-3">
                {transaction.note}
              </p>
            </div>
          )}

          {/* Tags */}
          {transaction.tags && transaction.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                <Tag className="h-4 w-4 mr-2" />
                Etiquetas
              </h4>
              <div className="flex flex-wrap gap-2">
                {transaction.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 pt-4 border-t border-border/20">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cerrar
          </Button>
          <Button
            onClick={() => onEdit(transaction)}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
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
      <div className="ml-auto w-full max-w-md bg-card/90 backdrop-blur-xl border-l border-border/40 shadow-2xl animate-slide-in-right">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-muted/20 rounded-2xl">
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
                className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Amount */}
            <div className="text-center py-6">
              <p className={`text-4xl font-bold ${getAmountColor(transaction.type)}`}>
                {transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : ''}
                {currencySymbol}{formattedAmount}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {transaction.currencyCode}
              </p>
            </div>

            {/* Details */}
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Descripción
                </h3>
                <p className="text-foreground bg-card/40 rounded-xl p-4 text-ios-body">
                  {transaction.description || 'Sin descripción'}
                </p>
              </div>

              {/* Account & Category */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    Cuenta
                  </h3>
                  <p className="text-foreground bg-card/40 rounded-xl p-4">
                    {accountName}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    Categoría
                  </h3>
                  <p className="text-foreground bg-card/40 rounded-xl p-4">
                    {categoryName}
                  </p>
                </div>
              </div>

              {/* Note */}
              {transaction.note && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Nota
                  </h3>
                  <p className="text-foreground bg-card/40 rounded-xl p-4 text-ios-body">
                    {transaction.note}
                  </p>
                </div>
              )}

              {/* Tags */}
              {transaction.tags && transaction.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    Etiquetas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {transaction.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-2 bg-primary/20 text-primary text-sm rounded-full"
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
          <div className="p-6 border-t border-border/20">
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cerrar
              </Button>
              <Button
                onClick={() => onEdit(transaction)}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}