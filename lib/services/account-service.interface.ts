import type { Account, AccountType } from '@/types';

/**
 * Filters for querying accounts.
 */
export interface AccountFilters {
  type?: AccountType;
  active?: boolean;
  currencyCode?: string;
}

/**
 * DTO for creating a new account.
 */
export interface CreateAccountDTO {
  name: string;
  type: AccountType;
  currencyCode: string;
  balance?: number;
  active?: boolean;
}

/**
 * DTO for updating an existing account.
 */
export interface UpdateAccountDTO {
  name?: string;
  type?: AccountType;
  currencyCode?: string;
  balance?: number;
  active?: boolean;
}

/**
 * Balance summary across accounts.
 */
export interface BalanceSummary {
  totalByType: Record<AccountType, number>;
  totalByCurrency: Record<string, number>;
  total: number;
}

/**
 * AccountService interface.
 *
 * Defines the business logic layer for accounts.
 * Handles validation, authorization, and balance operations.
 */
export interface IAccountService {
  /**
   * Fetch accounts with optional filters.
   */
  findAll(filters?: AccountFilters): Promise<Account[]>;

  /**
   * Fetch a single account by ID.
   */
  findById(id: string): Promise<Account | null>;

  /**
   * Create a new account with validation.
   */
  create(dto: CreateAccountDTO): Promise<Account>;

  /**
   * Update an existing account.
   */
  update(id: string, dto: UpdateAccountDTO): Promise<Account>;

  /**
   * Delete an account.
   */
  remove(id: string): Promise<void>;

  /**
   * Get balance summary across all accounts.
   */
  getBalanceSummary(): Promise<BalanceSummary>;
}
