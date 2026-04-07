import { Account } from '@/types/domain';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/money';

export interface BalanceAlert {
  accountId: string;
  accountName: string;
  currentBalance: number;
  minimumBalance: number;
  currencyCode: string;
  alertType: 'warning' | 'critical';
}

export class BalanceAlertService {
  private static readonly WARNING_THRESHOLD = 1.2; // 20% above minimum
  private static readonly CRITICAL_THRESHOLD = 1.0; // Equal to minimum

  /**
   * Check if an account balance is approaching or below the minimum threshold
   */
  static checkAccountBalance(account: Account): BalanceAlert | null {
    if (
      !account.alertEnabled ||
      account.minimumBalance === undefined ||
      account.minimumBalance === null
    ) {
      return null;
    }

    const { balance, minimumBalance, currencyCode } = account;

    // Convert to major units for comparison
    const currentBalanceMajor = balance / 100;
    const minimumBalanceMajor = minimumBalance / 100;

    // Check if balance is at or below critical threshold
    const criticalThreshold = minimumBalanceMajor * this.CRITICAL_THRESHOLD;
    if (currentBalanceMajor <= criticalThreshold) {
      return {
        accountId: account.id,
        accountName: account.name,
        currentBalance: currentBalanceMajor,
        minimumBalance: minimumBalanceMajor,
        currencyCode,
        alertType: 'critical',
      };
    }

    // Check if balance is approaching minimum (within warning threshold)
    const warningThreshold = minimumBalanceMajor * this.WARNING_THRESHOLD;
    if (currentBalanceMajor <= warningThreshold) {
      return {
        accountId: account.id,
        accountName: account.name,
        currentBalance: currentBalanceMajor,
        minimumBalance: minimumBalanceMajor,
        currencyCode,
        alertType: 'warning',
      };
    }

    return null;
  }

  /**
   * Check multiple accounts for balance alerts
   */
  static checkAccountsBalance(accounts: Account[]): BalanceAlert[] {
    return accounts
      .map((account) => this.checkAccountBalance(account))
      .filter((alert): alert is BalanceAlert => alert !== null);
  }

  /**
   * Show toast notification for a balance alert
   */
  static showBalanceAlert(alert: BalanceAlert): void {
    const {
      accountId,
      accountName,
      currentBalance,
      minimumBalance,
      currencyCode,
      alertType,
    } = alert;

    const formatAmount = (amount: number) => {
      try {
        return new Intl.NumberFormat('es-VE', {
          style: 'currency',
          currency: currencyCode,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      } catch (e) {
        // Fallback for invalid currency codes
        return `${currencyCode} ${amount.toFixed(2)}`;
      }
    };

    const currentFormatted = formatAmount(currentBalance);
    const minimumFormatted = formatAmount(minimumBalance);
    const toastId = `balance-alert-${accountId}`;

    if (alertType === 'critical') {
      logger.warn(`⚠️ Saldo Crítico: ${accountName}`, {
        description: `Tu saldo actual (${currentFormatted}) está por debajo del mínimo establecido (${minimumFormatted}).`,
        currentBalance,
        minimumBalance,
        currencyCode,
      });

      if (typeof window !== 'undefined') {
        toast.error(`Saldo Crítico: ${accountName}`, {
          id: toastId,
          description: `Tu saldo actual (${currentFormatted}) está por debajo del mínimo establecido (${minimumFormatted}).`,
          duration: 10000,
        });
      }
    } else {
      logger.warn(`🔔 Alerta de Saldo: ${accountName}`, {
        description: `Tu saldo actual (${currentFormatted}) se está acercando al mínimo (${minimumFormatted}).`,
        currentBalance,
        minimumBalance,
        currencyCode,
      });

      if (typeof window !== 'undefined') {
        toast.warning(`Alerta de Saldo: ${accountName}`, {
          id: toastId,
          description: `Tu saldo actual (${currentFormatted}) se está acercando al mínimo (${minimumFormatted}).`,
          duration: 5000,
        });
      }
    }
  }

  /**
   * Show multiple balance alerts
   */
  static showBalanceAlerts(alerts: BalanceAlert[]): void {
    // Sort alerts by severity (critical first)
    const sortedAlerts = alerts.sort((a, b) => {
      if (a.alertType === 'critical' && b.alertType === 'warning') return -1;
      if (a.alertType === 'warning' && b.alertType === 'critical') return 1;
      return 0;
    });

    // Show alerts
    sortedAlerts.forEach((alert) => {
      this.showBalanceAlert(alert);
    });
  }

  /**
   * Get alert status for an account (for UI indicators)
   */
  static getAlertStatus(account: Account): 'none' | 'warning' | 'critical' {
    const alert = this.checkAccountBalance(account);
    return alert?.alertType || 'none';
  }

  /**
   * Calculate how much money is needed to reach the safe threshold
   */
  static calculateAmountNeeded(account: Account): number {
    if (
      !account.alertEnabled ||
      !account.minimumBalance ||
      account.minimumBalance <= 0
    ) {
      return 0;
    }

    const currentBalanceMajor = account.balance / 100;
    const minimumBalanceMajor = account.minimumBalance / 100;
    const safeThreshold = minimumBalanceMajor * this.WARNING_THRESHOLD;

    if (currentBalanceMajor >= safeThreshold) {
      return 0;
    }

    return Math.max(0, safeThreshold - currentBalanceMajor);
  }
}
