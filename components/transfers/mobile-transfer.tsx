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
import { BalancePreview } from './balance-preview';



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
  const { user } = useAuth();
  
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
        console.error('Error loading accounts for transfers:', err);
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
  }, [user, repository]);

  const getAccountIcon = (currencyCode: string) => {
    if (currencyCode === 'BTC' || currencyCode.includes('BTC')) {
      return <Bitcoin className="h-5 w-5 text-orange-500" />;
    }
    return <Wallet className="h-5 w-5 text-blue-500" />;
  };

  const formatBalance = (balance: number, currencyCode: string) => {
    if (currencyCode === 'BTC') {
      return `${balance.toFixed(8)} ${currencyCode}`;
    }
    if (currencyCode === 'VES') {
      return `Bs. ${balance.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
    }
    return `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currencyCode}`;
  };

  const getFromAccount = () => accounts.find(acc => acc.id === transferData.fromAccountId);
  const getToAccount = () => accounts.find(acc => acc.id === transferData.toAccountId);

  const isFormValid = () => {
    return transferData.fromAccountId && 
           transferData.toAccountId && 
           transferData.fromAccountId !== transferData.toAccountId &&
           transferData.amount > 0 &&
           transferData.description.trim();
  };

  const handleTransfer = async () => {
    if (!isFormValid()) {
      alert('Por favor complete todos los campos');
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
      console.error('Error en transferencia:', error);
      alert('Error al procesar la transferencia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Transferir Dinero</h1>
        <p className="text-text-muted">Entre mis cuentas</p>
      </div>

      {/* Account Selection */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-text-primary">Seleccionar Cuentas</h2>
        
        {/* From Account */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-text-secondary">Cuenta Origen</label>
          <div className="space-y-2">
            {loadingAccounts ? (
              <div className="p-4 rounded-2xl border-2 border-border-primary bg-background-elevated">
                <p className="text-text-muted text-center text-sm">Cargando cuentas...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl border-2 border-red-500 bg-red-500/10">
                <p className="text-red-500 text-center text-sm">{error}</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-4 rounded-2xl border-2 border-border-primary bg-background-elevated">
                <p className="text-text-muted text-center text-sm">No tienes cuentas disponibles</p>
              </div>
            ) : accounts.map((account) => (
              <button
                key={`from-${account.id}`}
                onClick={() => setTransferData(prev => ({ ...prev, fromAccountId: account.id }))}
                className={`w-full p-4 rounded-2xl border-2 transition-all ${
                  transferData.fromAccountId === account.id
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border-primary bg-background-elevated hover:border-border-secondary'
                }`}
                disabled={transferData.toAccountId === account.id}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getAccountIcon(account.currencyCode)}
                    <div className="text-left">
                      <p className="font-medium text-text-primary">{account.name}</p>
                      <p className="text-sm text-text-muted">{account.currencyCode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-text-primary">
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
            <div className="p-3 rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary">
              <ArrowRightLeft className="h-6 w-6 text-white" />
            </div>
          </div>
        )}

        {/* To Account */}
        {transferData.fromAccountId && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-text-secondary">Cuenta Destino</label>
            <div className="space-y-2">
              {accounts
                .filter(account => account.id !== transferData.fromAccountId)
                .map((account) => (
                  <button
                    key={`to-${account.id}`}
                    onClick={() => setTransferData(prev => ({ ...prev, toAccountId: account.id }))}
                    className={`w-full p-4 rounded-2xl border-2 transition-all ${
                      transferData.toAccountId === account.id
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-border-primary bg-background-elevated hover:border-border-secondary'
                    }`}
                  >
                                    <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getAccountIcon(account.currencyCode)}
                    <div className="text-left">
                      <p className="font-medium text-text-primary">{account.name}</p>
                      <p className="text-sm text-text-muted">{account.currencyCode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-text-primary">
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
          <h3 className="text-lg font-semibold text-text-primary">Detalles de la Transferencia</h3>
          
          {/* Amount Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-text-secondary">Monto</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-muted" />
              <input
                type="number"
                value={transferData.amount || ''}
                onChange={(e) => setTransferData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-background-elevated border border-border-primary text-text-primary text-lg font-semibold placeholder-text-muted focus:outline-none focus:border-accent-primary transition-colors"
              />
            </div>
            <p className="text-sm text-text-muted">
              Saldo disponible: {getFromAccount() ? formatBalance(getFromAccount()!.balance, getFromAccount()!.currency, getFromAccount()!.currencyType) : '--'}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-text-secondary">Descripción</label>
            <textarea
              value={transferData.description}
              onChange={(e) => setTransferData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe el motivo de la transferencia..."
              rows={3}
              className="w-full p-4 rounded-xl bg-background-elevated border border-border-primary text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary transition-colors resize-none"
            />
          </div>
        </div>
      )}

      {/* Balance Preview - Compact version after details */}
      {transferData.fromAccountId && transferData.toAccountId && transferData.amount > 0 && (
        <BalancePreview
          fromAccount={getFromAccount()!}
          toAccount={getToAccount()!}
          transferAmount={transferData.amount}
          formatBalance={formatBalance}
          isMobile={true}
          size="compact"
        />
      )}

      {/* Transfer Summary */}
      {isFormValid() && (
        <div className="bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 rounded-2xl p-6 border border-accent-primary/20">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Resumen de Transferencia</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-text-muted">Desde:</span>
              <span className="text-text-primary font-medium">{getFromAccount()?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Hacia:</span>
              <span className="text-text-primary font-medium">{getToAccount()?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Monto:</span>
              <span className="text-text-primary font-bold">${transferData.amount.toFixed(2)}</span>
            </div>
            
            {/* Balance Changes */}
            <div className="border-t border-border-primary pt-4">
              <h4 className="text-text-primary font-semibold mb-3 text-center">Saldos después de la transferencia</h4>
              <div className="space-y-3">
                {/* From Account Balance */}
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-text-primary text-sm">{getFromAccount()?.name}</p>
                      <p className="text-xs text-text-muted">Origen</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-muted">
                        {getFromAccount() ? formatBalance(getFromAccount()!.balance, getFromAccount()!.currency, getFromAccount()!.currencyType) : '--'}
                      </p>
                      <p className="font-bold text-red-400 text-sm">
                        → {getFromAccount() ? formatBalance(getFromAccount()!.balance - transferData.amount, getFromAccount()!.currency, getFromAccount()!.currencyType) : '--'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* To Account Balance */}
                <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-text-primary text-sm">{getToAccount()?.name}</p>
                      <p className="text-xs text-text-muted">Destino</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-muted">
                        {getToAccount() ? formatBalance(getToAccount()!.balance, getToAccount()!.currencyCode) : '--'}
                      </p>
                      <p className="font-bold text-green-400 text-sm">
                        → {getToAccount() ? formatBalance(getToAccount()!.balance + transferData.amount, getToAccount()!.currencyCode) : '--'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {transferData.description && (
              <div className="border-t border-border-primary pt-3">
                <div className="flex justify-between">
                  <span className="text-text-muted">Descripción:</span>
                  <span className="text-text-primary">{transferData.description}</span>
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
            className="flex-1 bg-background-tertiary hover:bg-background-elevated text-text-primary py-4 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <X className="h-5 w-5" />
            <span>Cancelar</span>
          </button>
          <button
            onClick={handleTransfer}
            disabled={!isFormValid() || loading}
            className="flex-1 bg-gradient-to-r from-accent-primary to-accent-secondary hover:from-accent-primary/80 hover:to-accent-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 px-6 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2"
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