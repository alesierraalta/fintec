import type { Account, AccountType } from '@/types';
import type { AccountsRepository } from '@/repositories/contracts/accounts-repository';
import type {
  IAccountService,
  AccountFilters,
  CreateAccountDTO,
  UpdateAccountDTO,
  BalanceSummary,
} from './account-service.interface';
import { ValidationError } from '@/lib/errors/validation-error';
import { NotFoundError } from '@/lib/errors/not-found-error';

/**
 * AccountService implements IAccountService.
 *
 * Extracts business logic from API routes into a testable service layer.
 */
export class AccountService implements IAccountService {
  constructor(private readonly accountsRepo: AccountsRepository) {}

  async findAll(filters?: AccountFilters): Promise<Account[]> {
    if (filters?.type) {
      return this.accountsRepo.findByType(filters.type);
    }

    if (filters?.active === true) {
      return this.accountsRepo.findActive();
    }

    if (filters?.currencyCode) {
      return this.accountsRepo.findByCurrency(filters.currencyCode);
    }

    return this.accountsRepo.findAll();
  }

  async findById(id: string): Promise<Account | null> {
    return this.accountsRepo.findById(id);
  }

  async create(dto: CreateAccountDTO): Promise<Account> {
    // Validate required fields
    if (!dto.name) {
      throw new ValidationError('name is required');
    }

    if (!dto.type) {
      throw new ValidationError('type is required');
    }

    if (!dto.currencyCode) {
      throw new ValidationError('currencyCode is required');
    }

    return this.accountsRepo.create({
      ...dto,
      active: dto.active ?? true,
    });
  }

  async update(id: string, dto: UpdateAccountDTO): Promise<Account> {
    // Verify account exists
    const existing = await this.accountsRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Account ${id} not found`);
    }

    // Spread id into DTO for repository (repository expects id in DTO)
    return this.accountsRepo.update(id, { ...dto, id });
  }

  async remove(id: string): Promise<void> {
    // Verify account exists
    const existing = await this.accountsRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Account ${id} not found`);
    }

    return this.accountsRepo.delete(id);
  }

  async getBalanceSummary(): Promise<BalanceSummary> {
    return this.accountsRepo.getBalanceSummary();
  }
}
