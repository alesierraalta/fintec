'use client';

import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { useState, useRef, useCallback } from 'react';
import {
    Wallet,
    CreditCard,
    Banknote,
    TrendingUp,
    PiggyBank,
    Bitcoin,
    Edit,
    Trash2,
    Settings,
    ArrowRight,
    Bell
} from 'lucide-react';
import { Account } from '@/types';
import { BalanceAlertIndicator } from './balance-alert-indicator';

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
    const [isRevealed, setIsRevealed] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const constraintsRef = useRef(null);

    const x = useMotionValue(0);
    const actionsOpacity = useTransform(x, [-SWIPE_THRESHOLD * 2, -SWIPE_THRESHOLD, 0], [1, 0.8, 0]);
    const actionsScale = useTransform(x, [-SWIPE_THRESHOLD * 2, -SWIPE_THRESHOLD, 0], [1, 0.9, 0.8]);

    const Icon = accountIcons[account.type as keyof typeof accountIcons] || Wallet;
    const typeLabel = accountTypeLabels[account.type as keyof typeof accountTypeLabels] || 'Cuenta';

    const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false);

        if (info.offset.x < -SWIPE_THRESHOLD) {
            setIsRevealed(true);
        } else if (info.offset.x > SWIPE_THRESHOLD / 2) {
            setIsRevealed(false);
        }
    }, []);

    const handleDragStart = useCallback(() => {
        setIsDragging(true);
    }, []);

    const handleCardClick = useCallback(() => {
        if (isRevealed) {
            setIsRevealed(false);
        } else if (onClick && !isDragging) {
            onClick(account);
        }
    }, [isRevealed, onClick, account, isDragging]);

    const handleAction = useCallback((action: () => void) => {
        setIsRevealed(false);
        action();
    }, []);

    return (
        <motion.div
            className="relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
            ref={constraintsRef}
        >
            {/* Action buttons revealed on swipe */}
            <motion.div
                className="absolute right-0 top-0 bottom-0 flex items-stretch h-full"
                style={{ opacity: actionsOpacity, scale: actionsScale }}
            >
                <motion.button
                    onClick={() => handleAction(() => onAlertSettings(account))}
                    className="flex flex-col items-center justify-center bg-blue-500 text-white px-4 min-w-[70px] hover:bg-blue-600 active:bg-blue-700 transition-colors"
                    whileTap={{ scale: 0.95 }}
                    aria-label="Configurar alertas"
                >
                    <Bell className="h-5 w-5 mb-1" />
                    <span className="text-xs font-medium">Alertas</span>
                </motion.button>

                <motion.button
                    onClick={() => handleAction(() => onEdit(account))}
                    className="flex flex-col items-center justify-center bg-amber-500 text-white px-4 min-w-[70px] hover:bg-amber-600 active:bg-amber-700 transition-colors"
                    whileTap={{ scale: 0.95 }}
                    aria-label="Editar cuenta"
                >
                    <Edit className="h-5 w-5 mb-1" />
                    <span className="text-xs font-medium">Editar</span>
                </motion.button>

                <motion.button
                    onClick={() => handleAction(() => onDelete(account))}
                    className="flex flex-col items-center justify-center bg-red-500 text-white px-4 min-w-[70px] rounded-r-2xl hover:bg-red-600 active:bg-red-700 transition-colors"
                    whileTap={{ scale: 0.95 }}
                    aria-label="Eliminar cuenta"
                >
                    <Trash2 className="h-5 w-5 mb-1" />
                    <span className="text-xs font-medium">Eliminar</span>
                </motion.button>
            </motion.div>

            {/* Main card content - draggable */}
            <motion.div
                className="relative bg-card/60 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-border/20 cursor-grab active:cursor-grabbing z-10 touch-pan-y"
                drag="x"
                dragConstraints={{ left: -(ACTION_BUTTON_WIDTH * 3), right: 0 }}
                dragElastic={0.1}
                dragMomentum={false}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                animate={{ x: isRevealed ? -(ACTION_BUTTON_WIDTH * 3) : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                onClick={handleCardClick}
                whileHover={{ backgroundColor: 'rgba(var(--card), 0.8)' }}
                whileDrag={{
                    scale: 1.02,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                }}
            >
                <div className="flex items-center justify-between">
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

                {/* Swipe hint indicator */}
                <motion.div
                    className="absolute left-1/2 transform -translate-x-1/2 mt-2 flex items-center space-x-1 text-muted-foreground/40 text-xs pointer-events-none sm:hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isRevealed ? 0 : 1 }}
                >
                    <ArrowRight className="h-3 w-3 animate-pulse" />
                    <span>Desliza</span>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
