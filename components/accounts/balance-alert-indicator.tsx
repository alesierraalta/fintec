'use client';

import { Account } from '@/types/domain';
import { useBalanceAlerts } from '@/hooks/use-balance-alerts';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface BalanceAlertIndicatorProps {
  account: Account;
}

export function BalanceAlertIndicator({ account }: BalanceAlertIndicatorProps) {
  const { getAlertStatus, calculateAmountNeeded } = useBalanceAlerts();
  
  const alertStatus = getAlertStatus(account);
  
  if (alertStatus === 'none') {
    return null;
  }

  const amountNeeded = calculateAmountNeeded(account);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: account.currencyCode === 'VES' ? 'VES' : 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (alertStatus === 'critical') {
    return (
      <div className="flex items-center space-x-1 text-xs">
        <div className="flex items-center space-x-1 bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-lg font-medium">
          <AlertCircle className="h-3 w-3" />
          <span>Crítico</span>
        </div>
      </div>
    );
  }

  if (alertStatus === 'warning') {
    return (
      <div className="flex items-center space-x-1 text-xs">
        <div className="flex items-center space-x-1 bg-warning/10 text-warning-600 px-1.5 py-0.5 rounded-lg font-medium">
          <AlertTriangle className="h-3 w-3" />
          <span>Bajo</span>
        </div>
      </div>
    );
  }

  return null;
}