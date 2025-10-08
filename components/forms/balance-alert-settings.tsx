'use client';

import { useState, useEffect } from 'react';
import { Account } from '@/types/domain';
import { useRepository } from '@/providers/repository-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { X, DollarSign, AlertTriangle, Bell } from 'lucide-react';
// Simple success/error state management

interface BalanceAlertSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
}

export function BalanceAlertSettings({ isOpen, onClose, account }: BalanceAlertSettingsProps) {
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
      setMinimumBalance(account.minimumBalance ? (account.minimumBalance / 100).toString() : '');
    }
  }, [account]);

  const handleSave = async () => {
    if (!account) return;

    try {
      setIsLoading(true);

      const minimumBalanceMinor = minimumBalance ? Math.round(parseFloat(minimumBalance) * 100) : 0;

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
      console.error('Error updating alert settings:', error);
      setErrorMessage('No se pudieron guardar los cambios. Inténtalo de nuevo.');
      setSuccessMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: currencyCode === 'VES' ? 'VES' : 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
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
    return minBalance >= 0 && minBalance <= getCurrentBalance();
  };

  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Bell className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Configurar Alertas</h2>
              <p className="text-sm text-muted-foreground">{account.name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 hover:bg-muted/20 rounded-xl"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Balance Info */}
          <div className="bg-muted/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Saldo Actual</span>
              <span className="text-lg font-semibold text-foreground">
                {formatCurrency(getCurrentBalance(), account.currencyCode)}
              </span>
            </div>
          </div>

          {/* Alert Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground">
                Activar Alertas de Saldo
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Recibe notificaciones cuando el saldo sea bajo
              </p>
            </div>
            <Switch
              checked={alertEnabled}
              onCheckedChange={setAlertEnabled}
            />
          </div>

          {/* Minimum Balance Input */}
          {alertEnabled && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Cantidad Mínima
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={getCurrentBalance()}
                  value={minimumBalance}
                  onChange={(e) => setMinimumBalance(e.target.value)}
                  placeholder="0.00"
                  className="pl-10 bg-muted/10 border-border/20 rounded-xl"
                />
              </div>
              
              {/* Validation Message */}
              {minimumBalance && !isMinimumValid() && (
                <div className="flex items-center space-x-2 text-destructive text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  <span>
                    El mínimo debe ser menor o igual al saldo actual
                  </span>
                </div>
              )}

              {/* Alert Preview */}
              {minimumBalance && isMinimumValid() && (
                <div className="bg-warning/10 border border-warning/20 rounded-xl p-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-warning-foreground">
                      <p className="font-medium">Vista Previa de Alerta</p>
                      <p className="mt-1">
                        Recibirás una alerta cuando tu saldo sea menor a{' '}
                        <span className="font-semibold">
                          {formatCurrency(getMinimumBalanceNumber() * 1.2, account.currencyCode)}
                        </span>{' '}
                        y una alerta crítica cuando sea menor a{' '}
                        <span className="font-semibold">
                          {formatCurrency(getMinimumBalanceNumber(), account.currencyCode)}
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
          <div className="mx-6 mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}
        
        {errorMessage && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border/20">
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
            disabled={isLoading || (alertEnabled && (!minimumBalance || !isMinimumValid()))}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}