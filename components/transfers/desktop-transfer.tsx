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
  Send,
  RotateCcw,
} from 'lucide-react';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import type { Account } from '@/types/domain';
import { formatCurrencyWithBCV } from '@/lib/currency-ves';
import { toMinorUnits } from '@/lib/money';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { useAppStore } from '@/lib/store';
import {
  calculateExchangeRateFromAmounts,
  calculateSourceAmountFromTarget,
  calculateTargetAmountFromSource,
  isExchangeableTransferPair,
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

type TransferExchangeMode = 'manual' | 'auto';

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
    rateSource: undefined,
  });
  const [amountError, setAmountError] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState(0);
  const [lastAmountEdited, setLastAmountEdited] = useState<'source' | 'target'>(
    'source'
  );
  const [exchangeMode, setExchangeMode] =
    useState<TransferExchangeMode>('manual');
  const selectedRateSource = useAppStore((state) => state.selectedRateSource);
  const bcvRates = useBCVRates();
  const { rates: binanceRates } = useBinanceRates();
  const activeUsdVes =
    selectedRateSource === 'binance'
      ? (binanceRates?.usd_ves ?? binanceRates?.sell_rate?.avg ?? 0)
      : bcvRates.usd || 0;

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
      return <Bitcoin className="h-6 w-6 text-orange-500" />;
    }
    return <Wallet className="h-6 w-6 text-blue-500" />;
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

    // Same currency parsing logic
    if (from.currencyCode === to.currencyCode) {
      if (
        !isExchangeableTransferPair(from.currencyCode, to.currencyCode) &&
        transferData.exchangeRate !== 1.0
      ) {
        setTransferData((prev) => ({
          ...prev,
          exchangeRate: 1.0,
          rateSource: undefined,
        }));
      }
      return;
    }

    if (
      exchangeMode === 'auto' &&
      isExchangeableTransferPair(from.currencyCode, to.currencyCode)
    ) {
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
    exchangeMode,
    getFromAccount,
    getToAccount,
  ]);

  useEffect(() => {
    const from = getFromAccount();
    const to = getToAccount();

    if (
      !from ||
      !to ||
      !isExchangeableTransferPair(from.currencyCode, to.currencyCode)
    ) {
      if (targetAmount !== 0) {
        setTargetAmount(0);
      }
      return;
    }

    if (exchangeMode === 'auto') {
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
    exchangeMode,
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
      exchangeMode === 'auto' &&
      isExchangeableTransferPair(from.currencyCode, to.currencyCode)
    ) {
      return targetAmount;
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

    // Convert amount to minor units for comparison
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

      toast.success(
        `Transferencia exitosa: $${transferData.amount.toFixed(2)} de ${fromAccount.name} a ${toAccount.name}`
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
      setExchangeMode('manual');
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
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Transferir Dinero
        </h1>
        <p className="text-muted-foreground">
          Transfiere dinero entre tus cuentas de forma segura
        </p>
      </div>

      {/* Main Transfer Form */}
      <div className="space-y-8">
        <div className="rounded-3xl border border-border/40 bg-card/90 p-8 shadow-lg backdrop-blur-xl">
          <h2 className="mb-6 text-2xl font-semibold text-foreground">
            Seleccionar Cuentas
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* From Account */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-lg font-medium text-foreground">
                  Cuenta Origen
                </label>
                {transferData.fromAccountId && (
                  <button
                    onClick={clearFromAccount}
                    className="focus-ring flex min-h-[44px] items-center space-x-1 px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-red-600"
                    title="Deseleccionar cuenta origen"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Limpiar</span>
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {loadingAccounts ? (
                  <div className="rounded-2xl border-2 border-border bg-muted/30 p-6">
                    <p className="text-center text-muted-foreground">
                      Cargando cuentas...
                    </p>
                  </div>
                ) : error ? (
                  <div className="rounded-2xl border-2 border-error-500 bg-error-50 p-6 dark:border-error-400 dark:bg-error-900/20">
                    <p className="text-center text-error-600 dark:text-error-400">
                      {error}
                    </p>
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="rounded-2xl border-2 border-border bg-muted/30 p-6">
                    <p className="text-center text-muted-foreground">
                      No tienes cuentas disponibles
                    </p>
                  </div>
                ) : (
                  accounts.map((account) => (
                    <button
                      key={`from-${account.id}`}
                      onClick={() => handleFromAccountSelect(account.id)}
                      className={`relative w-full rounded-2xl border-2 p-6 transition-all ${
                        transferData.fromAccountId === account.id
                          ? 'border-primary-600 bg-primary-50 shadow-lg shadow-primary-500/20 dark:border-primary-400 dark:bg-primary-900/20'
                          : 'border-border bg-card/70 hover:border-primary/40 hover:bg-card'
                      }`}
                      disabled={
                        transferData.toAccountId === account.id &&
                        transferData.fromAccountId !== account.id
                      }
                    >
                      <div className="flex items-center space-x-4">
                        {getAccountIcon(account.currencyCode)}
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-foreground">
                            {account.name}
                          </p>
                          <p className="text-muted-foreground">
                            {formatBalance(
                              account.balance,
                              account.currencyCode
                            )}
                          </p>
                        </div>
                        {transferData.fromAccountId === account.id && (
                          <div className="flex items-center space-x-2">
                            <Check className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                            <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                              Haz clic para deseleccionar
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* To Account */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-lg font-medium text-foreground">
                  Cuenta Destino
                </label>
                {transferData.toAccountId && (
                  <button
                    onClick={clearToAccount}
                    className="focus-ring flex min-h-[44px] items-center space-x-1 px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-red-600"
                    title="Deseleccionar cuenta destino"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Limpiar</span>
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {loadingAccounts ? (
                  <div className="rounded-2xl border-2 border-border bg-muted/30 p-6">
                    <p className="text-center text-muted-foreground">
                      Cargando cuentas...
                    </p>
                  </div>
                ) : error ? (
                  <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-6 dark:border-red-400 dark:bg-red-900/20">
                    <p className="text-center text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="rounded-2xl border-2 border-border bg-muted/30 p-6">
                    <p className="text-center text-muted-foreground">
                      No tienes cuentas disponibles
                    </p>
                  </div>
                ) : (
                  accounts.map((account) => (
                    <button
                      key={`to-${account.id}`}
                      onClick={() => handleToAccountSelect(account.id)}
                      className={`relative w-full rounded-2xl border-2 p-6 transition-all ${
                        transferData.toAccountId === account.id
                          ? 'border-primary-600 bg-primary-50 shadow-lg shadow-primary-500/20 dark:border-primary-400 dark:bg-primary-900/20'
                          : 'border-border bg-card/70 hover:border-primary/40 hover:bg-card'
                      }`}
                      disabled={
                        transferData.fromAccountId === account.id &&
                        transferData.toAccountId !== account.id
                      }
                    >
                      <div className="flex items-center space-x-4">
                        {getAccountIcon(account.currencyCode)}
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-foreground">
                            {account.name}
                          </p>
                          <p className="text-muted-foreground">
                            {formatBalance(
                              account.balance,
                              account.currencyCode
                            )}
                          </p>
                        </div>
                        {transferData.toAccountId === account.id && (
                          <div className="flex items-center space-x-2">
                            <Check className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                            <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                              Haz clic para deseleccionar
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Amount and Description */}
        {transferData.fromAccountId && transferData.toAccountId && (
          <div className="rounded-3xl border border-border/40 bg-card/90 p-8 shadow-lg backdrop-blur-xl">
            <h2 className="mb-6 text-2xl font-semibold text-foreground">
              Detalles de la Transferencia
            </h2>

            <div className="space-y-6">
              {/* Amount Input */}
              <div className="space-y-4">
                <label className="text-lg font-medium text-foreground">
                  Monto
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 transform text-muted-foreground" />
                  <input
                    type="number"
                    value={transferData.amount || ''}
                    onChange={(e) => {
                      const newAmount = parseFloat(e.target.value) || 0;
                      const from = getFromAccount();
                      const to = getToAccount();

                      setLastAmountEdited('source');
                      setTransferData((prev) => ({
                        ...prev,
                        amount: newAmount,
                      }));

                      if (
                        exchangeMode === 'auto' &&
                        from &&
                        to &&
                        isExchangeableTransferPair(
                          from.currencyCode,
                          to.currencyCode
                        ) &&
                        newAmount > 0 &&
                        targetAmount > 0
                      ) {
                        const calculatedRate = calculateExchangeRateFromAmounts(
                          newAmount,
                          targetAmount,
                          from.currencyCode,
                          to.currencyCode
                        );

                        if (calculatedRate) {
                          setTransferData((prev) => ({
                            ...prev,
                            exchangeRate: calculatedRate,
                            rateSource: 'Custom',
                          }));
                        }
                      }

                      if (
                        exchangeMode === 'manual' &&
                        from &&
                        to &&
                        isExchangeableTransferPair(
                          from.currencyCode,
                          to.currencyCode
                        ) &&
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
                    className={`w-full rounded-xl border border-border bg-background py-4 pl-12 pr-4 text-xl font-semibold text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none ${
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
                  isExchangeableTransferPair(
                    getFromAccount()!.currencyCode,
                    getToAccount()!.currencyCode
                  ) && (
                    <div className="space-y-4 rounded-xl border border-primary-100 bg-primary-50/50 p-4 dark:border-primary-900/40 dark:bg-primary-900/10">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setExchangeMode('manual')}
                          aria-pressed={exchangeMode === 'manual'}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            exchangeMode === 'manual'
                              ? 'border-primary-500 bg-primary-100 text-primary-900 dark:bg-primary-900/30 dark:text-primary-100'
                              : 'border-border bg-background text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Modo normal
                        </button>
                        <button
                          type="button"
                          onClick={() => setExchangeMode('auto')}
                          aria-pressed={exchangeMode === 'auto'}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            exchangeMode === 'auto'
                              ? 'border-primary-500 bg-primary-100 text-primary-900 dark:bg-primary-900/30 dark:text-primary-100'
                              : 'border-border bg-background text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Auto tasa
                        </button>
                      </div>
                      <label className="text-sm font-medium text-foreground">
                        Monto Recibido ({getToAccount()!.currencyCode})
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 transform text-muted-foreground" />
                        <input
                          type="number"
                          value={targetAmount || ''}
                          onChange={(e) => {
                            const from = getFromAccount();
                            const to = getToAccount();
                            const newTargetAmount =
                              parseFloat(e.target.value) || 0;

                            setLastAmountEdited('target');
                            setTargetAmount(newTargetAmount);

                            if (
                              exchangeMode === 'auto' &&
                              from &&
                              to &&
                              isExchangeableTransferPair(
                                from.currencyCode,
                                to.currencyCode
                              ) &&
                              transferData.amount > 0 &&
                              newTargetAmount > 0
                            ) {
                              const calculatedRate =
                                calculateExchangeRateFromAmounts(
                                  transferData.amount,
                                  newTargetAmount,
                                  from.currencyCode,
                                  to.currencyCode
                                );

                              if (calculatedRate) {
                                setTransferData((prev) => ({
                                  ...prev,
                                  exchangeRate: calculatedRate,
                                  rateSource: 'Custom',
                                }));
                                return;
                              }
                            }

                            if (
                              exchangeMode === 'manual' &&
                              from &&
                              to &&
                              transferData.exchangeRate &&
                              transferData.exchangeRate > 0
                            ) {
                              const sourceAmount =
                                calculateSourceAmountFromTarget(
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
                          className="w-full rounded-xl border border-border bg-background py-4 pl-12 pr-4 text-xl font-semibold text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none"
                        />
                      </div>
                      {exchangeMode === 'auto' && (
                        <p className="text-xs text-muted-foreground">
                          {transferData.exchangeRate
                            ? `Tasa calculada (VES/USD): ${(getFromAccount()
                                ?.currencyCode === 'VES' &&
                              getToAccount()?.currencyCode === 'USD'
                                ? 1 / transferData.exchangeRate
                                : transferData.exchangeRate
                              ).toFixed(6)}`
                            : 'Ingresa monto origen y recibido para calcular la tasa automaticamente.'}
                        </p>
                      )}
                    </div>
                  )}
              </div>

              {/* Date */}
              <div className="space-y-4">
                <label className="text-lg font-medium text-foreground">
                  Fecha
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 transform text-muted-foreground" />
                  <input
                    type="date"
                    value={transferData.date}
                    onChange={(e) =>
                      setTransferData((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-background py-4 pl-12 pr-4 text-foreground transition-colors focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-4">
                <label className="text-lg font-medium text-foreground">
                  Descripción (opcional)
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
                  rows={4}
                  className="w-full resize-none rounded-xl border border-border bg-background p-4 text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Exchange Rate Selector */}
        {getFromAccount() &&
          getToAccount() &&
          getFromAccount()!.currencyCode !== getToAccount()!.currencyCode && (
            <div className="rounded-3xl border border-border/40 bg-card/90 p-8 shadow-lg backdrop-blur-xl">
              <h2 className="mb-6 text-2xl font-semibold text-foreground">
                Tasa de Cambio
              </h2>

              {(!isExchangeableTransferPair(
                getFromAccount()!.currencyCode,
                getToAccount()!.currencyCode
              ) ||
                exchangeMode === 'manual') && (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
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
                        className={`relative overflow-hidden rounded-xl border-2 p-4 text-center transition-all ${
                          transferData.rateSource === option.id ||
                          (!transferData.rateSource && option.id === 'Global')
                            ? 'border-primary-600 bg-primary-50 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100'
                            : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        }`}
                      >
                        <div className="font-semibold">{option.label}</div>
                        {option.id !== 'Custom' && (
                          <div className="text-sm opacity-80">
                            {option.value.toFixed(2)}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {transferData.rateSource === 'Custom' && (
                    <div className="animate-in fade-in slide-in-from-top-2 space-y-4 duration-200">
                      <label className="text-lg font-medium text-foreground">
                        Tasa Personalizada (VES/USD)
                      </label>
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
                            const from = getFromAccount();
                            const to = getToAccount();

                            if (!val) {
                              setTransferData((prev) => ({
                                ...prev,
                                exchangeRate: undefined,
                              }));
                              return;
                            }

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
                          className="w-full rounded-xl border border-border bg-background py-4 pl-12 pr-4 text-xl font-semibold text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        {/* Prominent Transfer Preview - Full Width */}
        {isFormValid() && (
          <div className="rounded-3xl border-2 border-primary-200/50 bg-gradient-to-r from-primary-50 via-background to-success-50 p-8 shadow-lg shadow-primary-500/10 dark:border-primary-700/50 dark:from-primary-900/20 dark:via-background dark:to-success-900/20">
            <div className="mb-6 text-center">
              <h3 className="mb-2 text-2xl font-bold text-foreground">
                Confirmar Transferencia
              </h3>
              <p className="text-muted-foreground">
                Revisa los datos antes de continuar
              </p>
            </div>

            <div className="mx-auto max-w-2xl">
              <div className="rounded-2xl border border-white/50 bg-white/80 p-6 backdrop-blur-sm dark:border-neutral-700/50 dark:bg-neutral-800/80">
                <div className="flex items-center justify-between">
                  {/* From Account */}
                  <div className="flex-1 text-center">
                    <div className="mb-4">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg">
                        <Wallet className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
                        Cuenta Origen
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {getFromAccount()?.name}
                      </p>
                      <p className="amount-strong text-2xl font-black text-primary-700 drop-shadow-sm dark:text-primary-300">
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
                  </div>

                  {/* Arrow */}
                  <div className="px-6">
                    <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-success-500 shadow-lg">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* To Account */}
                  <div className="flex-1 text-center">
                    <div className="mb-4">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-success-500 to-success-600 shadow-lg">
                        <Wallet className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-success-600 dark:text-success-400">
                        Cuenta Destino
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {getToAccount()?.name}
                      </p>
                      <p className="amount-strong text-2xl font-black text-success-700 drop-shadow-sm dark:text-success-300">
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
                  </div>
                </div>

                {transferData.description && (
                  <div className="mt-6 border-t border-border/40 pt-6">
                    <p className="text-center text-sm text-muted-foreground">
                      <span className="font-medium">Descripción:</span>{' '}
                      {transferData.description}
                    </p>
                  </div>
                )}

                <div className="mt-6 border-t border-border/40 pt-6">
                  <p className="text-center text-sm text-muted-foreground">
                    <span className="font-medium">Fecha:</span>{' '}
                    {formatTransferDate(transferData.date)}
                  </p>
                </div>
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
              className="flex w-full items-center justify-center space-x-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:from-primary-500 hover:to-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Check className="h-6 w-6" />
                  <span>Realizar Transferencia</span>
                </>
              )}
            </button>

            <button
              onClick={() => router.back()}
              className="flex w-full items-center justify-center space-x-3 rounded-xl bg-muted px-6 py-4 text-lg font-semibold text-foreground transition-colors hover:bg-muted/80"
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
