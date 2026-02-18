import type { Transaction } from '@/types/domain';

export interface TransferFilters {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface TransferRecord {
  id: string;
  fromTransaction: Transaction | null;
  toTransaction: Transaction | null;
  amountMinor: number;
  date?: string;
  description?: string;
}

export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amountMajor: number;
  description?: string;
  date?: string;
  exchangeRate?: number;
  rateSource?: string | null;
}

export interface CreateTransferResult {
  transferId: string;
  fromTransactionId?: string;
  toTransactionId?: string;
  fromAmount?: number;
  toAmount?: number;
  fromCurrency?: string;
  toCurrency?: string;
  exchangeRate?: number;
}

export interface TransfersRepository {
  listByUserId(
    userId: string,
    filters?: TransferFilters
  ): Promise<TransferRecord[]>;
  create(
    userId: string,
    input: CreateTransferInput
  ): Promise<CreateTransferResult>;
  delete(userId: string, transferId: string): Promise<void>;
}
