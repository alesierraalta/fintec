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
  Bitcoin,
  Send
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
    if (!fromAccount || fromAccount.balance < transferData.amount) {
      alert('Saldo insuficiente en la cuenta origen');
      return;
    }

    setLoading(true);
    
    try {
      // Here you would implement the actual transfer logic
      // For now, we'll just show a success message
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert(`Transferencia exitosa: $${transferData.amount.toFixed(2)} de ${fromAccount.name} a ${getToAccount()?.name}`);
      
      // Reset form
      setTransferData({
        fromAccountId: '',
        toAccountId: '',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      
    } catch (error) {
      alert('Error al procesar la transferencia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Transferir Dinero</h1>
        <p className="text-text-muted">Transfiere dinero entre tus cuentas de forma segura</p>
      </div>

      {/* Main Transfer Form */}
      <div className="space-y-8">
          <div className="bg-background-elevated rounded-3xl p-8 border border-border-primary">
            <h2 className="text-2xl font-semibold text-text-primary mb-6">Seleccionar Cuentas</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* From Account */}
              <div className="space-y-4">
                <label className="text-lg font-medium text-text-secondary">Cuenta Origen</label>
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
                    <div className="p-6 rounded-2xl border-2 border-border-primary bg-background-secondary">
                      <p className="text-text-muted text-center">No tienes cuentas disponibles</p>
                    </div>
                  ) : accounts.map((account) => (
                    <button
                      key={`from-${account.id}`}
                      onClick={() => setTransferData(prev => ({ ...prev, fromAccountId: account.id }))}
                      className={`w-full p-6 rounded-2xl border-2 transition-all ${
                        transferData.fromAccountId === account.id
                          ? 'border-accent-primary bg-accent-primary/10 shadow-lg shadow-accent-primary/20'
                          : 'border-border-primary bg-background-secondary hover:border-border-secondary hover:bg-background-tertiary'
                      }`}
                      disabled={transferData.toAccountId === account.id}
                    >
                      <div className="flex items-center space-x-4">
                        {getAccountIcon(account.currencyCode)}
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-text-primary">{account.name}</p>
                          <p className="text-text-muted">{formatBalance(account.balance, account.currencyCode)}</p>
                        </div>
                        {transferData.fromAccountId === account.id && (
                          <Check className="h-6 w-6 text-accent-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* To Account */}
              <div className="space-y-4">
                <label className="text-lg font-medium text-text-secondary">Cuenta Destino</label>
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
                    <div className="p-6 rounded-2xl border-2 border-border-primary bg-background-secondary">
                      <p className="text-text-muted text-center">No tienes cuentas disponibles</p>
                    </div>
                  ) : accounts.map((account) => (
                    <button
                      key={`to-${account.id}`}
                      onClick={() => setTransferData(prev => ({ ...prev, toAccountId: account.id }))}
                      className={`w-full p-6 rounded-2xl border-2 transition-all ${
                        transferData.toAccountId === account.id
                          ? 'border-accent-primary bg-accent-primary/10 shadow-lg shadow-accent-primary/20'
                          : 'border-border-primary bg-background-secondary hover:border-border-secondary hover:bg-background-tertiary'
                      }`}
                      disabled={transferData.fromAccountId === account.id}
                    >
                      <div className="flex items-center space-x-4">
                        {getAccountIcon(account.currencyCode)}
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-text-primary">{account.name}</p>
                          <p className="text-text-muted">{formatBalance(account.balance, account.currencyCode)}</p>
                        </div>
                        {transferData.toAccountId === account.id && (
                          <Check className="h-6 w-6 text-accent-primary" />
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
            <div className="bg-background-elevated rounded-3xl p-8 border border-border-primary">
              <h2 className="text-2xl font-semibold text-text-primary mb-6">Detalles de la Transferencia</h2>
              
              <div className="space-y-6">
                {/* Amount Input */}
                <div className="space-y-4">
                  <label className="text-lg font-medium text-text-secondary">Monto</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-text-muted" />
                    <input
                      type="number"
                      value={transferData.amount || ''}
                      onChange={(e) => setTransferData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-background-secondary border border-border-primary text-text-primary text-xl font-semibold placeholder-text-muted focus:outline-none focus:border-accent-primary transition-colors"
                    />
                  </div>
                  <p className="text-sm text-text-muted">
                    Saldo disponible: {getFromAccount() ? formatBalance(getFromAccount()!.balance, getFromAccount()!.currencyCode) : '--'}
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-4">
                  <label className="text-lg font-medium text-text-secondary">Descripción (opcional)</label>
                  <textarea
                    value={transferData.description}
                    onChange={(e) => setTransferData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe el motivo de la transferencia..."
                    rows={4}
                    className="w-full p-4 rounded-xl bg-background-secondary border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          )}

        {/* Prominent Transfer Preview - Full Width */}
        {isFormValid() && (
          <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10 rounded-3xl p-8 border-2 border-blue-200/50 shadow-lg shadow-blue-500/10">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Confirmar Transferencia</h3>
              <p className="text-gray-600">Revisa los datos antes de continuar</p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <div className="bg-white/80 rounded-2xl p-6 backdrop-blur-sm border border-white/50">
                <div className="flex items-center justify-between">
                  {/* From Account */}
                  <div className="flex-1 text-center">
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                        <Wallet className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Cuenta Origen</p>
                      <p className="font-bold text-gray-800 text-lg">{getFromAccount()?.name}</p>
                      <p className="text-2xl font-black text-blue-700 drop-shadow-sm">
                        -{formatBalance(toMinorUnits(transferData.amount, getFromAccount()?.currencyCode || 'VES'), getFromAccount()?.currencyCode || 'VES')}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="px-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  {/* To Account */}
                  <div className="flex-1 text-center">
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                        <Wallet className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Cuenta Destino</p>
                      <p className="font-bold text-gray-800 text-lg">{getToAccount()?.name}</p>
                      <p className="text-2xl font-black text-green-700 drop-shadow-sm">
                        +{formatBalance(toMinorUnits(transferData.amount, getToAccount()?.currencyCode || 'VES'), getToAccount()?.currencyCode || 'VES')}
                      </p>
                    </div>
                  </div>
                </div>

                {transferData.description && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-600 text-center">
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
                className="w-full bg-gradient-to-r from-accent-primary to-accent-secondary hover:from-accent-primary/80 hover:to-accent-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all flex items-center justify-center space-x-3 shadow-lg shadow-accent-primary/25"
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
                className="w-full bg-background-tertiary hover:bg-background-elevated text-text-primary py-4 px-6 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center space-x-3"
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
