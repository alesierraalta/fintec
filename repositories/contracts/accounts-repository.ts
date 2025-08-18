import { Account, AccountType } from '@/types';
import { BaseRepository } from './base-repository';

export interface CreateAccountDTO {
  name: string;
  type: AccountType;
  currencyCode: string;
  balance?: number; // in minor units
  active?: boolean;
}

export interface UpdateAccountDTO extends Partial<CreateAccountDTO> {
  id: string;
}

export interface AccountsRepository extends BaseRepository<Account, CreateAccountDTO, UpdateAccountDTO> {
  // Account-specific queries
  findByUserId(userId: string): Promise<Account[]>;
  findByType(type: AccountType): Promise<Account[]>;
  findByCurrency(currencyCode: string): Promise<Account[]>;
  findActive(): Promise<Account[]>;
  
  // Balance operations
  updateBalance(id: string, newBalance: number): Promise<Account>;
  adjustBalance(id: string, adjustment: number): Promise<Account>;
  
  // Bulk balance updates (for transfers)
  updateBalances(updates: { id: string; newBalance: number }[]): Promise<Account[]>;
  
  // Statistics
  getTotalBalanceByType(type: AccountType): Promise<number>;
  getTotalBalanceByCurrency(currencyCode: string): Promise<number>;
  getBalanceSummary(): Promise<{
    totalByType: Record<AccountType, number>;
    totalByCurrency: Record<string, number>;
    total: number;
  }>;
}
