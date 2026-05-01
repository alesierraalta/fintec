'use client';

import { motion } from 'framer-motion';
import {
  Wallet,
  CreditCard,
  Banknote,
  TrendingUp,
  PiggyBank,
  Bitcoin,
  Edit,
  Trash2,
  Bell,
} from 'lucide-react';
import { Account } from '@/types';
import { BalanceAlertIndicator } from './balance-alert-indicator';
import { SwipeableCard } from '@/components/ui/swipeable-card';

interface SwipeableAccountCardProps {
  account: Account;
  showBalances: boolean;
  balance: string;
  usdEquivalent?: string;
  rateName?: string;
  vesEquivalent?: string;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onAlertSettings: (account: Account) => void;
  onClick?: (account: Account) => void;
  index?: number;
}

const accountIcons = {
  BANK: Banknote,
  CARD: CreditCard,
  CASH: Wallet,
  SAVINGS: PiggyBank,
  INVESTMENT: TrendingUp,
  CRYPTO: Bitcoin,
};

const accountTypeLabels = {
  BANK: 'Banco',
  CARD: 'Tarjeta',
  CASH: 'Efectivo',
  SAVINGS: 'Ahorros',
  INVESTMENT: 'Inversión',
  CRYPTO: 'Criptomoneda',
};

const SWIPE_THRESHOLD = 80;
const ACTION_BUTTON_WIDTH = 70;

export function SwipeableAccountCard({
  account,
  showBalances,
  balance,
  usdEquivalent,
  rateName,
  vesEquivalent,
  onEdit,
  onDelete,
  onAlertSettings,
  onClick,
  index = 0,
}: SwipeableAccountCardProps) {
  const Icon =
    accountIcons[account.type as keyof typeof accountIcons] || Wallet;
  const typeLabel =
    accountTypeLabels[account.type as keyof typeof accountTypeLabels] ||
    'Cuenta';

  const actions = [
    {
      label: 'Alertas',
      icon: <Bell className="mb-1 h-5 w-5" />,
      onClick: () => onAlertSettings(account),
      color: 'blue' as const,
    },
    {
      label: 'Editar',
      icon: <Edit className="mb-1 h-5 w-5" />,
      onClick: () => onEdit(account),
      color: 'amber' as const,
    },
    {
      label: 'Eliminar',
      icon: <Trash2 className="mb-1 h-5 w-5" />,
      onClick: () => onDelete(account),
      color: 'red' as const,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
    >
      <SwipeableCard
        actions={actions}
        onClick={() => onClick && onClick(account)}
        className="rounded-2xl border border-border/20 bg-card/60 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between p-4 sm:p-5">
          <div className="flex min-w-0 flex-1 items-center space-x-3 sm:space-x-4">
            {/* Account Icon */}
            <div className="flex-shrink-0 rounded-2xl bg-muted/20 p-2.5 transition-colors duration-200 group-hover:bg-primary/10 sm:p-3">
              <Icon className="h-5 w-5 text-muted-foreground transition-colors duration-200 group-hover:text-primary sm:h-6 sm:w-6" />
            </div>

            {/* Account Info */}
            <div className="min-w-0 flex-1">
              <h4 className="mb-1 truncate text-sm font-semibold text-foreground sm:text-base">
                {account.name}
              </h4>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground sm:gap-2">
                <span className="truncate">{typeLabel}</span>
                <div className="hidden h-1 w-1 rounded-full bg-muted-foreground/50 sm:block" />
                <span className="font-medium text-primary">
                  {account.currencyCode}
                </span>
                <div className="hidden h-1 w-1 rounded-full bg-muted-foreground/50 sm:block" />
                <span
                  className={account.active ? 'text-green-500' : 'text-red-500'}
                >
                  {account.active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="ml-3 flex-shrink-0 text-right">
            <p className="amount-emphasis-white truncate text-sm font-semibold sm:text-lg">
              {showBalances ? balance : '••••••'}
            </p>

            {showBalances && usdEquivalent && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {usdEquivalent}
                {rateName && (
                  <span className="ml-1 text-muted-foreground/70">
                    ({rateName})
                  </span>
                )}
              </p>
            )}

            {showBalances && vesEquivalent && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {vesEquivalent}
              </p>
            )}

            <div className="mt-1 flex items-center justify-end space-x-1.5">
              {account.currencyCode === 'VES' && (
                <span className="rounded-lg bg-warning-500/10 px-2 py-0.5 text-xs font-medium text-warning-600">
                  BCV
                </span>
              )}
              <BalanceAlertIndicator account={account} />
            </div>
          </div>
        </div>
      </SwipeableCard>
    </motion.div>
  );
}
