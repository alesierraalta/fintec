import { openai, AI_MODEL, AI_TEMPERATURE, AI_MAX_TOKENS } from './config';
import { supabase } from '@/repositories/supabase/client';
import { createBudgetOptimizerTemplate, budgetOptimizerSystemPrompt } from './prompts/templates/budget-optimizer';

interface BudgetOptimization {
  categoryId: string;
  categoryName: string;
  currentBudget: number;
  suggestedBudget: number;
  reason: string;
  potentialSavings: number;
}

/**
 * Suggests budget optimizations based on spending patterns
 */
export async function optimizeBudgets(userId: string): Promise<BudgetOptimization[]> {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Get current budgets
    const { data: budgets } = await supabase
      .from('budgets')
      .select(`
        id,
        category_id,
        amount_base_minor,
        spent_minor,
        categories(id, name)
      `)
      .eq('active', true);

    // Get historical spending by category
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        amount_base_minor,
        category_id,
        date,
        categories(name)
      `)
      .eq('type', 'EXPENSE')
      .gte('date', threeMonthsAgo.toISOString());

    if (!budgets || !transactions) {
      return [];
    }

    // Calculate actual spending by category
    const spendingByCategory = transactions.reduce((acc: any, txn: any) => {
      const catId = txn.category_id;
      if (!acc[catId]) {
        acc[catId] = {
          name: txn.categories?.name || 'Sin categoría',
          amounts: []
        };
      }
      acc[catId].amounts.push(txn.amount_base_minor);
      return acc;
    }, {});

    // Calculate averages
    const categoryStats = Object.entries(spendingByCategory).map(([catId, data]: [string, any]) => ({
      categoryId: catId,
      categoryName: data.name,
      averageMonthly: data.amounts.reduce((sum: number, a: number) => sum + a, 0) / 3, // 3 months
      transactions: data.amounts.length
    }));

    const budgetData = budgets.map((b: any) => ({
      categoryId: b.category_id,
      categoryName: b.categories?.name,
      currentBudget: b.amount_base_minor / 100,
      currentSpent: (b.spent_minor || 0) / 100,
      actualAverage: (categoryStats.find(s => s.categoryId === b.category_id)?.averageMonthly || 0) / 100
    }));

    // Usar template modular para el prompt
    const budgetOptimizerTemplate = createBudgetOptimizerTemplate(budgetData);
    const prompt = budgetOptimizerTemplate.content;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: budgetOptimizerSystemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: AI_TEMPERATURE,
      max_tokens: AI_MAX_TOKENS,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return (result.optimizations || []).map((opt: any) => ({
      categoryId: opt.categoryId,
      categoryName: opt.categoryName,
      currentBudget: budgetData.find(b => b.categoryId === opt.categoryId)?.currentBudget || 0,
      suggestedBudget: opt.suggestedBudget,
      reason: opt.reason,
      potentialSavings: opt.potentialSavings,
    }));
  } catch (error) {
    return [];
  }
}

