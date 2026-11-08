'use client';

import { createContext, useContext } from 'react';
import type { ScannedReceiptResult } from '@/lib/ai/receipt-scanner/types';
import type { CreateTransactionDTO } from '@/types/domain';

/**
 * Side effects the chat cards can trigger. Provided by ChatInterface; cards
 * render read-only when it is absent (e.g. in isolated renders).
 */
export interface ChatActions {
  /** Sends a text reply as the user (clarification choices). */
  reply: (text: string) => void;
  undoTransaction: (transactionId: string) => Promise<void>;
  changeCategory: (transactionId: string, categoryId: string) => Promise<void>;
  categories: Array<{ id: string; name: string; kind: 'INCOME' | 'EXPENSE' }>;
  accounts: Array<{ id: string; name: string; currencyCode: string }>;
  scanReceipt: (file: File) => Promise<ScannedReceiptResult>;
  /** Creates the expense and closes the pending item it settles. */
  settlePendingReceipt: (
    pendingId: string,
    transaction: CreateTransactionDTO
  ) => Promise<void>;
}

export const ChatActionsContext = createContext<ChatActions | null>(null);

export function useChatActions(): ChatActions | null {
  return useContext(ChatActionsContext);
}
