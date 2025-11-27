'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRightLeft,
  Wallet,
  DollarSign,
  Check,
  X,
  Bitcoin,
  Send,
  RotateCcw
} from 'lucide-react';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import type { Account } from '@/types/domain';
import { formatCurrencyWithBCV } from '@/lib/currency-ves';
import { toMinorUnits } from '@/lib/money';
import { useActiveUsdVesRate } from '@/lib/rates';
import { logger } from '@/lib/utils/logger';

interface TransferData {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  date: string;
  exchangeRate?: number;
  rateSource?: string;
}

export function DesktopTransfer() {
  const router = useRouter();
  const repository = useRepository();
  const { user, loading: authLoading } = useAuth();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferData, setTransferData] = useState<TransferData>({
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    description: '',
    date: '',
    exchangeRate: undefined,
    rateSource: undefined
  });
  const [amountError, setAmountError] = useState<string>('');
  const activeUsdVes = useActiveUsdVesRate();

  useEffect(() => {
    const loadAccounts = async () => {
      // Don't show error while auth is still loading
      if (authLoading) {
        return;
      }
      
      if (!user) {
        setError('Usuario no autenticado');
        setLoadingAccounts(false);
        return;
      }

      try {
        setLoadingAccounts(true);
        setError(null);
        const userAccounts = await repository.accounts.findByUserId(user.id);
        setAccounts(userAccounts.filter(account => account.active));
      } catch (err) {
        setError('Error al cargar las cuentas');
        setAccounts([]);
      } finally {
        setLoadingAccounts(false);
      }
    };

    loadAccounts();
    
    setTransferData(prev => ({
      ...prev,
      date: new Date().toISOString().split('T')[0]
    }));
  }, [user, authLoading, repository]);

  const getAccountIcon = (currencyCode: string) => {
    if (currencyCode === 'BTC' || currencyCode.includes('BTC')) {
      return <Bitcoin className="h-6 w-6 text-orange-500" />;
    }
    return <Wallet className="h-6 w-6 text-blue-500" />;
  };

  const formatBalance = (balanceMinor: number, currencyCode: string) => {
    // Use VES-aware formatting that handles minor units properly
    return formatCurrencyWithBCV(balanceMinor, currencyCode, {
      showUSDEquivalent: currencyCode === 'VES',
      locale: 'es-ES'
    });
  };

  const validateAmount = (amount: number) => {
    const fromAccount = getFromAccount();
    if (!fromAccount) {
      setAmountError('');
      return true;
    }

    if (amount <= 0) {
      setAmountError('');
      return true;
    }

    // Convert amount to minor units for comparison
    const amountInMinorUnits = toMinorUnits(amount, fromAccount.currencyCode);
    
    if (amountInMinorUnits > fromAccount.balance) {
      setAmountError(`Saldo insuficiente. Disponible: ${formatBalance(fromAccount.balance, fromAccount.currencyCode)}`);
      return false;
    }

    setAmountError('');
    return true;
  };

  const getFromAccount = useCallback(() => (
    accounts.find(acc => acc.id === transferData.fromAccountId)
  ), [accounts, transferData.fromAccountId]);
  const getToAccount = useCallback(() => (
    accounts.find(acc => acc.id === transferData.toAccountId)
  ), [accounts, transferData.toAccountId]);

  const handleFromAccountSelect = (accountId: string) => {
    // If clicking on already selected account, deselect it
    if (transferData.fromAccountId === accountId) {
      setTransferData(prev => ({ ...prev, fromAccountId: '' }));
    } else {
      setTransferData(prev => ({ ...prev, fromAccountId: accountId }));
    }
    // Validate amount when account changes
    if (transferData.amount > 0) {
      validateAmount(transferData.amount);
    }
  };

  const handleToAccountSelect = (accountId: string) => {
    // If clicking on already selected account, deselect it
    if (transferData.toAccountId === accountId) {
      setTransferData(prev => ({ ...prev, toAccountId: '' }));
    } else {
      setTransferData(prev => ({ ...prev, toAccountId: accountId }));
    }
  };

  const clearFromAccount = () => {
    setTransferData(prev => ({ ...prev, fromAccountId: '' }));
  };

  const clearToAccount = () => {
    setTransferData(prev => ({ ...prev, toAccountId: '' }));
  };

  const handleRateSelected = (rate: number, source: string) => {
    setTransferData(prev => ({
      ...prev,
      exchangeRate: rate,
      rateSource: source
    }));
  };

  const handleManualRate = (rate: number) => {
    setTransferData(prev => ({
      ...prev,
      exchangeRate: rate,
      rateSource: 'Manual'
    }));
  };

  // Auto-apply global exchange rate when currencies differ (USD↔VES)
  useEffect(() => {
    const from = getFromAccount();
    const to = getToAccount();
    if (!from || !to) return;
    if (from.currencyCode === to.currencyCode) {
      setTransferData(prev => ({ ...prev, exchangeRate: undefined, rateSource: undefined }));
      return;
    }
    if (!activeUsdVes || activeUsdVes <= 0) return;

    if (from.currencyCode === 'USD' && to.currencyCode === 'VES') {
      setTransferData(prev => ({ ...prev, exchangeRate: activeUsdVes, rateSource: 'Global' }));
    } else if (from.currencyCode === 'VES' && to.currencyCode === 'USD') {
      setTransferData(prev => ({ ...prev, exchangeRate: 1 / activeUsdVes, rateSource: 'Global' }));
    }
  }, [transferData.fromAccountId, transferData.toAccountId, activeUsdVes, getFromAccount, getToAccount]);

  const isFormValid = () => {
    const fromAccount = getFromAccount();
    const toAccount = getToAccount();
    const hasDifferentCurrencies = fromAccount && toAccount && fromAccount.currencyCode !== toAccount.currencyCode;
    
    return transferData.fromAccountId && 
           transferData.toAccountId && 
           transferData.fromAccountId !== transferData.toAccountId &&
           transferData.amount > 0 &&
           (!hasDifferentCurrencies || transferData.exchangeRate) &&
           !amountError; // Add balance validation
  };

  const handleTransfer = async () => {
    if (!isFormValid()) {
      alert('Por favor complete cuenta origen, destino y monto');
      return;
    }

    const fromAccount = getFromAccount();
    const toAccount = getToAccount();
    if (!fromAccount) {
      alert('Error: No se pudo encontrar la cuenta origen');
      return;
    }
    
    // Convert amount to minor units for comparison
    const amountInMinorUnits = toMinorUnits(transferData.amount, fromAccount.currencyCode);
    if (fromAccount.balance < amountInMinorUnits) {
      alert('Saldo insuficiente en la cuenta origen');
      return;
    }

    if (!toAccount) {
      alert('Error: No se pudo encontrar la cuenta destino');
      return;
    }

    setLoading(true);
    
    try {
      // Get the user's session token for authentication
      const { supabase } = await import('@/repositories/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuario no autenticado');
      }
      
      // Call the real API endpoint
      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fromAccountId: transferData.fromAccountId,
          toAccountId: transferData.toAccountId,
          amount: transferData.amount,
          description: transferData.description || `Transferencia de ${fromAccount.name} a ${toAccount.name}`,
          date: transferData.date,
          exchangeRate: transferData.exchangeRate,
          rateSource: transferData.rateSource,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al procesar la transferencia');
      }
      
      alert(`Transferencia exitosa: $${transferData.amount.toFixed(2)} de ${fromAccount.name} a ${toAccount.name}`);
      
      // Refresh accounts to show updated balances
      // loadAccounts(); // TODO: Implement account refresh
      
      // Reset form
      setTransferData({
        fromAccountId: '',
        toAccountId: '',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      
    } catch (error) {
      logger.error('Transfer error:', error);
      alert(`Error al procesar la transferencia: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Transferir Dinero</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Transfiere dinero entre tus cuentas de forma segura</p>
      </div>

      {/* Main Transfer Form */}
      <div className="space-y-8">
          <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-700">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">Seleccionar Cuentas</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* From Account */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-lg font-medium text-neutral-700 dark:text-neutral-300">Cuenta Origen</label>
                  {transferData.fromAccountId && (
                    <button
                      onClick={clearFromAccount}
                      className="flex items-center space-x-1 px-3 py-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Deseleccionar cuenta origen"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Limpiar</span>
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {loadingAccounts ? (
                    <div className="p-6 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700">
                      <p className="text-neutral-500 dark:text-neutral-400 text-center">Cargando cuentas...</p>
                    </div>
                  ) : error ? (
                    <div className="p-6 rounded-2xl border-2 border-error-500 dark:border-error-400 bg-error-50 dark:bg-error-900/20">
                      <p className="text-error-600 dark:text-error-400 text-center">{error}</p>
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="p-6 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700">
                      <p className="text-neutral-500 dark:text-neutral-400 text-center">No tienes cuentas disponibles</p>
                    </div>
                  ) : accounts.map((account) => (
                    <button
                      key={`from-${account.id}`}
                      onClick={() => handleFromAccountSelect(account.id)}
                      className={`w-full p-6 rounded-2xl border-2 transition-all relative ${
                        transferData.fromAccountId === account.id
                          ? 'border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20 shadow-lg shadow-primary-500/20'
                          : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                      }`}
                      disabled={transferData.toAccountId === account.id && transferData.fromAccountId !== account.id}
                    >
                      <div className="flex items-center space-x-4">
                        {getAccountIcon(account.currencyCode)}
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{account.name}</p>
                          <p className="text-neutral-500 dark:text-neutral-400">{formatBalance(account.balance, account.currencyCode)}</p>
                        </div>
                        {transferData.fromAccountId === account.id && (
                          <div className="flex items-center space-x-2">
                            <Check className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                            <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                              Haz clic para deseleccionar
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* To Account */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-lg font-medium text-neutral-700 dark:text-neutral-300">Cuenta Destino</label>
                  {transferData.toAccountId && (
                    <button
                      onClick={clearToAccount}
                      className="flex items-center space-x-1 px-3 py-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Deseleccionar cuenta destino"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Limpiar</span>
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {loadingAccounts ? (
                    <div className="p-6 rounded-2xl border-2 border-border-primary bg-background-secondary">
                      <p className="text-text-muted text-center">Cargando cuentas...</p>
                    </div>
                  ) : error ? (
                    <div className="p-6 rounded-2xl border-2 border-red-500 bg-red-500/10">
                      <p className="text-red-500 text-center">{error}</p>
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="p-6 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700">
                      <p className="text-neutral-500 dark:text-neutral-400 text-center">No tienes cuentas disponibles</p>
                    </div>
                  ) : accounts.map((account) => (
                    <button
                      key={`to-${account.id}`}
                      onClick={() => handleToAccountSelect(account.id)}
                      className={`w-full p-6 rounded-2xl border-2 transition-all relative ${
                        transferData.toAccountId === account.id
                          ? 'border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20 shadow-lg shadow-primary-500/20'
                          : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                      }`}
                      disabled={transferData.fromAccountId === account.id && transferData.toAccountId !== account.id}
                    >
                      <div className="flex items-center space-x-4">
                        {getAccountIcon(account.currencyCode)}
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{account.name}</p>
                          <p className="text-neutral-500 dark:text-neutral-400">{formatBalance(account.balance, account.currencyCode)}</p>
                        </div>
                        {transferData.toAccountId === account.id && (
                          <div className="flex items-center space-x-2">
                            <Check className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                            <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                              Haz clic para deseleccionar
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Amount and Description */}
          {transferData.fromAccountId && transferData.toAccountId && (
            <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-700">
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">Detalles de la Transferencia</h2>
              
              <div className="space-y-6">
                {/* Amount Input */}
                <div className="space-y-4">
                  <label className="text-lg font-medium text-neutral-700 dark:text-neutral-300">Monto</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-neutral-500 dark:text-neutral-400" />
                    <input
                      type="number"
                      value={transferData.amount || ''}
                      onChange={(e) => {
                        const newAmount = parseFloat(e.target.value) || 0;
                        setTransferData(prev => ({ ...prev, amount: newAmount }));
                        validateAmount(newAmount);
                      }}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className={`w-full pl-12 pr-4 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-700 border text-neutral-900 dark:text-neutral-100 text-xl font-semibold placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none transition-colors ${
                        amountError 
                          ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400' 
                          : 'border-neutral-200 dark:border-neutral-600 focus:border-primary-500 dark:focus:border-primary-400'
                      }`}
                    />
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Saldo disponible: {getFromAccount() ? formatBalance(getFromAccount()!.balance, getFromAccount()!.currencyCode) : '--'}
                  </p>
                  {amountError && (
                    <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
                      <X className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400">{amountError}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-4">
                  <label className="text-lg font-medium text-neutral-700 dark:text-neutral-300">Descripción (opcional)</label>
                  <textarea
                    value={transferData.description}
                    onChange={(e) => setTransferData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe el motivo de la transferencia..."
                    rows={4}
                    className="w-full p-4 rounded-xl bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:border-primary-500 dark:focus:border-primary-400 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Exchange Rate Selector removed: using global header RateSelector */}

        {/* Prominent Transfer Preview - Full Width */}
        {isFormValid() && (
          <div className="bg-gradient-to-r from-primary-50 via-secondary-50 to-success-50 dark:from-primary-900/20 dark:via-secondary-900/20 dark:to-success-900/20 rounded-3xl p-8 border-2 border-primary-200/50 dark:border-primary-700/50 shadow-lg shadow-primary-500/10">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Confirmar Transferencia</h3>
              <p className="text-neutral-600 dark:text-neutral-400">Revisa los datos antes de continuar</p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <div className="bg-white/80 dark:bg-neutral-800/80 rounded-2xl p-6 backdrop-blur-sm border border-white/50 dark:border-neutral-700/50">
                <div className="flex items-center justify-between">
                  {/* From Account */}
                  <div className="flex-1 text-center">
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                        <Wallet className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wide">Cuenta Origen</p>
                      <p className="font-bold text-neutral-900 dark:text-neutral-100 text-lg">{getFromAccount()?.name}</p>
                      <p className="text-2xl font-black amount-strong text-primary-700 dark:text-primary-300 drop-shadow-sm">
                        -{formatBalance(toMinorUnits(transferData.amount, getFromAccount()?.currencyCode || 'VES'), getFromAccount()?.currencyCode || 'VES')}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="px-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-success-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  {/* To Account */}
                  <div className="flex-1 text-center">
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-success-500 to-success-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                        <Wallet className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-success-600 dark:text-success-400 uppercase tracking-wide">Cuenta Destino</p>
                      <p className="font-bold text-neutral-900 dark:text-neutral-100 text-lg">{getToAccount()?.name}</p>
                      <p className="text-2xl font-black amount-strong text-success-700 dark:text-success-300 drop-shadow-sm">
                        +{formatBalance(toMinorUnits(
                          getFromAccount()?.currencyCode !== getToAccount()?.currencyCode && transferData.exchangeRate 
                            ? transferData.amount * transferData.exchangeRate 
                            : transferData.amount, 
                          getToAccount()?.currencyCode || 'VES'
                        ), getToAccount()?.currencyCode || 'VES')}
                      </p>
                    </div>
                  </div>
                </div>

                {transferData.description && (
                  <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
                      <span className="font-medium">Descripción:</span> {transferData.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

          {/* Action Buttons - Always visible when form is valid */}
          {isFormValid() && (
            <div className="space-y-4">
              <button
                onClick={handleTransfer}
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all flex items-center justify-center space-x-3 shadow-lg shadow-primary-500/25"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Check className="h-6 w-6" />
                    <span>Realizar Transferencia</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => router.back()}
                className="w-full bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-900 dark:text-neutral-100 py-4 px-6 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center space-x-3"
              >
                <X className="h-6 w-6" />
                <span>Cancelar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
}
