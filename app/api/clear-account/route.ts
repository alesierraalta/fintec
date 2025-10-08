import { NextRequest, NextResponse } from 'next/server';
import { SupabaseAppRepository } from '@/repositories/supabase';
import { supabase } from '@/repositories/supabase/client';
import type { Budget, SavingsGoal } from '@/types';

import { logger } from '@/lib/utils/logger';

const repository = new SupabaseAppRepository();

/**
 * API endpoint to clear all user data
 * This is a destructive operation that deletes:
 * - All transactions
 * - All accounts
 * - All budgets
 * - All goals
 * - All categories (user-specific)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in first' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Parse request body for confirmation
    const body = await request.json();
    const { confirmationText } = body;

    // Security check: require exact confirmation text
    if (confirmationText !== 'VACIAR CUENTA') {
      return NextResponse.json(
        { error: 'Confirmation text does not match. Operation cancelled.' },
        { status: 400 }
      );
    }

    // Track deleted items for response
    const deletedCounts = {
      transactions: 0,
      budgets: 0,
      goals: 0,
      accounts: 0,
      notifications: 0
    };

    // Execute deletion in correct order (respecting foreign key constraints)
    
    // 1. Get all user accounts first
    const userAccounts = await repository.accounts.findByUserId(userId);
    const accountIds = userAccounts.map(acc => acc.id);

    // 2. Delete all transactions from user accounts
    const allTransactions = await repository.transactions.findAll();
    const userTransactions = allTransactions.filter(t => accountIds.includes(t.accountId));
    
    if (userTransactions.length > 0) {
      await repository.transactions.deleteMany(userTransactions.map(t => t.id));
      deletedCounts.transactions = userTransactions.length;
    }

    // 3. Delete all budgets (user-specific)
    const allBudgets = await repository.budgets.findAll();
    const userBudgets = allBudgets.filter((budget: Budget) => budget.userId === userId);
    
    if (userBudgets.length > 0) {
      await repository.budgets.deleteMany(userBudgets.map((budget: Budget) => budget.id));
      deletedCounts.budgets = userBudgets.length;
    }

    // 4. Delete all goals (user-specific)
    const allGoals = await repository.goals.findAll();
    const userGoals = allGoals.filter((goal: SavingsGoal) => {
      // Goals are user-specific if they're linked to user's accounts
      return goal.accountId ? accountIds.includes(goal.accountId) : true;
    });
    
    if (userGoals.length > 0) {
      await repository.goals.deleteMany(userGoals.map((goal: SavingsGoal) => goal.id));
      deletedCounts.goals = userGoals.length;
    }

    // 5. Delete all accounts
    if (accountIds.length > 0) {
      await repository.accounts.deleteMany(accountIds);
      deletedCounts.accounts = accountIds.length;
    }

    // 6. Delete notifications (optional - may not exist yet)
    try {
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (!notificationsError) {
        deletedCounts.notifications = 0; // We don't track count for notifications
      }
    } catch (error) {
      // Notifications table might not exist, continue
      logger.info('Notifications deletion skipped:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Account data cleared successfully',
      deletedAt: new Date().toISOString(),
      deleted: deletedCounts
    });

  } catch (error: any) {
    logger.error('Error clearing account:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clear account data',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

