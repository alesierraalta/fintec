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
    try {
      return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: account.currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (e) {
      return `${account.currencyCode} ${Math.round(amount)}`;
    }
  };

  if (alertStatus === 'critical') {
    return (
      <div className="flex items-center space-x-1 text-[10px] sm:text-xs">
        <div className="flex items-center space-x-1 whitespace-nowrap rounded-lg bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>Faltan {formatCurrency(amountNeeded)}</span>
        </div>
      </div>
    );
  }

  if (alertStatus === 'warning') {
    return (
      <div className="flex items-center space-x-1 text-[10px] sm:text-xs">
        <div className="flex items-center space-x-1 whitespace-nowrap rounded-lg bg-warning/10 px-1.5 py-0.5 font-medium text-warning-600">
          <AlertTriangle className="h-3 w-3" />
          <span>Faltan {formatCurrency(amountNeeded)}</span>
        </div>
      </div>
    );
  }

  return null;
}
