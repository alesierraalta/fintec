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
    Bell
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
    index = 0
}: SwipeableAccountCardProps) {
    const Icon = accountIcons[account.type as keyof typeof accountIcons] || Wallet;
    const typeLabel = accountTypeLabels[account.type as keyof typeof accountTypeLabels] || 'Cuenta';

    const actions = [
        {
            label: 'Alertas',
            icon: <Bell className="h-5 w-5 mb-1" />,
            onClick: () => onAlertSettings(account),
            color: 'blue' as const
        },
        {
            label: 'Editar',
            icon: <Edit className="h-5 w-5 mb-1" />,
            onClick: () => onEdit(account),
            color: 'amber' as const
        },
        {
            label: 'Eliminar',
            icon: <Trash2 className="h-5 w-5 mb-1" />,
            onClick: () => onDelete(account),
            color: 'red' as const
        }
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
                className="rounded-2xl border border-border/20 backdrop-blur-xl bg-card/60"
            >
                <div className="flex items-center justify-between p-4 sm:p-5">
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                        {/* Account Icon */}
                        <div className="p-2.5 sm:p-3 bg-muted/20 rounded-2xl transition-colors duration-200 flex-shrink-0 group-hover:bg-primary/10">
                            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                        </div>

                        {/* Account Info */}
                        <div className="min-w-0 flex-1">
                            <h4 className="text-sm sm:text-base font-semibold text-foreground mb-1 truncate">
                                {account.name}
                            </h4>
                            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs text-muted-foreground">
                                <span className="truncate">{typeLabel}</span>
                                <div className="w-1 h-1 bg-muted-foreground/50 rounded-full hidden sm:block" />
                                <span className="text-primary font-medium">{account.currencyCode}</span>
                                <div className="w-1 h-1 bg-muted-foreground/50 rounded-full hidden sm:block" />
                                <span className={account.active ? 'text-green-500' : 'text-red-500'}>
                                    {account.active ? 'Activa' : 'Inactiva'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Balance */}
                    <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm sm:text-lg font-semibold amount-emphasis-white text-white truncate">
                            {showBalances ? balance : '••••••'}
                        </p>

                        {showBalances && usdEquivalent && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {usdEquivalent}
                                {rateName && (
                                    <span className="ml-1 text-muted-foreground/70">({rateName})</span>
                                )}
                            </p>
                        )}

                        {showBalances && vesEquivalent && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {vesEquivalent}
                            </p>
                        )}

                        <div className="flex items-center justify-end space-x-1.5 mt-1">
                            {account.currencyCode === 'VES' && (
                                <span className="text-xs bg-warning-500/10 text-warning-600 px-2 py-0.5 rounded-lg font-medium">
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
