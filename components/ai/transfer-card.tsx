'use client';

import { ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/ai/tools/formatters';
import { ChatCard, ChatChip } from './chat-card';

export interface TransferCardProps {
  label: string;
  fromAccountName: string;
  toAccountName: string;
  amountMinor?: number;
  currencyCode?: string;
  note: string;
}

/** Money that moved between the user's own accounts (never an expense). */
export function TransferCard({
  label,
  fromAccountName,
  toAccountName,
  amountMinor,
  currencyCode,
  note,
}: TransferCardProps) {
  return (
    <ChatCard label={label}>
      {amountMinor !== undefined && currencyCode && (
        <p className="text-2xl font-bold tabular-nums tracking-tight text-primary">
          {formatCurrency(amountMinor, currencyCode)}
        </p>
      )}
      <div className="my-2 flex items-center gap-2 font-semibold">
        <ChatChip>{fromAccountName}</ChatChip>
        <ArrowRight className="h-4 w-4" aria-label="hacia" />
        <ChatChip>{toAccountName}</ChatChip>
      </div>
      <p className="text-sm text-muted-foreground">{note}</p>
    </ChatCard>
  );
}
