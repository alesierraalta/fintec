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
import { BalancePreview } from './balance-preview';

interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
  currencyType: 'fiat' | 'crypto';
  icon: string;
}

interface TransferData {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  date: string;
}

export function DesktopTransfer() {
  const router = useRouter();
  const { accountRepository } = useRepository();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferData, setTransferData] = useState<TransferData>({
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    description: '',
    date: ''
  });

  // Mock accounts - replace with real data
  const mockAccounts: Account[] = [
    {
      id: '1',
      name: 'Cuenta Principal',
      balance: 15420.50,
      currency: 'USD',
      currencyType: 'fiat',
      icon: 'wallet'
    },
    {
      id: '2',
      name: 'Ahorros',
      balance: 8750.25,
      currency: 'USD',
      currencyType: 'fiat',
      icon: 'wallet'
    },
    {
      id: '3',
      name: 'Bolívares',
      balance: 2450000.00,
      currency: 'VES',
      currencyType: 'fiat',
      icon: 'wallet'
    },
    {
      id: '4',
      name: 'Bitcoin',
      balance: 0.05432100,
      currency: 'BTC',
      currencyType: 'crypto',
      icon: 'bitcoin'
    }
  ];

  useEffect(() => {
    setAccounts(mockAccounts);
    setTransferData(prev => ({
      ...prev,
      date: new Date().toISOString().split('T')[0]
    }));
  }, []);

  const getAccountIcon = (iconName: string, currencyType: 'fiat' | 'crypto') => {
    if (iconName === 'bitcoin' || currencyType === 'crypto') {
      return <Bitcoin className="h-6 w-6 text-orange-500" />;
    }
    return <Wallet className="h-6 w-6 text-blue-500" />;
  };

  const formatBalance = (balance: number, currency: string, currencyType: 'fiat' | 'crypto') => {
    if (currencyType === 'crypto') {
      return `${balance.toFixed(8)} ${currency}`;
    }
    if (currency === 'VES') {
      return `Bs. ${balance.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
    }
    return `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}`;
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
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Transferir Dinero</h1>
        <p className="text-text-muted">Transfiere dinero entre tus cuentas de forma segura</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Account Selection */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-background-elevated rounded-3xl p-8 border border-border-primary">
            <h2 className="text-2xl font-semibold text-text-primary mb-6">Seleccionar Cuentas</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* From Account */}
              <div className="space-y-4">
                <label className="text-lg font-medium text-text-secondary">Cuenta Origen</label>
                <div className="space-y-3">
                  {accounts.map((account) => (
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {getAccountIcon(account.icon, account.currencyType)}
                          <div className="text-left">
                            <p className="font-semibold text-text-primary text-lg">{account.name}</p>
                            <p className="text-text-muted">{account.currency}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-text-primary text-lg">
                            {formatBalance(account.balance, account.currency, account.currencyType)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* To Account */}
              <div className="space-y-4">
                <label className="text-lg font-medium text-text-secondary">Cuenta Destino</label>
                <div className="space-y-3">
                  {accounts
                    .filter(account => account.id !== transferData.fromAccountId)
                    .map((account) => (
                      <button
                        key={`to-${account.id}`}
                        onClick={() => setTransferData(prev => ({ ...prev, toAccountId: account.id }))}
                        className={`w-full p-6 rounded-2xl border-2 transition-all ${
                          transferData.toAccountId === account.id
                            ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                            : 'border-border-primary bg-background-secondary hover:border-border-secondary hover:bg-background-tertiary'
                        } ${!transferData.fromAccountId ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!transferData.fromAccountId}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {getAccountIcon(account.icon, account.currencyType)}
                            <div className="text-left">
                              <p className="font-semibold text-text-primary text-lg">{account.name}</p>
                              <p className="text-text-muted">{account.currency}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-text-primary text-lg">
                              {formatBalance(account.balance, account.currency, account.currencyType)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Transfer Arrow */}
            {transferData.fromAccountId && transferData.toAccountId && (
              <div className="flex justify-center py-8">
                <div className="p-4 rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary shadow-lg">
                  <ArrowRightLeft className="h-8 w-8 text-white" />
                </div>
              </div>
            )}
          </div>


        </div>

        {/* Right Column - Transfer Details */}
        <div className="space-y-6">
          {/* Amount and Description - Only show when accounts are selected */}
          {transferData.fromAccountId && transferData.toAccountId && (
            <div className="bg-background-elevated rounded-3xl p-8 border border-border-primary">
              <h3 className="text-2xl font-semibold text-text-primary mb-6">Detalles de la Transferencia</h3>
              
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
                    Saldo disponible: {getFromAccount() ? formatBalance(getFromAccount()!.balance, getFromAccount()!.currency, getFromAccount()!.currencyType) : '--'}
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-4">
                  <label className="text-lg font-medium text-text-secondary">Descripción</label>
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

          {/* Balance Preview - Compact version after details */}
          {transferData.fromAccountId && transferData.toAccountId && transferData.amount > 0 && (
            <BalancePreview
              fromAccount={getFromAccount()!}
              toAccount={getToAccount()!}
              transferAmount={transferData.amount}
              formatBalance={formatBalance}
              isMobile={false}
              size="compact"
            />
          )}

          {/* Transfer Summary - Only show when form is valid */}
          {isFormValid() && (
            <div className="bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 rounded-3xl p-8 border border-accent-primary/20 backdrop-blur-sm">
              <h3 className="text-2xl font-semibold text-text-primary mb-6 flex items-center space-x-3">
                <Send className="h-6 w-6" />
                <span>Resumen</span>
              </h3>
              
              <div className="space-y-6">
                {/* Transfer Details */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Desde:</span>
                    <div className="text-right">
                      <p className="text-text-primary font-semibold">{getFromAccount()?.name}</p>
                      <p className="text-sm text-text-muted">{getFromAccount()?.currency}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <ArrowRightLeft className="h-5 w-5 text-text-muted" />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Hacia:</span>
                    <div className="text-right">
                      <p className="text-text-primary font-semibold">{getToAccount()?.name}</p>
                      <p className="text-sm text-text-muted">{getToAccount()?.currency}</p>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="border-t border-border-primary pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-text-muted">Monto:</span>
                    <span className="text-2xl font-bold text-text-primary">${transferData.amount.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-text-muted">{getFromAccount()?.currency}</p>
                  </div>
                </div>

                {/* Balance Changes */}
                <div className="border-t border-border-primary pt-4">
                  <h4 className="text-text-primary font-semibold mb-3">Saldos después de la transferencia:</h4>
                  <div className="space-y-3">
                    {/* From Account Balance */}
                    <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                      <div>
                        <p className="font-medium text-text-primary">{getFromAccount()?.name}</p>
                        <p className="text-sm text-text-muted">Cuenta origen</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-text-muted">
                          {getFromAccount() ? formatBalance(getFromAccount()!.balance, getFromAccount()!.currency, getFromAccount()!.currencyType) : '--'}
                        </p>
                        <p className="font-bold text-red-400">
                          → {getFromAccount() ? formatBalance(getFromAccount()!.balance - transferData.amount, getFromAccount()!.currency, getFromAccount()!.currencyType) : '--'}
                        </p>
                      </div>
                    </div>
                    
                    {/* To Account Balance */}
                    <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                      <div>
                        <p className="font-medium text-text-primary">{getToAccount()?.name}</p>
                        <p className="text-sm text-text-muted">Cuenta destino</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-text-muted">
                          {getToAccount() ? formatBalance(getToAccount()!.balance, getToAccount()!.currency, getToAccount()!.currencyType) : '--'}
                        </p>
                        <p className="font-bold text-green-400">
                          → {getToAccount() ? formatBalance(getToAccount()!.balance + transferData.amount, getToAccount()!.currency, getToAccount()!.currencyType) : '--'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {transferData.description && (
                  <div className="border-t border-border-primary pt-4">
                    <p className="text-text-muted text-sm mb-2">Descripción:</p>
                    <p className="text-text-primary">{transferData.description}</p>
                  </div>
                )}
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
    </div>
  );
}