'use client';

import { ReactNode } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: ReactNode;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    title,
    description,
    icon,
    actionLabel,
    onAction,
    className
}: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("p-12 text-center flex flex-col items-center justify-center min-h-[400px]", className)}
        >
            <div className="bg-muted/10 p-6 rounded-full mb-6 relative">
                <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse" />
                {icon || <span className="text-4xl">📭</span>}
            </div>

            <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-3 text-balance max-w-lg">
                {title}
            </h3>

            <p className="text-muted-foreground text-sm sm:text-base mb-8 max-w-sm mx-auto leading-relaxed text-balance">
                {description}
            </p>

            {onAction && actionLabel && (
                <button
                    onClick={onAction}
                    className="text-white font-medium px-8 py-3.5 rounded-2xl shadow-lg transition-all duration-300 relative overflow-hidden group bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary active:scale-95"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></div>
                    <div className="relative flex items-center space-x-2">
                        <Plus className="h-5 w-5" />
                        <span>{actionLabel}</span>
                        <Sparkles className="h-4 w-4" />
                    </div>
                </button>
            )}
        </motion.div>
    );
}
