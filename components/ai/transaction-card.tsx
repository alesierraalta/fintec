import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  formatCurrency,
  formatDate,
  getCategoryEmoji,
} from '@/lib/ai/tools/formatters';
import { cn } from '@/lib/utils';

export interface TransactionCardProps {
  transaction: {
    id?: string;
    description: string;
    amountMinor: number;
    currencyCode: string;
    type: 'INCOME' | 'EXPENSE';
    categoryName?: string;
    accountName?: string;
    date: string;
  };
}

/**
 * Elegant card displaying a confirmed financial transaction in the AI chat.
 * FinTec aesthetic with sharp contrast, clear badge indicators, and tabular-nums.
 */
export function TransactionCard({ transaction }: TransactionCardProps) {
  const isIncome = transaction.type === 'INCOME';
  const categoryEmoji = getCategoryEmoji(transaction.categoryName || 'other');
  const formattedAmount = formatCurrency(
    transaction.amountMinor,
    transaction.currencyCode
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="mt-2.5 w-full min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-4 shadow-ios-sm"
    >
      {/* Header status */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full',
              isIncome
                ? 'bg-success/15 text-success'
                : 'bg-primary/15 text-primary'
            )}
          >
            {isIncome ? (
              <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </span>
          <span className="text-xs font-semibold tracking-tight text-foreground">
            {isIncome ? 'Ingreso registrado' : 'Gasto registrado'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-success" aria-hidden="true" />
          <span>{formatDate(transaction.date)}</span>
        </div>
      </div>

      {/* Main transaction info */}
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold leading-tight text-foreground">
            {transaction.description}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <span
            className={cn(
              'text-lg font-bold tabular-nums tracking-tight',
              isIncome ? 'text-success' : 'text-foreground'
            )}
          >
            {isIncome ? `+${formattedAmount}` : `-${formattedAmount}`}
          </span>
        </div>
      </div>

      {/* Metadata pills (Account & Category) */}
      <div className="mt-3 flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
        {transaction.categoryName && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-secondary/60 px-2 py-1 font-medium text-foreground/90">
            <span aria-hidden="true">{categoryEmoji}</span>
            <span>{transaction.categoryName}</span>
          </span>
        )}

        {transaction.accountName && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/60 px-2 py-1 font-medium text-foreground/90">
            <Wallet className="h-3 w-3 text-primary" aria-hidden="true" />
            <span>{transaction.accountName}</span>
          </span>
        )}
      </div>
    </motion.div>
  );
}
