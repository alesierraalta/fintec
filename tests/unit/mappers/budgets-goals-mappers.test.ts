import { Budget, SavingsGoal } from '@/types';
import {
  mapSupabaseBudgetToDomain,
  mapDomainBudgetToSupabase,
  mapSupabaseGoalToDomain,
  mapDomainGoalToSupabase,
} from '@/repositories/supabase/mappers';
import { SupabaseBudget, SupabaseGoal } from '@/repositories/supabase/types';

describe('Budgets and Goals Mappers', () => {
  describe('Budget Mappers', () => {
    const supabaseBudget: SupabaseBudget = {
      id: 'budget-1',
      user_id: 'user-1',
      name: 'Food Budget',
      category_id: 'cat-1',
      month_year: '2024-12',
      amount_base_minor: 50000,
      spent_base_minor: 25000,
      active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const domainBudget: Budget = {
      id: 'budget-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      monthYYYYMM: '202412',
      amountBaseMinor: 50000,
      spentMinor: 25000,
      active: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should map Supabase budget to domain correctly (including month_year format)', () => {
      const result = mapSupabaseBudgetToDomain(supabaseBudget);
      expect(result.id).toBe(domainBudget.id);
      expect(result.userId).toBe(domainBudget.userId);
      expect(result.categoryId).toBe(domainBudget.categoryId);
      expect(result.monthYYYYMM).toBe('202412'); // Fixed format
      expect(result.amountBaseMinor).toBe(domainBudget.amountBaseMinor);
      expect(result.spentMinor).toBe(domainBudget.spentMinor);
      expect(result.active).toBe(domainBudget.active);
    });

    it('should map domain budget to Supabase correctly (including month_year format)', () => {
      const result = mapDomainBudgetToSupabase(domainBudget);
      expect(result.id).toBe(supabaseBudget.id);
      expect(result.user_id).toBe(supabaseBudget.user_id);
      expect(result.category_id).toBe(supabaseBudget.category_id);
      expect(result.month_year).toBe('2024-12'); // Fixed format
      expect(result.amount_base_minor).toBe(supabaseBudget.amount_base_minor);
      expect(result.spent_base_minor).toBe(supabaseBudget.spent_base_minor);
      expect(result.active).toBe(supabaseBudget.active);
    });
  });

  describe('Goal Mappers', () => {
    const supabaseGoal: SupabaseGoal = {
      id: 'goal-1',
      user_id: 'user-1',
      name: 'Save for House',
      description: 'Dream house',
      target_base_minor: 10000000,
      current_base_minor: 1000000,
      target_date: '2030-12-31',
      account_id: 'acc-1',
      active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const domainGoal: SavingsGoal = {
      id: 'goal-1',
      name: 'Save for House',
      description: 'Dream house',
      targetBaseMinor: 10000000,
      currentBaseMinor: 1000000,
      targetDate: '2030-12-31',
      accountId: 'acc-1',
      active: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should map Supabase goal to domain correctly', () => {
      const result = mapSupabaseGoalToDomain(supabaseGoal);
      expect(result).toEqual(domainGoal);
    });

    it('should map domain goal to Supabase correctly', () => {
      const result = mapDomainGoalToSupabase(domainGoal);
      expect(result.id).toBe(supabaseGoal.id);
      expect(result.name).toBe(supabaseGoal.name);
      expect(result.description).toBe(supabaseGoal.description);
      expect(result.target_base_minor).toBe(supabaseGoal.target_base_minor);
      expect(result.current_base_minor).toBe(supabaseGoal.current_base_minor);
      expect(result.target_date).toBe(supabaseGoal.target_date);
      expect(result.account_id).toBe(supabaseGoal.account_id);
      expect(result.active).toBe(supabaseGoal.active);
    });
  });
});
