import { Account } from '@/types/domain';
// Simple console-based notifications for now

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
  private static readonly CRITICAL_THRESHOLD = 1.05; // 5% above minimum

  /**
   * Check if an account balance is approaching or below the minimum threshold
   */
  static checkAccountBalance(account: Account): BalanceAlert | null {
    if (!account.alertEnabled || !account.minimumBalance || account.minimumBalance <= 0) {
      return null;
    }

    const { balance, minimumBalance, currencyCode } = account;
    
    // Convert to major units for comparison
    const currentBalanceMajor = balance / 100;
    const minimumBalanceMajor = minimumBalance / 100;

    // Check if balance is at or below minimum
    if (currentBalanceMajor <= minimumBalanceMajor) {
      return {
        accountId: account.id,
        accountName: account.name,
        currentBalance: currentBalanceMajor,
        minimumBalance: minimumBalanceMajor,
        currencyCode,
        alertType: 'critical'
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
        alertType: 'warning'
      };
    }

    return null;
  }

  /**
   * Check multiple accounts for balance alerts
   */
  static checkAccountsBalance(accounts: Account[]): BalanceAlert[] {
    return accounts
      .map(account => this.checkAccountBalance(account))
      .filter((alert): alert is BalanceAlert => alert !== null);
  }

  /**
   * Show toast notification for a balance alert
   */
  static showBalanceAlert(alert: BalanceAlert): void {
    const { accountName, currentBalance, minimumBalance, currencyCode, alertType } = alert;
    
    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: currencyCode === 'VES' ? 'VES' : 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    const currentFormatted = formatAmount(currentBalance);
    const minimumFormatted = formatAmount(minimumBalance);

    if (alertType === 'critical') {
      console.warn(`⚠️ Saldo Crítico: ${accountName}`, {
        description: `Tu saldo actual (${currentFormatted}) está por debajo del mínimo establecido (${minimumFormatted}).`,
        currentBalance,
        minimumBalance,
        currencyCode
      });
      
      // Simple browser alert for now - can be enhanced later
      if (typeof window !== 'undefined') {
        window.alert(`⚠️ Saldo Crítico: ${accountName}

Tu saldo actual (${currentFormatted}) está por debajo del mínimo establecido (${minimumFormatted}).`);
      }
    } else {
      console.warn(`🔔 Alerta de Saldo: ${accountName}`, {
        description: `Tu saldo actual (${currentFormatted}) se está acercando al mínimo (${minimumFormatted}).`,
        currentBalance,
        minimumBalance,
        currencyCode
      });
      
      // Simple browser alert for now - can be enhanced later
      if (typeof window !== 'undefined') {
        window.alert(`🔔 Alerta de Saldo: ${accountName}

Tu saldo actual (${currentFormatted}) se está acercando al mínimo (${minimumFormatted}).`);
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

    // Show alerts with a slight delay between them
    sortedAlerts.forEach((alert, index) => {
      setTimeout(() => {
        this.showBalanceAlert(alert);
      }, index * 1000); // 1 second delay between alerts
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
    if (!account.alertEnabled || !account.minimumBalance || account.minimumBalance <= 0) {
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