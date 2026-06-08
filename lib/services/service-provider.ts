import type { AppRepository } from '@/repositories/contracts';
import type { ITransactionService } from './transaction-service.interface';
import type { IAccountService } from './account-service.interface';
import type { ICategoryService } from './category-service.interface';
import { TransactionService } from './transaction-service';
import { AccountService } from './account-service';
import { CategoryService } from './category-service';

/**
 * Services bundle created by the service provider.
 */
export interface ServerServices {
  transactionService: ITransactionService;
  accountService: IAccountService;
  categoryService: ICategoryService;
}

/**
 * Creates all server-side services with repository injection.
 *
 * Follows the existing factory pattern from repositories/factory.ts.
 * Services receive repository interfaces via constructor for testability.
 *
 * @param repository - The AppRepository containing all data access repositories
 * @returns ServerServices bundle with all service instances
 */
export function createServerServices(
  repository: AppRepository
): ServerServices {
  return {
    transactionService: new TransactionService(
      repository.transactions,
      repository.accounts
    ),
    accountService: new AccountService(repository.accounts),
    categoryService: new CategoryService(repository.categories),
  };
}
