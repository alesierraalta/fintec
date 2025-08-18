'use client';

import React from 'react';
import { ArrowRight, AlertTriangle, Wallet, Bitcoin } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
  currencyType: 'fiat' | 'crypto';
  icon: string;
}

interface BalancePreviewProps {
  fromAccount: Account;
  toAccount: Account;
  transferAmount: number;
  formatBalance: (balance: number, currency: string, currencyType: 'fiat' | 'crypto') => string;
  isMobile?: boolean;
  size?: 'default' | 'compact';
}

export function BalancePreview({ 
  fromAccount, 
  toAccount, 
  transferAmount, 
  formatBalance, 
  isMobile = false,
  size = 'default'
}: BalancePreviewProps) {
  const getAccountIcon = (iconName: string, currencyType: 'fiat' | 'crypto') => {
    if (iconName === 'bitcoin' || currencyType === 'crypto') {
      return <Bitcoin className="h-5 w-5 text-orange-500" />;
    }
    return <Wallet className="h-5 w-5 text-blue-500" />;
  };

  const newFromBalance = fromAccount.balance - transferAmount;
  const newToBalance = toAccount.balance + transferAmount;
  const hasInsufficientFunds = newFromBalance < 0;

  // Compact version
  if (size === 'compact') {
    return (
      <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary">
        <h4 className="text-sm font-semibold text-text-primary mb-3 text-center">
          Previsualización de Saldos
        </h4>
        
        {hasInsufficientFunds && transferAmount > 0 && (
          <div className="flex items-center justify-center space-x-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg mb-3">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-red-400 text-xs font-medium">Saldo insuficiente</span>
          </div>
        )}
        
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-3'}`}>
          {/* From Account - Compact */}
          <div className={`p-3 rounded-lg border ${
            hasInsufficientFunds && transferAmount > 0
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-background-secondary border-border-secondary'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              {getAccountIcon(fromAccount.icon, fromAccount.currencyType)}
              <div>
                <p className="font-medium text-text-primary text-xs">{fromAccount.name}</p>
                <p className="text-xs text-text-muted">Origen</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-text-muted">
                {formatBalance(fromAccount.balance, fromAccount.currency, fromAccount.currencyType)}
              </p>
              <div className="flex items-center space-x-1">
                <ArrowRight className="h-3 w-3 text-text-muted" />
                <p className={`text-xs font-bold ${hasInsufficientFunds && transferAmount > 0 ? 'text-red-400' : 'text-orange-400'}`}>
                  {formatBalance(newFromBalance, fromAccount.currency, fromAccount.currencyType)}
                </p>
              </div>
            </div>
          </div>

          {/* To Account - Compact */}
          <div className="p-3 rounded-lg border bg-green-500/10 border-green-500/20">
            <div className="flex items-center space-x-2 mb-2">
              {getAccountIcon(toAccount.icon, toAccount.currencyType)}
              <div>
                <p className="font-medium text-text-primary text-xs">{toAccount.name}</p>
                <p className="text-xs text-text-muted">Destino</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-text-muted">
                {formatBalance(toAccount.balance, toAccount.currency, toAccount.currencyType)}
              </p>
              <div className="flex items-center space-x-1">
                <ArrowRight className="h-3 w-3 text-text-muted" />
                <p className="text-xs font-bold text-green-400">
                  {formatBalance(newToBalance, toAccount.currency, toAccount.currencyType)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary text-center">
          Previsualización de Saldos
        </h3>
        
        {hasInsufficientFunds && transferAmount > 0 && (
          <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="text-red-400 text-sm font-medium">Saldo insuficiente</span>
          </div>
        )}
        
        <div className="space-y-3">
          {/* From Account */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            hasInsufficientFunds && transferAmount > 0
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-background-elevated border-border-primary'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getAccountIcon(fromAccount.icon, fromAccount.currencyType)}
                <div>
                  <p className="font-medium text-text-primary text-sm">{fromAccount.name}</p>
                  <p className="text-xs text-text-muted">Cuenta origen</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm text-text-muted">Actual</p>
                <p className="font-semibold text-text-primary">
                  {formatBalance(fromAccount.balance, fromAccount.currency, fromAccount.currencyType)}
                </p>
              </div>
              
              <ArrowRight className="h-4 w-4 text-text-muted" />
              
              <div className="text-right">
                <p className="text-sm text-text-muted">Después</p>
                <p className={`font-bold ${hasInsufficientFunds && transferAmount > 0 ? 'text-red-400' : 'text-orange-400'}`}>
                  {formatBalance(newFromBalance, fromAccount.currency, fromAccount.currencyType)}
                </p>
              </div>
            </div>
          </div>

          {/* To Account */}
          <div className="p-4 rounded-xl border-2 bg-green-500/5 border-green-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getAccountIcon(toAccount.icon, toAccount.currencyType)}
                <div>
                  <p className="font-medium text-text-primary text-sm">{toAccount.name}</p>
                  <p className="text-xs text-text-muted">Cuenta destino</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm text-text-muted">Actual</p>
                <p className="font-semibold text-text-primary">
                  {formatBalance(toAccount.balance, toAccount.currency, toAccount.currencyType)}
                </p>
              </div>
              
              <ArrowRight className="h-4 w-4 text-text-muted" />
              
              <div className="text-right">
                <p className="text-sm text-text-muted">Después</p>
                <p className="font-bold text-green-400">
                  {formatBalance(newToBalance, toAccount.currency, toAccount.currencyType)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop version
  return (
    <div className="bg-background-elevated rounded-3xl p-8 border border-border-primary">
      <h3 className="text-2xl font-semibold text-text-primary mb-6 text-center">
        Previsualización de Saldos
      </h3>
      
      {hasInsufficientFunds && transferAmount > 0 && (
        <div className="flex items-center justify-center space-x-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-6">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <span className="text-red-400 font-medium">Saldo insuficiente en la cuenta origen</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* From Account */}
        <div className={`p-6 rounded-2xl border-2 transition-all ${
          hasInsufficientFunds && transferAmount > 0
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-background-secondary border-border-secondary'
        }`}>
          <div className="flex items-center space-x-4 mb-6">
            {getAccountIcon(fromAccount.icon, fromAccount.currencyType)}
            <div>
              <p className="font-semibold text-text-primary text-lg">{fromAccount.name}</p>
              <p className="text-text-muted">Cuenta origen</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-text-muted mb-2">Saldo actual</p>
              <p className="text-2xl font-bold text-text-primary">
                {formatBalance(fromAccount.balance, fromAccount.currency, fromAccount.currencyType)}
              </p>
            </div>
            
            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-text-muted" />
            </div>
            
            <div className="text-center">
              <p className="text-text-muted mb-2">Saldo después</p>
              <p className={`text-2xl font-bold ${hasInsufficientFunds && transferAmount > 0 ? 'text-red-400' : 'text-orange-400'}`}>
                {formatBalance(newFromBalance, fromAccount.currency, fromAccount.currencyType)}
              </p>
            </div>
          </div>
        </div>

        {/* To Account */}
        <div className="p-6 rounded-2xl border-2 bg-green-500/10 border-green-500/20">
          <div className="flex items-center space-x-4 mb-6">
            {getAccountIcon(toAccount.icon, toAccount.currencyType)}
            <div>
              <p className="font-semibold text-text-primary text-lg">{toAccount.name}</p>
              <p className="text-text-muted">Cuenta destino</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-text-muted mb-2">Saldo actual</p>
              <p className="text-2xl font-bold text-text-primary">
                {formatBalance(toAccount.balance, toAccount.currency, toAccount.currencyType)}
              </p>
            </div>
            
            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-text-muted" />
            </div>
            
            <div className="text-center">
              <p className="text-text-muted mb-2">Saldo después</p>
              <p className="text-2xl font-bold text-green-400">
                {formatBalance(newToBalance, toAccount.currency, toAccount.currencyType)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
