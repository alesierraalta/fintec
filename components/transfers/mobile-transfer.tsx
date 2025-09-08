'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRightLeft,
  Wallet,
  DollarSign,
  Check,
  X,
  Bitcoin
} from 'lucide-react';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import type { Account } from '@/types/domain';
import { formatCurrencyWithBCV } from '@/lib/currency-ves';
import { toMinorUnits } from '@/lib/money';



interface TransferData {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  date: string;
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
    date: ''
  });

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
      return <Bitcoin className="h-5 w-5 text-orange-500" />;
    }
    return <Wallet className="h-5 w-5 text-blue-500" />;
  };

  const formatBalance = (balanceMinor: number, currencyCode: string) => {
    // Use VES-aware formatting that handles minor units properly
    return formatCurrencyWithBCV(balanceMinor, currencyCode, {
      showUSDEquivalent: currencyCode === 'VES',
      locale: 'es-ES'
    });
  };

  const getFromAccount = () => accounts.find(acc => acc.id === transferData.fromAccountId);
  const getToAccount = () => accounts.find(acc => acc.id === transferData.toAccountId);

  const isFormValid = () => {
    return transferData.fromAccountId && 
           transferData.toAccountId && 
           transferData.fromAccountId !== transferData.toAccountId &&
           transferData.amount > 0;
  };

  const handleTransfer = async () => {
    if (!isFormValid()) {
      alert('Por favor complete cuenta origen, destino y monto');
      return;
    }

    const fromAccount = getFromAccount();
    const toAccount = getToAccount();
    if (!fromAccount || fromAccount.balance < transferData.amount) {
      alert('Saldo insuficiente en la cuenta origen');
      return;
    }

    if (!toAccount) {
      alert('Error: No se pudo encontrar la cuenta destino');
      return;
    }

    setLoading(true);
    
    try {
      // Call the real API endpoint
      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromAccountId: transferData.fromAccountId,
          toAccountId: transferData.toAccountId,
          amount: transferData.amount,
          description: transferData.description || `Transferencia de ${fromAccount.name} a ${toAccount.name}`,
          date: transferData.date,
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
      console.error('Transfer error:', error);
      alert(`Error al procesar la transferencia: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Transferir Dinero</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Entre mis cuentas</p>
      </div>

      {/* Account Selection */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Seleccionar Cuentas</h2>
        
        {/* From Account */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Cuenta Origen</label>
          <div className="space-y-2">
            {loadingAccounts ? (
              <div className="p-4 rounded-2xl border-2 border-white/20 bg-card/60 backdrop-blur-xl shadow-lg">
                <p className="text-neutral-500 dark:text-neutral-400 text-center text-sm">Cargando cuentas...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl border-2 border-error-500 dark:border-error-400 bg-error-50 dark:bg-error-900/20">
                <p className="text-error-600 dark:text-error-400 text-center text-sm">{error}</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-4 rounded-2xl border-2 border-white/20 bg-card/60 backdrop-blur-xl shadow-lg">
                <p className="text-neutral-500 dark:text-neutral-400 text-center text-sm">No tienes cuentas disponibles</p>
              </div>
            ) : accounts.map((account) => (
              <button
                key={`from-${account.id}`}
                onClick={() => setTransferData(prev => ({ ...prev, fromAccountId: account.id }))}
                className={`w-full p-4 rounded-2xl border-2 transition-all ${
                  transferData.fromAccountId === account.id
                    ? 'border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-white/20 bg-card/60 backdrop-blur-xl hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
                disabled={transferData.toAccountId === account.id}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getAccountIcon(account.currencyCode)}
                    <div className="text-left">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{account.name}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{account.currencyCode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatBalance(account.balance, account.currencyCode)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Transfer Icon */}
        {transferData.fromAccountId && (
          <div className="flex justify-center py-2">
            <div className="p-3 rounded-full bg-gradient-to-r from-primary-600 to-primary-700">
              <ArrowRightLeft className="h-6 w-6 text-white" />
            </div>
          </div>
        )}

        {/* To Account */}
        {transferData.fromAccountId && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Cuenta Destino</label>
            <div className="space-y-2">
              {accounts
                .filter(account => account.id !== transferData.fromAccountId)
                .map((account) => (
                  <button
                    key={`to-${account.id}`}
                    onClick={() => setTransferData(prev => ({ ...prev, toAccountId: account.id }))}
                    className={`w-full p-4 rounded-2xl border-2 transition-all ${
                      transferData.toAccountId === account.id
                        ? 'border-success-500 dark:border-success-400 bg-success-50 dark:bg-success-900/20'
                        : 'border-white/20 bg-card/60 backdrop-blur-xl hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                                    <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getAccountIcon(account.currencyCode)}
                    <div className="text-left">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{account.name}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{account.currencyCode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatBalance(account.balance, account.currencyCode)}
                    </p>
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
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Detalles de la Transferencia</h3>
          
          {/* Amount Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Monto</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-500 dark:text-neutral-400" />
              <input
                type="number"
                value={transferData.amount || ''}
                onChange={(e) => setTransferData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-card/60 backdrop-blur-xl border border-white/20 shadow-lg text-neutral-900 dark:text-neutral-100 text-lg font-semibold placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:border-primary-500 dark:focus:border-primary-400 transition-colors"
              />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Saldo disponible: {getFromAccount() ? formatBalance(getFromAccount()!.balance, getFromAccount()!.currencyCode) : '--'}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Descripción</label>
            <textarea
              value={transferData.description}
              onChange={(e) => setTransferData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe el motivo de la transferencia..."
              rows={3}
              className="w-full p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-white/20 shadow-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:border-primary-500 dark:focus:border-primary-400 transition-colors resize-none"
            />
          </div>
        </div>
      )}

      {/* Prominent Transfer Preview - Mobile */}
      {isFormValid() && (
        <div className="bg-gradient-to-r from-primary-50 via-primary-100/50 to-success-50 dark:from-primary-900/20 dark:via-primary-800/20 dark:to-success-900/20 rounded-2xl p-6 border-2 border-primary-200/50 dark:border-primary-700/50 shadow-lg">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">Confirmar Transferencia</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Revisa los datos</p>
          </div>
          
          <div className="bg-white/80 dark:bg-neutral-800/80 rounded-xl p-4 backdrop-blur-sm border border-white/50 dark:border-neutral-700/50">
            <div className="space-y-4">
              {/* From Account */}
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl mx-auto flex items-center justify-center shadow-md mb-2">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wide mb-1">Cuenta Origen</p>
                <p className="font-bold text-neutral-900 dark:text-neutral-100">{getFromAccount()?.name}</p>
                <p className="text-xl font-black text-primary-700 dark:text-primary-400">
                  -{formatBalance(toMinorUnits(transferData.amount, getFromAccount()?.currencyCode || 'VES'), getFromAccount()?.currencyCode || 'VES')}
                </p>
              </div>

              {/* Arrow */}
              <div className="text-center">
                <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-success-500 rounded-full mx-auto flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* To Account */}
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-xl mx-auto flex items-center justify-center shadow-md mb-2">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <p className="text-xs font-medium text-success-600 dark:text-success-400 uppercase tracking-wide mb-1">Cuenta Destino</p>
                <p className="font-bold text-neutral-900 dark:text-neutral-100">{getToAccount()?.name}</p>
                <p className="text-xl font-black text-success-700 dark:text-success-400">
                  +{formatBalance(toMinorUnits(transferData.amount, getToAccount()?.currencyCode || 'VES'), getToAccount()?.currencyCode || 'VES')}
                </p>
              </div>

              {transferData.description && (
                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
                    <span className="font-medium">Descripción:</span> {transferData.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Summary */}
      {isFormValid() && (
        <div className="bg-gradient-to-r from-primary-50/50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/20 rounded-2xl p-6 border border-primary-200/50 dark:border-primary-700/50">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Resumen de Transferencia</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Desde:</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-medium">{getFromAccount()?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Hacia:</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-medium">{getToAccount()?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Monto:</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-bold">${transferData.amount.toFixed(2)}</span>
            </div>
            
            {/* Balance Changes */}
            <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
              <h4 className="text-neutral-900 dark:text-neutral-100 font-semibold mb-3 text-center">Saldos después de la transferencia</h4>
              <div className="space-y-3">
                {/* From Account Balance */}
                <div className="p-3 bg-error-50 dark:bg-error-900/20 rounded-xl border border-error-200 dark:border-error-700/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">{getFromAccount()?.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Origen</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {getFromAccount() ? formatBalance(getFromAccount()!.balance, getFromAccount()!.currencyCode) : '--'}
                      </p>
                      <p className="font-bold text-error-500 dark:text-error-400 text-sm">
                        → {getFromAccount() ? formatBalance(getFromAccount()!.balance - transferData.amount, getFromAccount()!.currencyCode) : '--'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* To Account Balance */}
                <div className="p-3 bg-success-50 dark:bg-success-900/20 rounded-xl border border-success-200 dark:border-success-700/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">{getToAccount()?.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Destino</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {getToAccount() ? formatBalance(getToAccount()!.balance, getToAccount()!.currencyCode) : '--'}
                      </p>
                      <p className="font-bold text-success-500 dark:text-success-400 text-sm">
                        → {getToAccount() ? formatBalance(getToAccount()!.balance + transferData.amount, getToAccount()!.currencyCode) : '--'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {transferData.description && (
              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3">
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Descripción:</span>
                  <span className="text-neutral-900 dark:text-neutral-100">{transferData.description}</span>
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
            className="flex-1 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-900 dark:text-neutral-100 py-4 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <X className="h-5 w-5" />
            <span>Cancelar</span>
          </button>
          <button
            onClick={handleTransfer}
            disabled={!isFormValid() || loading}
            className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 px-6 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
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
