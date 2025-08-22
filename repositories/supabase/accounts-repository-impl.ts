// Supabase implementation for AccountsRepository
// TODO: Complete implementation when migrating to Supabase

import { Account, AccountType, PaginatedResult, PaginationParams } from '@/types';
import { AccountsRepository, CreateAccountDTO, UpdateAccountDTO } from '@/repositories/contracts';
import { supabase } from './client';
import { 
  mapSupabaseAccountToDomain, 
  mapDomainAccountToSupabase,
  mapSupabaseAccountArrayToDomain 
} from './mappers';

export class SupabaseAccountsRepository implements AccountsRepository {
  async findById(id: string): Promise<Account | null> {
    // TODO: Implement Supabase query
    console.log('TODO: Implement SupabaseAccountsRepository.findById', id);
    throw new Error('Supabase implementation not ready yet');
    
    /*
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to find account: ${error.message}`);
    }
    
    return mapSupabaseAccountToDomain(data);
    */
  }

  async findAll(): Promise<Account[]> {
    // TODO: Implement Supabase query
    console.log('TODO: Implement SupabaseAccountsRepository.findAll');
    throw new Error('Supabase implementation not ready yet');
    
    /*
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }
    
    return mapSupabaseAccountArrayToDomain(data || []);
    */
  }

  async create(data: CreateAccountDTO): Promise<Account> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const accountData = {
        ...mapDomainAccountToSupabase(data as Account),
        user_id: user.user.id,
      };

      const { data: insertedData, error } = await supabase
        .from('accounts')
        .insert(accountData)
        .select()
        .single();

      if (error) {
        console.error('Error creating account:', error);
        throw new Error(`Failed to create account: ${error.message}`);
      }

      return mapSupabaseAccountToDomain(insertedData);
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateAccountDTO): Promise<Account> {
    // TODO: Implement Supabase update
    console.log('TODO: Implement SupabaseAccountsRepository.update', id, data);
    throw new Error('Supabase implementation not ready yet');
    
    /*
    const updateData = mapDomainAccountToSupabase(data as Account);
    
    const { data: updatedData, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update account: ${error.message}`);
    }

    return mapSupabaseAccountToDomain(updatedData);
    */
  }

  async delete(id: string): Promise<void> {
    // TODO: Implement Supabase delete with transaction check
    console.log('TODO: Implement SupabaseAccountsRepository.delete', id);
    throw new Error('Supabase implementation not ready yet');
    
    /*
    // Check if account has transactions
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', id);

    if (count && count > 0) {
      throw new Error('Cannot delete account with existing transactions');
    }

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete account: ${error.message}`);
    }
    */
  }

  async createMany(data: CreateAccountDTO[]): Promise<Account[]> {
    // TODO: Implement bulk insert
    console.log('TODO: Implement SupabaseAccountsRepository.createMany', data);
    throw new Error('Supabase implementation not ready yet');
    
    /*
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const accountsData = data.map(item => ({
      ...mapDomainAccountToSupabase(item as Account),
      user_id: user.user.id,
    }));

    const { data: insertedData, error } = await supabase
      .from('accounts')
      .insert(accountsData)
      .select();

    if (error) {
      throw new Error(`Failed to create accounts: ${error.message}`);
    }

    return mapSupabaseAccountArrayToDomain(insertedData || []);
    */
  }

  async deleteMany(ids: string[]): Promise<void> {
    // TODO: Implement bulk delete
    console.log('TODO: Implement SupabaseAccountsRepository.deleteMany', ids);
    throw new Error('Supabase implementation not ready yet');
    
    /*
    // Check if any account has transactions
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .in('account_id', ids);

    if (count && count > 0) {
      throw new Error('Cannot delete accounts with existing transactions');
    }

    const { error } = await supabase
      .from('accounts')
      .delete()
      .in('id', ids);

    if (error) {
      throw new Error(`Failed to delete accounts: ${error.message}`);
    }
    */
  }

  async findPaginated(params: PaginationParams): Promise<PaginatedResult<Account>> {
    // TODO: Implement pagination
    console.log('TODO: Implement SupabaseAccountsRepository.findPaginated', params);
    throw new Error('Supabase implementation not ready yet');
    
    /*
    const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = params;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('accounts')
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch paginated accounts: ${error.message}`);
    }

    return {
      data: mapSupabaseAccountArrayToDomain(data || []),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
    */
  }

  async count(): Promise<number> {
    // TODO: Implement count
    console.log('TODO: Implement SupabaseAccountsRepository.count');
    throw new Error('Supabase implementation not ready yet');
    
    /*
    const { count, error } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to count accounts: ${error.message}`);
    }

    return count || 0;
    */
  }

  async exists(id: string): Promise<boolean> {
    // TODO: Implement exists check
    console.log('TODO: Implement SupabaseAccountsRepository.exists', id);
    throw new Error('Supabase implementation not ready yet');
    
    /*
    const { count, error } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to check account existence: ${error.message}`);
    }

    return (count || 0) > 0;
    */
  }

  // Account-specific methods
  async findByUserId(userId: string): Promise<Account[]> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching accounts by user ID:', error);
        throw new Error(`Failed to fetch accounts: ${error.message}`);
      }
      
      return mapSupabaseAccountArrayToDomain(data || []);
    } catch (error) {
      console.error('Error in findByUserId:', error);
      throw error;
    }
  }

  async findByType(type: AccountType): Promise<Account[]> {
    // TODO: Implement type-specific query
    console.log('TODO: Implement SupabaseAccountsRepository.findByType', type);
    throw new Error('Supabase implementation not ready yet');
  }

  async findByCurrency(currencyCode: string): Promise<Account[]> {
    // TODO: Implement currency-specific query
    console.log('TODO: Implement SupabaseAccountsRepository.findByCurrency', currencyCode);
    throw new Error('Supabase implementation not ready yet');
  }

  async findActive(): Promise<Account[]> {
    // TODO: Implement active accounts query
    console.log('TODO: Implement SupabaseAccountsRepository.findActive');
    throw new Error('Supabase implementation not ready yet');
  }

  async updateBalance(id: string, newBalance: number): Promise<Account> {
    // TODO: Implement balance update
    console.log('TODO: Implement SupabaseAccountsRepository.updateBalance', id, newBalance);
    throw new Error('Supabase implementation not ready yet');
  }

  async adjustBalance(id: string, adjustment: number): Promise<Account> {
    // TODO: Implement balance adjustment
    console.log('TODO: Implement SupabaseAccountsRepository.adjustBalance', id, adjustment);
    throw new Error('Supabase implementation not ready yet');
  }

  async updateBalances(updates: { id: string; newBalance: number }[]): Promise<Account[]> {
    // TODO: Implement bulk balance updates
    console.log('TODO: Implement SupabaseAccountsRepository.updateBalances', updates);
    throw new Error('Supabase implementation not ready yet');
  }

  async getTotalBalanceByType(type: AccountType): Promise<number> {
    // TODO: Implement aggregation query
    console.log('TODO: Implement SupabaseAccountsRepository.getTotalBalanceByType', type);
    throw new Error('Supabase implementation not ready yet');
  }

  async getTotalBalanceByCurrency(currencyCode: string): Promise<number> {
    // TODO: Implement aggregation query
    console.log('TODO: Implement SupabaseAccountsRepository.getTotalBalanceByCurrency', currencyCode);
    throw new Error('Supabase implementation not ready yet');
  }

  async getBalanceSummary(): Promise<{
    totalByType: Record<AccountType, number>;
    totalByCurrency: Record<string, number>;
    total: number;
  }> {
    // TODO: Implement complex aggregation query
    console.log('TODO: Implement SupabaseAccountsRepository.getBalanceSummary');
    throw new Error('Supabase implementation not ready yet');
  }
}
