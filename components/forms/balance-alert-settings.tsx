'use client';

import { useState, useEffect } from 'react';
import { Account } from '@/types/domain';
import { useRepository } from '@/providers/repository-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { X, DollarSign, AlertTriangle, Bell } from 'lucide-react';
import { logger } from '@/lib/utils/logger';
// Simple success/error state management

interface BalanceAlertSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
}

export function BalanceAlertSettings({
  isOpen,
  onClose,
  account,
}: BalanceAlertSettingsProps) {
  const repository = useRepository();
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [minimumBalance, setMinimumBalance] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form with account data
  useEffect(() => {
    if (account) {
      setAlertEnabled(account.alertEnabled || false);
      setMinimumBalance(
        account.minimumBalance ? (account.minimumBalance / 100).toString() : ''
      );
    }
  }, [account]);

  const handleSave = async () => {
    if (!account) return;

    try {
      setIsLoading(true);

      const minimumBalanceMinor = minimumBalance
        ? Math.round(parseFloat(minimumBalance) * 100)
        : 0;

      await repository.accounts.update(account.id, {
        id: account.id,
        alertEnabled,
        minimumBalance: minimumBalanceMinor,
      });

      const message = alertEnabled
        ? `Se activaron las alertas para ${account.name} con un mínimo de ${formatCurrency(minimumBalanceMinor / 100, account.currencyCode)}`
        : `Se desactivaron las alertas para ${account.name}`;

      setSuccessMessage(message);
      setErrorMessage(null);

      // Close after showing success message briefly
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      logger.error('Error updating alert settings:', error);
      setErrorMessage(
        'No se pudieron guardar los cambios. Inténtalo de nuevo.'
      );
      setSuccessMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    try {
      return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (e) {
      return `${currencyCode} ${amount.toFixed(2)}`;
    }
  };

  const getCurrentBalance = () => {
    if (!account) return 0;
    return account.balance / 100;
  };

  const getMinimumBalanceNumber = () => {
    return minimumBalance ? parseFloat(minimumBalance) : 0;
  };

  const isMinimumValid = () => {
    const minBalance = getMinimumBalanceNumber();
    return minBalance >= 0;
  };

  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      {/* * Modal container with max-height and flex layout for mobile scrolling */}
      <div className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-2xl border border-border/40 bg-card shadow-ios">
        {/* Header - fixed at top */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border/20 p-4 sm:p-6">
          <div className="flex items-center space-x-3">
            <div className="rounded-xl bg-blue-500/10 p-2">
              <Bell className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-ios-headline font-semibold text-foreground">
                Configurar Alertas
              </h2>
              <p className="text-ios-caption text-muted-foreground">
                {account.name}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-muted/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content - scrollable area */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:space-y-6 sm:p-6">
          {/* Current Balance Info */}
          <div className="rounded-xl bg-muted/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-ios-body text-muted-foreground">
                Saldo Actual
              </span>
              <span className="text-ios-headline font-semibold text-foreground">
                {formatCurrency(getCurrentBalance(), account.currencyCode)}
              </span>
            </div>
          </div>

          {/* Alert Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <label className="text-ios-body font-medium text-foreground">
                Activar Alertas de Saldo
              </label>
              <p className="mt-1 text-ios-caption text-muted-foreground">
                Recibe notificaciones cuando el saldo sea bajo
              </p>
            </div>
            <Switch checked={alertEnabled} onCheckedChange={setAlertEnabled} />
          </div>

          {/* Minimum Balance Input */}
          {alertEnabled && (
            <div className="space-y-3">
              <label className="text-ios-body font-medium text-foreground">
                Cantidad Mínima
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={minimumBalance}
                  onChange={(e) => setMinimumBalance(e.target.value)}
                  placeholder="0.00"
                  className="rounded-xl border-border/20 bg-muted/10 pl-10 text-[16px]"
                />
              </div>

              {/* Validation Message */}
              {minimumBalance && !isMinimumValid() && (
                <div className="flex items-center space-x-2 text-ios-caption text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  <span>El mínimo debe ser mayor o igual a 0</span>
                </div>
              )}

              {/* Alert Preview */}
              {minimumBalance && isMinimumValid() && (
                <div className="rounded-xl border border-warning/20 bg-warning/10 p-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
                    <div className="text-warning-foreground text-ios-caption">
                      <p className="font-medium">Vista Previa de Alerta</p>
                      <p className="mt-1">
                        Recibirás una alerta cuando tu saldo sea menor a{' '}
                        <span className="font-semibold">
                          {formatCurrency(
                            getMinimumBalanceNumber() * 1.2,
                            account.currencyCode
                          )}
                        </span>{' '}
                        y una alerta crítica cuando sea menor a{' '}
                        <span className="font-semibold">
                          {formatCurrency(
                            getMinimumBalanceNumber(),
                            account.currencyCode
                          )}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mx-4 mb-4 rounded-xl border border-green-200 bg-green-50 p-3 sm:mx-6">
            <p className="text-ios-body text-green-800">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 p-3 sm:mx-6">
            <p className="text-ios-body text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Footer - fixed at bottom */}
        <div className="flex flex-shrink-0 items-center justify-end space-x-3 border-t border-border/20 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6 sm:pt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="hover:bg-muted/20"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isLoading ||
              (alertEnabled && (!minimumBalance || !isMinimumValid()))
            }
            className="bg-blue-500 text-white hover:bg-blue-600"
          >
            {isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
