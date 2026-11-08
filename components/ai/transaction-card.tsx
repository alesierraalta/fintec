'use client';

import { useState } from 'react';
import { Wallet, CalendarDays } from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  getCategoryEmoji,
} from '@/lib/ai/tools/formatters';
import { cn } from '@/lib/utils';
import { useChatActions } from './chat-actions';
import {
  ChatCard,
  ChatCardActions,
  ChatCardButton,
  ChatChip,
} from './chat-card';

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

type CardState = 'idle' | 'busy' | 'undone' | 'failed';

/**
 * A movement the agent just recorded. With chat actions available it offers
 * "Cambiar categoría" (same-kind categories) and "Deshacer".
 */
export function TransactionCard({ transaction }: TransactionCardProps) {
  const actions = useChatActions();
  const isIncome = transaction.type === 'INCOME';
  const [state, setState] = useState<CardState>('idle');
  const [categoryName, setCategoryName] = useState(transaction.categoryName);
  const [picking, setPicking] = useState(false);
  const formattedAmount = formatCurrency(
    transaction.amountMinor,
    transaction.currencyCode
  );
  const canAct = Boolean(actions && transaction.id) && state !== 'undone';
  const sameKind = (actions?.categories ?? []).filter(
    (c) => c.kind === transaction.type
  );

  const run = async (task: () => Promise<void>, next: CardState) => {
    setState('busy');
    try {
      await task();
      setState(next);
    } catch {
      setState('failed');
    }
  };

  return (
    <ChatCard
      label={isIncome ? 'Ingreso registrado' : 'Gasto registrado'}
      muted={state === 'undone'}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-base text-foreground">
          {transaction.description}
        </p>
        <span
          className={cn(
            'flex-shrink-0 text-2xl font-bold tabular-nums tracking-tight',
            isIncome ? 'text-success' : 'text-error',
            state === 'undone' && 'line-through'
          )}
        >
          {isIncome ? `+${formattedAmount}` : `-${formattedAmount}`}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {categoryName && (
          <ChatChip>
            <span aria-hidden="true">{getCategoryEmoji(categoryName)}</span>
            <span>{categoryName}</span>
          </ChatChip>
        )}
        {transaction.accountName && (
          <ChatChip>
            <Wallet className="h-3 w-3 text-primary" aria-hidden="true" />
            <span>{transaction.accountName}</span>
          </ChatChip>
        )}
        <ChatChip>
          <CalendarDays className="h-3 w-3" aria-hidden="true" />
          <span>{formatDate(transaction.date)}</span>
        </ChatChip>
      </div>

      {state === 'undone' && (
        <p className="mt-3 text-sm text-muted-foreground">
          Movimiento deshecho.
        </p>
      )}
      {state === 'failed' && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          No se pudo completar la acción. Inténtalo de nuevo.
        </p>
      )}

      {picking && canAct && (
        <div
          className="mt-3 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Elegir categoría"
        >
          {sameKind.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={state === 'busy'}
              onClick={() =>
                run(async () => {
                  await actions!.changeCategory(transaction.id!, c.id);
                  setCategoryName(c.name);
                  setPicking(false);
                }, 'idle')
              }
              className="focus-ring rounded-full bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-muted"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {canAct && (
        <ChatCardActions>
          <ChatCardButton
            variant="secondary"
            disabled={state === 'busy'}
            onClick={() => setPicking((open) => !open)}
            aria-expanded={picking}
          >
            Cambiar categoría
          </ChatCardButton>
          <ChatCardButton
            variant="secondary"
            disabled={state === 'busy'}
            onClick={() =>
              run(() => actions!.undoTransaction(transaction.id!), 'undone')
            }
          >
            Deshacer
          </ChatCardButton>
        </ChatCardActions>
      )}
    </ChatCard>
  );
}
