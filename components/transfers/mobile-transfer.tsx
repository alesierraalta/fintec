'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRightLeft,
  Calendar,
  Wallet,
  DollarSign,
  Check,
  X,
  Bitcoin,
  RotateCcw,
} from 'lucide-react';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import type { Account } from '@/types/domain';
import { formatCurrencyWithBCV } from '@/lib/currency-ves';
import { toMinorUnits } from '@/lib/money';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { useActiveUsdVesRate } from '@/lib/rates';
import {
  calculateSourceAmountFromTarget,
  calculateTargetAmountFromSource,
  isUsdVesTransferPair,
  recalculateTransferAmounts,
} from '@/lib/transfers/exchange-calculations';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';

interface TransferData {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  date: string;
  exchangeRate?: number;
  rateSource?: string;
}

export function MobileTransfer() {
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
    rateSource: undefined,
  });
  const [amountError, setAmountError] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState(0);
  const [lastAmountEdited, setLastAmountEdited] = useState<'source' | 'target'>(
    'source'
  );
  const activeUsdVes = useActiveUsdVesRate();
  const bcvRates = useBCVRates();
  const { rates: binanceRates } = useBinanceRates();

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
        setAccounts(userAccounts.filter((account) => account.active));
      } catch (err) {
        setError('Error al cargar las cuentas');
        setAccounts([]);
      } finally {
        setLoadingAccounts(false);
      }
    };

    loadAccounts();

    setTransferData((prev) => ({
      ...prev,
      date: new Date().toISOString().split('T')[0],
    }));
  }, [user, authLoading, repository]);

  const getAccountIcon = (currencyCode: string) => {
    if (currencyCode === 'BTC' || currencyCode.includes('BTC')) {
      return <Bitcoin className="h-5 w-5 text-orange-500" />;
    }
    return <Wallet className="h-5 w-5 text-blue-500" />;
  };

  const formatBalance = (balanceMinor: number, currencyCode: string) => {
    // Use VES-aware formatting that handles minor units properly
    return formatCurrencyWithBCV(balanceMinor, currencyCode, {
      showUSDEquivalent: currencyCode === 'VES',
      locale: 'es-ES',
    });
  };

  const formatTransferDate = (date: string) => {
    if (!date) return 'Sin fecha';

    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;

    return parsed.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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
      setAmountError(
        `Saldo insuficiente. Disponible: ${formatBalance(fromAccount.balance, fromAccount.currencyCode)}`
      );
      return false;
    }

    setAmountError('');
    return true;
  };

  const getFromAccount = useCallback(
    () => accounts.find((acc) => acc.id === transferData.fromAccountId),
    [accounts, transferData.fromAccountId]
  );
  const getToAccount = useCallback(
    () => accounts.find((acc) => acc.id === transferData.toAccountId),
    [accounts, transferData.toAccountId]
  );

  const handleFromAccountSelect = (accountId: string) => {
    // If clicking on already selected account, deselect it
    if (transferData.fromAccountId === accountId) {
      setTransferData((prev) => ({ ...prev, fromAccountId: '' }));
    } else {
      setTransferData((prev) => ({ ...prev, fromAccountId: accountId }));
    }
    // Validate amount when account changes
    if (transferData.amount > 0) {
      validateAmount(transferData.amount);
    }
  };

  const handleToAccountSelect = (accountId: string) => {
    // If clicking on already selected account, deselect it
    if (transferData.toAccountId === accountId) {
      setTransferData((prev) => ({ ...prev, toAccountId: '' }));
    } else {
      setTransferData((prev) => ({ ...prev, toAccountId: accountId }));
    }
  };

  const clearFromAccount = () => {
    setTransferData((prev) => ({ ...prev, fromAccountId: '' }));
  };

  const clearToAccount = () => {
    setTransferData((prev) => ({ ...prev, toAccountId: '' }));
  };

  const handleRateSelected = (rate: number, source: string) => {
    setTransferData((prev) => ({
      ...prev,
      exchangeRate: rate,
      rateSource: source,
    }));
  };

  const handleManualRate = (rate: number) => {
    setTransferData((prev) => ({
      ...prev,
      exchangeRate: rate,
      rateSource: 'Manual',
    }));
  };

  // Auto-apply rate logic
  useEffect(() => {
    const from = getFromAccount();
    const to = getToAccount();
    if (!from || !to) return;

    // Same currency
    if (from.currencyCode === to.currencyCode) {
      if (transferData.exchangeRate !== 1.0) {
        setTransferData((prev) => ({
          ...prev,
          exchangeRate: 1.0,
          rateSource: undefined,
        }));
      }
      return;
    }

    // If Custom, respect it (don't auto update rate from sources)
    if (transferData.rateSource === 'Custom') return;

    // Determine the base rate to use
    let baseRate = activeUsdVes;
    if (transferData.rateSource === 'BCV') baseRate = bcvRates.usd;
    else if (transferData.rateSource === 'Euro') baseRate = bcvRates.eur;
    else if (transferData.rateSource === 'Binance')
      baseRate = binanceRates?.usd_ves || 0;

    // If we have a baseRate, apply it with correct direction
    if (baseRate > 0) {
      let finalRate = baseRate;
      if (from.currencyCode === 'VES' && to.currencyCode === 'USD') {
        finalRate = 1 / baseRate;
      }

      // Only update if different (with tolerance) or if undefined
      if (
        !transferData.exchangeRate ||
        Math.abs(transferData.exchangeRate - finalRate) > 0.000001
      ) {
        setTransferData((prev) => ({
          ...prev,
          exchangeRate: finalRate,
          rateSource: prev.rateSource || 'Global',
        }));
      }
    }
  }, [
    transferData.fromAccountId,
    transferData.toAccountId,
    transferData.rateSource,
    transferData.exchangeRate,
    activeUsdVes,
    bcvRates,
    binanceRates,
    getFromAccount,
    getToAccount,
  ]);

  useEffect(() => {
    const from = getFromAccount();
    const to = getToAccount();

    if (
      !from ||
      !to ||
      !isUsdVesTransferPair(from.currencyCode, to.currencyCode)
    ) {
      if (targetAmount !== 0) {
        setTargetAmount(0);
      }
      return;
    }

    const recalculated = recalculateTransferAmounts({
      fromCurrency: from.currencyCode,
      toCurrency: to.currencyCode,
      exchangeRate: transferData.exchangeRate,
      sourceAmountMajor: transferData.amount,
      targetAmountMajor: targetAmount,
      lastEdited: lastAmountEdited,
    });

    if (
      lastAmountEdited === 'target' &&
      Math.abs(recalculated.sourceAmountMajor - transferData.amount) > 0.000001
    ) {
      setTransferData((prev) => ({
        ...prev,
        amount: recalculated.sourceAmountMajor,
      }));
      validateAmount(recalculated.sourceAmountMajor);
    }

    if (Math.abs(recalculated.targetAmountMajor - targetAmount) > 0.000001) {
      setTargetAmount(recalculated.targetAmountMajor);
    }
  }, [
    transferData.amount,
    transferData.exchangeRate,
    targetAmount,
    lastAmountEdited,
    getFromAccount,
    getToAccount,
  ]);

  const getPreviewTargetAmount = () => {
    const from = getFromAccount();
    const to = getToAccount();

    if (!from || !to) {
      return transferData.amount;
    }

    if (
      from.currencyCode !== to.currencyCode &&
      transferData.exchangeRate &&
      transferData.exchangeRate > 0
    ) {
      return calculateTargetAmountFromSource(
        transferData.amount,
        from.currencyCode,
        to.currencyCode,
        transferData.exchangeRate
      );
    }

    return transferData.amount;
  };

  const isFormValid = () => {
    const fromAccount = getFromAccount();
    const toAccount = getToAccount();
    const hasDifferentCurrencies =
      fromAccount &&
      toAccount &&
      fromAccount.currencyCode !== toAccount.currencyCode;

    return (
      transferData.fromAccountId &&
      transferData.toAccountId &&
      transferData.fromAccountId !== transferData.toAccountId &&
      transferData.amount > 0 &&
      !!transferData.date &&
      (!hasDifferentCurrencies || transferData.exchangeRate) &&
      !amountError
    ); // Add balance validation
  };

  const handleTransfer = async () => {
    if (!isFormValid()) {
      toast.error('Por favor completa cuenta origen, destino, monto y fecha');
      return;
    }

    const fromAccount = getFromAccount();
    const toAccount = getToAccount();
    if (!fromAccount) {
      toast.error('No se pudo encontrar la cuenta origen');
      return;
    }

    const amountInMinorUnits = toMinorUnits(
      transferData.amount,
      fromAccount.currencyCode
    );
    if (fromAccount.balance < amountInMinorUnits) {
      toast.error('Saldo insuficiente en la cuenta origen');
      return;
    }

    if (!toAccount) {
      toast.error('No se pudo encontrar la cuenta destino');
      return;
    }

    setLoading(true);

    try {
      // Get the user's session token for authentication
      const { supabase } = await import('@/repositories/supabase/client');
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Usuario no autenticado');
      }

      // Call the real API endpoint
      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fromAccountId: transferData.fromAccountId,
          toAccountId: transferData.toAccountId,
          amount: transferData.amount,
          description:
            transferData.description ||
            `Transferencia de ${fromAccount.name} a ${toAccount.name}`,
          date: transferData.date,
          exchangeRate: transferData.exchangeRate,
          rateSource: transferData.rateSource,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al procesar la transferencia');
      }

      const formattedAmount = formatCurrencyWithBCV(
        toMinorUnits(transferData.amount, fromAccount.currencyCode),
        fromAccount.currencyCode
      );
      toast.success(
        `Transferencia exitosa: ${formattedAmount} de ${fromAccount.name} a ${toAccount.name}`
      );

      // Refresh accounts to show updated balances
      // loadAccounts(); // TODO: Implement account refresh

      // Reset form
      setTransferData({
        fromAccountId: '',
        toAccountId: '',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
        exchangeRate: undefined,
        rateSource: undefined,
      });
      setTargetAmount(0);
      setLastAmountEdited('source');
    } catch (error) {
      logger.error('Transfer error:', error);
      toast.error(
        `Error al procesar la transferencia: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Transferir Dinero
        </h1>
        <p className="text-muted-foreground">Entre mis cuentas</p>
      </div>

      {/* Account Selection */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground">
          Seleccionar Cuentas
        </h2>

        {/* From Account */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Cuenta Origen
          </label>
          <div className="space-y-2">
            {loadingAccounts ? (
              <div className="rounded-2xl border-2 border-border bg-card/90 p-4">
                <p className="text-center text-sm text-muted-foreground">
                  Cargando cuentas...
                </p>
              </div>
            ) : error ? (
              <div className="rounded-2xl border-2 border-error-500 bg-error-50 p-4 dark:border-error-400 dark:bg-error-900/20">
                <p className="text-center text-sm text-error-600 dark:text-error-400">
                  {error}
                </p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="rounded-2xl border-2 border-border bg-card/90 p-4">
                <p className="text-center text-sm text-muted-foreground">
                  No tienes cuentas disponibles
                </p>
              </div>
            ) : (
              accounts.map((account) => (
                <button
                  key={`from-${account.id}`}
                  onClick={() => handleFromAccountSelect(account.id)}
                  className={`w-full rounded-2xl border-2 p-4 transition-all ${
                    transferData.fromAccountId === account.id
                      ? 'border-primary-600 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                      : 'border-border bg-card/90 hover:border-primary/40'
                  }`}
                  disabled={
                    transferData.toAccountId === account.id &&
                    transferData.fromAccountId !== account.id
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getAccountIcon(account.currencyCode)}
                      <div className="text-left">
                        <p className="font-medium text-foreground">
                          {account.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {account.currencyCode}
                        </p>
                        {transferData.fromAccountId === account.id && (
                          <p className="text-xs font-medium text-primary-600">
                            Toca para deseleccionar
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="amount-emphasis-white font-semibold text-white">
                        {formatBalance(account.balance, account.currencyCode)}
                      </p>
                      {transferData.fromAccountId === account.id && (
                        <Check className="ml-auto mt-1 h-5 w-5 text-primary-600" />
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Transfer Icon */}
        {transferData.fromAccountId && (
          <div className="flex justify-center py-2">
            <div className="rounded-full bg-gradient-to-r from-primary-600 to-primary-700 p-3">
              <ArrowRightLeft className="h-6 w-6 text-white" />
            </div>
          </div>
        )}

        {/* To Account */}
        {transferData.fromAccountId && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Cuenta Destino
            </label>
            <div className="space-y-2">
              {accounts
                .filter((account) => account.id !== transferData.fromAccountId)
                .map((account) => (
                  <button
                    key={`to-${account.id}`}
                    onClick={() => handleToAccountSelect(account.id)}
                    className={`w-full rounded-2xl border-2 p-4 transition-all ${
                      transferData.toAccountId === account.id
                        ? 'border-success-500 bg-success-50 dark:border-success-400 dark:bg-success-900/20'
                        : 'border-border bg-card/90 hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getAccountIcon(account.currencyCode)}
                        <div className="text-left">
                          <p className="font-medium text-foreground">
                            {account.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {account.currencyCode}
                          </p>
                          {transferData.toAccountId === account.id && (
                            <p className="text-xs font-medium text-success-600">
                              Toca para deseleccionar
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="amount-emphasis-white font-semibold text-white">
                          {formatBalance(account.balance, account.currencyCode)}
                        </p>
                        {transferData.toAccountId === account.id && (
                          <Check className="ml-auto mt-1 h-5 w-5 text-success-600" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Amount and Description */}
      {transferData.fromAccountId && transferData.toAccountId && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-foreground">
            Detalles de la Transferencia
          </h3>

          {/* Amount Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Monto</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
              <input
                type="number"
                value={transferData.amount || ''}
                onChange={(e) => {
                  const newAmount = parseFloat(e.target.value) || 0;
                  const from = getFromAccount();
                  const to = getToAccount();

                  setLastAmountEdited('source');
                  setTransferData((prev) => ({ ...prev, amount: newAmount }));

                  if (
                    from &&
                    to &&
                    isUsdVesTransferPair(from.currencyCode, to.currencyCode) &&
                    transferData.exchangeRate
                  ) {
                    setTargetAmount(
                      calculateTargetAmountFromSource(
                        newAmount,
                        from.currencyCode,
                        to.currencyCode,
                        transferData.exchangeRate
                      )
                    );
                  }

                  validateAmount(newAmount);
                }}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`w-full rounded-xl border border-border bg-background py-4 pl-12 pr-4 text-lg font-semibold text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none ${
                  amountError
                    ? 'border-red-500 focus:border-red-500'
                    : 'focus:border-primary-500'
                }`}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Saldo disponible:{' '}
              {getFromAccount()
                ? formatBalance(
                    getFromAccount()!.balance,
                    getFromAccount()!.currencyCode
                  )
                : '--'}
            </p>
            {amountError && (
              <div className="flex items-center space-x-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/20">
                <X className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600">{amountError}</span>
              </div>
            )}

            {getFromAccount() &&
              getToAccount() &&
              isUsdVesTransferPair(
                getFromAccount()!.currencyCode,
                getToAccount()!.currencyCode
              ) && (
                <div className="space-y-3 rounded-xl border border-primary-100 bg-primary-50/50 p-3 dark:border-primary-900/40 dark:bg-primary-900/10">
                  <label className="text-sm font-medium text-foreground">
                    Monto Recibido ({getToAccount()!.currencyCode})
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
                    <input
                      type="number"
                      value={targetAmount || ''}
                      onChange={(e) => {
                        const from = getFromAccount();
                        const to = getToAccount();
                        const newTargetAmount = parseFloat(e.target.value) || 0;

                        setLastAmountEdited('target');
                        setTargetAmount(newTargetAmount);

                        if (
                          from &&
                          to &&
                          transferData.exchangeRate &&
                          transferData.exchangeRate > 0
                        ) {
                          const sourceAmount = calculateSourceAmountFromTarget(
                            newTargetAmount,
                            from.currencyCode,
                            to.currencyCode,
                            transferData.exchangeRate
                          );

                          setTransferData((prev) => ({
                            ...prev,
                            amount: sourceAmount,
                          }));
                          validateAmount(sourceAmount);
                        }
                      }}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full rounded-xl border border-border bg-background py-4 pl-12 pr-4 text-lg font-semibold text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
          </div>

          {/* Date */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Fecha</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
              <input
                type="date"
                value={transferData.date}
                onChange={(e) =>
                  setTransferData((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full rounded-xl border border-border bg-background py-4 pl-12 pr-4 text-foreground transition-colors focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Descripción
            </label>
            <textarea
              value={transferData.description}
              onChange={(e) =>
                setTransferData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe el motivo de la transferencia..."
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-background p-4 text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Exchange Rate Selector */}
      {getFromAccount() &&
        getToAccount() &&
        getFromAccount()!.currencyCode !== getToAccount()!.currencyCode && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Tasa de Cambio
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'Global', label: 'Global', value: activeUsdVes },
                { id: 'BCV', label: 'BCV (USD)', value: bcvRates.usd },
                { id: 'Euro', label: 'BCV (EUR)', value: bcvRates.eur },
                {
                  id: 'Binance',
                  label: 'Binance',
                  value: binanceRates?.usd_ves || 0,
                },
                { id: 'Custom', label: 'Personalizada', value: 0 },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    if (option.id === 'Custom') {
                      setTransferData((prev) => ({
                        ...prev,
                        rateSource: 'Custom',
                      }));
                    } else {
                      setTransferData((prev) => ({
                        ...prev,
                        rateSource: option.id,
                      }));
                    }
                  }}
                  className={`rounded-xl border-2 p-3 text-center transition-all ${
                    transferData.rateSource === option.id ||
                    (!transferData.rateSource && option.id === 'Global')
                      ? 'border-primary-600 bg-primary-50 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100'
                      : 'border-border bg-card/90 text-muted-foreground'
                  } ${option.id === 'Custom' ? 'col-span-2' : ''}`}
                >
                  <div className="text-sm font-semibold">{option.label}</div>
                  {option.id !== 'Custom' && (
                    <div className="text-xs opacity-80">
                      {option.value.toFixed(2)}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {transferData.rateSource === 'Custom' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 transform font-semibold text-muted-foreground">
                    Bs.
                  </div>
                  <input
                    type="number"
                    value={
                      transferData.exchangeRate
                        ? getFromAccount()?.currencyCode === 'VES' &&
                          getToAccount()?.currencyCode === 'USD'
                          ? 1 / transferData.exchangeRate
                          : transferData.exchangeRate
                        : ''
                    }
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!val) {
                        setTransferData((prev) => ({
                          ...prev,
                          exchangeRate: undefined,
                        }));
                        return;
                      }
                      const from = getFromAccount();
                      const to = getToAccount();
                      let finalRate = val;
                      if (
                        from?.currencyCode === 'VES' &&
                        to?.currencyCode === 'USD'
                      ) {
                        finalRate = 1 / val;
                      }
                      setTransferData((prev) => ({
                        ...prev,
                        exchangeRate: finalRate,
                      }));
                    }}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full rounded-xl border border-border bg-background py-4 pl-12 pr-4 text-lg font-semibold text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

      {/* Prominent Transfer Preview - Mobile */}
      {isFormValid() && (
        <div className="rounded-2xl border-2 border-primary-200/50 bg-gradient-to-r from-primary-50 via-background to-success-50 p-6 shadow-lg dark:border-primary-700/50 dark:from-primary-900/20 dark:via-background dark:to-success-900/20">
          <div className="mb-4 text-center">
            <h3 className="mb-1 text-xl font-bold text-foreground">
              Confirmar Transferencia
            </h3>
            <p className="text-sm text-muted-foreground">Revisa los datos</p>
          </div>

          <div className="rounded-xl border border-white/50 bg-white/80 p-4 backdrop-blur-sm dark:border-neutral-700/50 dark:bg-neutral-800/80">
            <div className="space-y-4">
              {/* From Account */}
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-md">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
                  Cuenta Origen
                </p>
                <p className="font-bold text-foreground">
                  {getFromAccount()?.name}
                </p>
                <p className="amount-negative text-xl font-black">
                  -
                  {formatBalance(
                    toMinorUnits(
                      transferData.amount,
                      getFromAccount()?.currencyCode || 'VES'
                    ),
                    getFromAccount()?.currencyCode || 'VES'
                  )}
                </p>
              </div>

              {/* Arrow */}
              <div className="text-center">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-success-500">
                  <svg
                    className="h-4 w-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>

              {/* To Account */}
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-success-500 to-success-600 shadow-md">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-success-600 dark:text-success-400">
                  Cuenta Destino
                </p>
                <p className="font-bold text-foreground">
                  {getToAccount()?.name}
                </p>
                <p className="amount-positive text-xl font-black">
                  +
                  {formatBalance(
                    toMinorUnits(
                      getPreviewTargetAmount(),
                      getToAccount()?.currencyCode || 'VES'
                    ),
                    getToAccount()?.currencyCode || 'VES'
                  )}
                </p>
              </div>

              {transferData.description && (
                <div className="mt-4 border-t border-border/40 pt-4">
                  <p className="text-center text-sm text-muted-foreground">
                    <span className="font-medium">Descripción:</span>{' '}
                    {transferData.description}
                  </p>
                </div>
              )}

              <div className="border-t border-border/40 pt-4">
                <p className="text-center text-sm text-muted-foreground">
                  <span className="font-medium">Fecha:</span>{' '}
                  {formatTransferDate(transferData.date)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Summary */}
      {isFormValid() && (
        <div className="rounded-2xl border border-primary-200/50 bg-gradient-to-r from-primary-50/50 to-primary-100/50 p-6 dark:border-primary-700/50 dark:from-primary-900/20 dark:to-primary-800/20">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Resumen de Transferencia
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Desde:</span>
              <span className="font-medium text-foreground">
                {getFromAccount()?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hacia:</span>
              <span className="font-medium text-foreground">
                {getToAccount()?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monto:</span>
              <span className="font-bold text-foreground">
                {formatCurrencyWithBCV(
                  toMinorUnits(
                    transferData.amount,
                    getFromAccount()?.currencyCode || 'USD'
                  ),
                  getFromAccount()?.currencyCode || 'USD'
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha:</span>
              <span className="font-medium text-foreground">
                {formatTransferDate(transferData.date)}
              </span>
            </div>

            {/* Balance Changes */}
            <div className="border-t border-border/40 pt-4">
              <h4 className="mb-3 text-center font-semibold text-foreground">
                Saldos después de la transferencia
              </h4>
              <div className="space-y-3">
                {/* From Account Balance */}
                <div className="rounded-xl border border-error-200 bg-error-50 p-3 dark:border-error-700/50 dark:bg-error-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {getFromAccount()?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">Origen</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {getFromAccount()
                          ? formatBalance(
                              getFromAccount()!.balance,
                              getFromAccount()!.currencyCode
                            )
                          : '--'}
                      </p>
                      <p className="text-sm font-bold text-error-500 dark:text-error-400">
                        {/* Resta el monto en la moneda de origen (convertido a minor units) */}
                        →{' '}
                        {getFromAccount()
                          ? formatBalance(
                              getFromAccount()!.balance -
                                toMinorUnits(
                                  transferData.amount,
                                  getFromAccount()!.currencyCode
                                ),
                              getFromAccount()!.currencyCode
                            )
                          : '--'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* To Account Balance */}
                <div className="rounded-xl border border-success-200 bg-success-50 p-3 dark:border-success-700/50 dark:bg-success-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {getToAccount()?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">Destino</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {getToAccount()
                          ? formatBalance(
                              getToAccount()!.balance,
                              getToAccount()!.currencyCode
                            )
                          : '--'}
                      </p>
                      <p className="text-sm font-bold text-success-500 dark:text-success-400">
                        {/* Suma el monto convertido (si hay exchangeRate) en la moneda de destino (convertido a minor units) */}
                        →{' '}
                        {getToAccount()
                          ? formatBalance(
                              getToAccount()!.balance +
                                toMinorUnits(
                                  getFromAccount()?.currencyCode !==
                                    getToAccount()?.currencyCode &&
                                    transferData.exchangeRate
                                    ? transferData.amount *
                                        transferData.exchangeRate
                                    : transferData.amount,
                                  getToAccount()!.currencyCode
                                ),
                              getToAccount()!.currencyCode
                            )
                          : '--'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {transferData.description && (
              <div className="border-t border-border/40 pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descripción:</span>
                  <span className="text-foreground">
                    {transferData.description}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {transferData.amount > 0 && (
        <div className="flex space-x-3">
          <button
            onClick={() => router.back()}
            className="flex flex-1 items-center justify-center space-x-2 rounded-xl bg-muted px-6 py-4 font-semibold text-foreground transition-colors hover:bg-muted/80"
          >
            <X className="h-5 w-5" />
            <span>Cancelar</span>
          </button>
          <button
            onClick={handleTransfer}
            disabled={!isFormValid() || loading}
            className="flex flex-1 items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 font-semibold text-white transition-all hover:from-primary-700 hover:to-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Check className="h-5 w-5" />
                <span>Transferir</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
