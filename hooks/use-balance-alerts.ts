import { useState, useCallback, useEffect } from 'react';
import { Account } from '@/types/domain';
import { BalanceAlertService, BalanceAlert } from '@/lib/services/balance-alert-service';

export interface UseBalanceAlertsReturn {
  alerts: BalanceAlert[];
  checkAlerts: (accounts: Account[]) => Promise<void>;
  checkSingleAccount: (account: Account) => BalanceAlert | null;
  showAlerts: (alerts: BalanceAlert[]) => void;
  getAlertStatus: (account: Account) => 'none' | 'warning' | 'critical';
  calculateAmountNeeded: (account: Account) => number;
  hasActiveAlerts: boolean;
  criticalAlertsCount: number;
  warningAlertsCount: number;
}

export function useBalanceAlerts(): UseBalanceAlertsReturn {
  const [alerts, setAlerts] = useState<BalanceAlert[]>([]);

  /**
   * Check all accounts for balance alerts
   */
  const checkAlerts = useCallback(async (accounts: Account[]) => {
    const newAlerts = BalanceAlertService.checkAccountsBalance(accounts);
    setAlerts(newAlerts);

    // Show alerts if any are found
    if (newAlerts.length > 0) {
      BalanceAlertService.showBalanceAlerts(newAlerts);
    }
  }, []);

  /**
   * Check a single account for balance alerts
   */
  const checkSingleAccount = useCallback((account: Account): BalanceAlert | null => {
    return BalanceAlertService.checkAccountBalance(account);
  }, []);

  /**
   * Show balance alerts using toast notifications
   */
  const showAlerts = useCallback((alertsToShow: BalanceAlert[]) => {
    BalanceAlertService.showBalanceAlerts(alertsToShow);
  }, []);

  /**
   * Get alert status for an account
   */
  const getAlertStatus = useCallback((account: Account): 'none' | 'warning' | 'critical' => {
    return BalanceAlertService.getAlertStatus(account);
  }, []);

  /**
   * Calculate how much money is needed to reach safe threshold
   */
  const calculateAmountNeeded = useCallback((account: Account): number => {
    return BalanceAlertService.calculateAmountNeeded(account);
  }, []);

  // Derived state
  const hasActiveAlerts = alerts.length > 0;
  const criticalAlertsCount = alerts.filter(alert => alert.alertType === 'critical').length;
  const warningAlertsCount = alerts.filter(alert => alert.alertType === 'warning').length;

  return {
    alerts,
    checkAlerts,
    checkSingleAccount,
    showAlerts,
    getAlertStatus,
    calculateAmountNeeded,
    hasActiveAlerts,
    criticalAlertsCount,
    warningAlertsCount,
  };
}