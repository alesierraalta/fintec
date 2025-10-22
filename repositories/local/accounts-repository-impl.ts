import { Account, AccountType, PaginatedResult, PaginationParams } from '@/types';
import { AccountsRepository, CreateAccountDTO, UpdateAccountDTO } from '@/repositories/contracts';
import { db } from './db';
import { generateId } from '@/lib/utils';

export class LocalAccountsRepository implements AccountsRepository {
  async findById(id: string): Promise<Account | null> {
    return (await db.accounts.get(id)) || null;
  }

  async findAll(): Promise<Account[]> {
    return db.accounts.orderBy('createdAt').toArray();
  }

  async create(data: CreateAccountDTO): Promise<Account> {
    try {
      
      const account: Account = {
        id: generateId('acc'),
        userId: 'local-user', // For local storage, we use a fixed user ID
        name: data.name,
        type: data.type,
        currencyCode: data.currencyCode,
        balance: data.balance || 0,
        active: data.active ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      
      // Intentar agregar la cuenta a IndexedDB
      const addResult = await db.accounts.add(account);
      
      // Verificar que la cuenta se guardó correctamente
      const savedAccount = await db.accounts.get(account.id);
      if (!savedAccount) {
        throw new Error(`La cuenta con ID ${account.id} no se pudo guardar en IndexedDB`);
      }
      
      
      // Verificar que el conteo de cuentas aumentó
      const totalAccounts = await db.accounts.count();
      
      return savedAccount;
      
    } catch (error) {
      
      // Proporcionar errores más específicos
      if (error instanceof Error) {
        if (error.name === 'ConstraintError') {
          throw new Error(`Ya existe una cuenta con el ID generado. Intenta nuevamente.`);
        } else if (error.name === 'QuotaExceededError') {
          throw new Error(`No hay suficiente espacio de almacenamiento para crear la cuenta.`);
        } else if (error.name === 'InvalidStateError') {
          throw new Error(`La base de datos está en un estado inválido. Intenta recargar la página.`);
        } else {
          throw new Error(`Error al crear la cuenta: ${error.message}`);
        }
      }
      
      throw new Error('Error desconocido al crear la cuenta');
    }
  }

  async update(id: string, data: UpdateAccountDTO): Promise<Account> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Account with id ${id} not found`);
    }

    const updated: Account = {
      ...existing,
      ...data,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    await db.accounts.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    // Check if account has transactions
    const transactionCount = await db.transactions.where('accountId').equals(id).count();
    if (transactionCount > 0) {
      throw new Error('Cannot delete account with existing transactions');
    }

    await db.accounts.delete(id);
  }

  async createMany(data: CreateAccountDTO[]): Promise<Account[]> {
    const accounts: Account[] = data.map(item => ({
      id: generateId('acc'),
      userId: 'local-user',
      name: item.name,
      type: item.type,
      currencyCode: item.currencyCode,
      balance: item.balance || 0,
      active: item.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await db.accounts.bulkAdd(accounts);
    return accounts;
  }

  async deleteMany(ids: string[]): Promise<void> {
    // Check if any account has transactions
    for (const id of ids) {
      const transactionCount = await db.transactions.where('accountId').equals(id).count();
      if (transactionCount > 0) {
        throw new Error(`Cannot delete account ${id} with existing transactions`);
      }
    }

    await db.accounts.bulkDelete(ids);
  }

  async findPaginated(params: PaginationParams): Promise<PaginatedResult<Account>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const offset = (page - 1) * limit;

    let query = db.accounts.orderBy(sortBy as keyof Account);
    if (sortOrder === 'desc') {
      query = query.reverse();
    }

    const total = await db.accounts.count();
    const data = await query.offset(offset).limit(limit).toArray();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async count(): Promise<number> {
    return db.accounts.count();
  }

  async exists(id: string): Promise<boolean> {
    return (await db.accounts.get(id)) !== undefined;
  }

  // Account-specific methods
  async findByUserId(userId: string): Promise<Account[]> {
    return db.accounts.where('userId').equals(userId).toArray();
  }

  async findByType(type: AccountType): Promise<Account[]> {
    return db.accounts.where('type').equals(type).toArray();
  }

  async findByCurrency(currencyCode: string): Promise<Account[]> {
    return db.accounts.where('currencyCode').equals(currencyCode).toArray();
  }

  async findActive(): Promise<Account[]> {
    return db.accounts.where('active').equals(1).toArray(); // Dexie uses 1 for true
  }

  async updateBalance(id: string, newBalance: number): Promise<Account> {
    const account = await this.findById(id);
    if (!account) {
      throw new Error(`Account with id ${id} not found`);
    }

    const updated: Account = {
      ...account,
      balance: newBalance,
      updatedAt: new Date().toISOString(),
    };

    await db.accounts.put(updated);
    return updated;
  }

  async adjustBalance(id: string, adjustment: number): Promise<Account> {
    const account = await this.findById(id);
    if (!account) {
      throw new Error(`Account with id ${id} not found`);
    }

    const newBalance = account.balance + adjustment;
    return this.updateBalance(id, newBalance);
  }

  async updateBalances(updates: { id: string; newBalance: number }[]): Promise<Account[]> {
    const accounts: Account[] = [];

    await db.transaction('rw', db.accounts, async () => {
      for (const update of updates) {
        const account = await db.accounts.get(update.id);
        if (!account) {
          throw new Error(`Account with id ${update.id} not found`);
        }

        const updated: Account = {
          ...account,
          balance: update.newBalance,
          updatedAt: new Date().toISOString(),
        };

        await db.accounts.put(updated);
        accounts.push(updated);
      }
    });

    return accounts;
  }

  async getTotalBalanceByType(type: AccountType): Promise<number> {
    const accounts = await db.accounts.where('type').equals(type).and(account => account.active).toArray();
    return accounts.reduce((total, account) => total + account.balance, 0);
  }

  async getTotalBalanceByCurrency(currencyCode: string): Promise<number> {
    const accounts = await db.accounts.where('currencyCode').equals(currencyCode).and(account => account.active).toArray();
    return accounts.reduce((total, account) => total + account.balance, 0);
  }

  async getBalanceSummary(): Promise<{
    totalByType: Record<AccountType, number>;
    totalByCurrency: Record<string, number>;
    total: number;
  }> {
    const accounts = await db.accounts.where('active').equals(1).toArray(); // Dexie uses 1 for true

    const totalByType: Record<AccountType, number> = {
      [AccountType.CASH]: 0,
      [AccountType.BANK]: 0,
      [AccountType.CARD]: 0,
      [AccountType.INVESTMENT]: 0,
      [AccountType.SAVINGS]: 0,
    };

    const totalByCurrency: Record<string, number> = {};
    let total = 0;

    for (const account of accounts) {
      totalByType[account.type] += account.balance;
      totalByCurrency[account.currencyCode] = (totalByCurrency[account.currencyCode] || 0) + account.balance;
      total += account.balance; // Note: This assumes all amounts are in base currency
    }

    return {
      totalByType,
      totalByCurrency,
      total,
    };
  }
}
