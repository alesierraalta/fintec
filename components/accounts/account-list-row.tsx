'use client';

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  CreditCard,
  Banknote,
  TrendingUp,
  PiggyBank,
  Bitcoin,
  MoreVertical,
} from 'lucide-react';
import { Account } from '@/types';
import { convertBalanceToUSD } from '@/lib/rate-display';
import { BalanceAlertIndicator } from '@/components/accounts/balance-alert-indicator';
import { formatCurrencyWithBCV } from '@/lib/currency-ves';
import type { RateSource } from '@/lib/rate-display';

export interface AccountListRowProps {
  account: Account;
  index: number;
  showBalances: boolean;
  usdEquivalentType: RateSource;
  binanceUsdVes: number;
  bcvRates: { usd: number; eur: number };
  isExpanded: boolean;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onAlertSettings: (account: Account) => void;
  onToggleDropdown: (accountId: string) => void;
  onRegisterTrigger: (accountId: string, el: HTMLButtonElement | null) => void;
  renderCategoryStats: () => React.ReactNode;
}

const accountIcons: Record<string, typeof Wallet> = {
  BANK: Banknote,
  CARD: CreditCard,
  CASH: Wallet,
  SAVINGS: PiggyBank,
  INVESTMENT: TrendingUp,
  CRYPTO: Bitcoin,
};

const TYPE_LABELS: Record<string, string> = {
  BANK: 'Banco',
  CARD: 'Tarjeta',
  CASH: 'Efectivo',
  SAVINGS: 'Ahorros',
  CRYPTO: 'Criptomoneda',
  INVESTMENT: 'Inversión',
};

function formatBalance(balanceMinor: number, currency: string): string {
  return formatCurrencyWithBCV(balanceMinor, currency, {
    showUSDEquivalent: currency === 'VES',
    locale: 'es-ES',
  });
}

function AccountListRowImpl({
  account,
  index,
  showBalances,
  usdEquivalentType,
  binanceUsdVes,
  bcvRates,
  isExpanded,
  onToggleDropdown,
  onRegisterTrigger,
  renderCategoryStats,
}: AccountListRowProps) {
  const Icon = accountIcons[account.type] || Wallet;
  const typeLabel = TYPE_LABELS[account.type] || 'Cuenta';

  const usdValue = convertBalanceToUSD(
    Math.abs(account.balance),
    account.currencyCode,
    account.type,
    usdEquivalentType,
    bcvRates,
    { usd_ves: binanceUsdVes }
  );

  const usdText = usdValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const setTriggerRef = useCallback(
    (el: HTMLButtonElement | null) => onRegisterTrigger(account.id, el),
    [account.id, onRegisterTrigger]
  );

  const handleToggle = useCallback(
    () => onToggleDropdown(account.id),
    [account.id, onToggleDropdown]
  );

  return (
    <motion.div
      className="group relative cursor-pointer border-l-0 p-4 transition-all duration-200 hover:border-l-4 hover:border-l-primary/40 hover:bg-card/60 sm:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.005, transition: { duration: 0.2 } }}
    >
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center space-x-3 md:space-x-4">
          <div className="flex-shrink-0 rounded-2xl bg-muted/20 p-2.5 transition-colors duration-200 group-hover:bg-primary/10 sm:p-3">
            <Icon className="h-4 w-4 text-muted-foreground transition-colors duration-200 group-hover:text-primary sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="mb-1 truncate text-sm font-medium text-foreground sm:text-ios-body">
              {account.name}
            </h4>
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground sm:text-ios-caption md:gap-2">
              <span className="truncate">{typeLabel}</span>
              <div className="hidden h-1 w-1 rounded-full bg-muted-foreground md:block" />
              <span className="font-medium text-primary">
                {account.currencyCode}
              </span>
              <div className="hidden h-1 w-1 rounded-full bg-muted-foreground md:block" />
              <span
                className={`${account.active ? 'text-success-600' : 'text-error-600'} flex-shrink-0`}
              >
                {account.active ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0 text-right">
            <p className="amount-emphasis-main truncate text-sm font-semibold sm:text-ios-title">
              {showBalances
                ? account.type === 'CRYPTO'
                  ? `$${usdText}`
                  : `${account.balance < 0 ? '-' : ''}${formatBalance(Math.abs(account.balance), account.currencyCode)}`
                : '••••••'}
            </p>
            {account.currencyCode !== 'USD' &&
              account.type !== 'CRYPTO' &&
              showBalances && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  ≈ ${usdText} USD
                </p>
              )}
            {(account.currencyCode === 'USD' ||
              account.currencyCode === 'USDT' ||
              account.currencyCode === 'BUSD') &&
              showBalances &&
              binanceUsdVes > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  ≈ Bs.{' '}
                  {(
                    (Math.abs(account.balance) / 100) *
                    binanceUsdVes
                  ).toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  <span className="ml-1 text-xs text-muted-foreground">
                    (Binance)
                  </span>
                </p>
              )}
            <div className="mt-1 flex items-center justify-end space-x-1 md:space-x-2">
              {account.currencyCode === 'VES' && (
                <span className="rounded-lg bg-warning-500/10 px-1.5 py-0.5 text-xs font-medium text-warning-600 sm:px-2 sm:py-1 sm:text-ios-footnote">
                  BCV
                </span>
              )}
              <BalanceAlertIndicator account={account} />
            </div>
          </div>

          <div className="relative">
            <button
              ref={setTriggerRef}
              onClick={handleToggle}
              aria-label="Acciones de cuenta"
              aria-haspopup="menu"
              className="flex-shrink-0 rounded-xl p-1.5 text-muted-foreground transition-all duration-200 hover:bg-muted/20 hover:text-foreground md:p-2"
            >
              <MoreVertical className="h-3.5 w-3.5 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4 border-t border-border/20 pt-4"
        >
          {renderCategoryStats()}
        </motion.div>
      )}
    </motion.div>
  );
}

export const AccountListRow = memo(AccountListRowImpl);
