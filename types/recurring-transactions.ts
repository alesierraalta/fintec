import { TransactionType } from './domain';

export interface RecurringTransaction {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  accountId: string;
  categoryId?: string;
  currencyCode: string;
  amountMinor: number;
  description?: string;
  note?: string;
  tags?: string[];
  frequency: RecurringFrequency;
  intervalCount: number;
  startDate: string; // ISO date string
  endDate?: string; // ISO date string, null means no end date
  nextExecutionDate: string; // ISO date string
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CreateRecurringTransactionDTO {
  name: string;
  type: TransactionType;
  accountId: string;
  categoryId?: string;
  currencyCode: string;
  amountMinor: number;
  description?: string;
  note?: string;
  tags?: string[];
  frequency: RecurringFrequency;
  intervalCount?: number; // Default 1
  startDate: string; // ISO date string
  endDate?: string; // ISO date string, null means no end date
}

export interface UpdateRecurringTransactionDTO {
  name?: string;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  currencyCode?: string;
  amountMinor?: number;
  description?: string;
  note?: string;
  tags?: string[];
  frequency?: RecurringFrequency;
  intervalCount?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface RecurringTransactionSummary {
  totalActive: number;
  totalInactive: number;
  nextExecutions: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  byFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
}

// Helper functions
export const getFrequencyLabel = (frequency: RecurringFrequency): string => {
  switch (frequency) {
    case 'daily':
      return 'Diario';
    case 'weekly':
      return 'Semanal';
    case 'monthly':
      return 'Mensual';
    case 'yearly':
      return 'Anual';
    default:
      return 'Desconocido';
  }
};

export const getNextExecutionDescription = (
  frequency: RecurringFrequency,
  intervalCount: number,
  nextExecutionDate: string
): string => {
  const date = new Date(nextExecutionDate);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays < 0) return 'Vencida';

  const intervalText = intervalCount === 1 ? '' : ` cada ${intervalCount}`;
  const frequencyText = getFrequencyLabel(frequency).toLowerCase();

  return `En ${diffDays} días (${frequencyText}${intervalText})`;
};



