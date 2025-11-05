import { openai, AI_MODEL, AI_TEMPERATURE, AI_MAX_TOKENS } from './config';
import { supabase } from '@/repositories/supabase/client';
import { createPredictionsTemplate, predictionsSystemPrompt } from './prompts/templates/predictions';

interface SpendingPrediction {
  nextMonth: {
    total: number;
    byCategory: Array<{
      categoryName: string;
      predicted: number;
      trend: 'up' | 'down' | 'stable';
    }>;
  };
  insights: string[];
  recommendations: string[];
}

/**
 * Predicts spending for the next month based on historical data
 */
export async function predictSpending(userId: string): Promise<SpendingPrediction | null> {
  try {
    // Get last 6 months of transactions
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        amount_base_minor,
        type,
        date,
        category_id,
        categories(name)
      `)
      .eq('type', 'EXPENSE')
      .gte('date', sixMonthsAgo.toISOString())
      .order('date', { ascending: true });

    if (!transactions || transactions.length < 10) {
      return null; // Not enough data
    }

    // Aggregate by month and category
    const monthlyData = transactions.reduce((acc: any, txn: any) => {
      const month = txn.date.slice(0, 7); // YYYY-MM
      const categoryName = txn.categories?.name || 'Sin categoría';
      
      if (!acc[month]) {
        acc[month] = { total: 0, categories: {} };
      }
      
      acc[month].total += txn.amount_base_minor;
      acc[month].categories[categoryName] = 
        (acc[month].categories[categoryName] || 0) + txn.amount_base_minor;
      
      return acc;
    }, {});

    const monthlyDataStr = JSON.stringify(monthlyData, null, 2);

    // Usar template modular para el prompt
    const predictionsTemplate = createPredictionsTemplate(monthlyDataStr);
    const prompt = predictionsTemplate.content;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: predictionsSystemPrompt,
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

    return {
      nextMonth: {
        total: result.nextMonthTotal || 0,
        byCategory: result.categoryPredictions || [],
      },
      insights: result.insights || [],
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    return null;
  }
}

/**
 * Identifies spending trends
 */
export async function identifyTrends(userId: string): Promise<string[]> {
  try {
    const prediction = await predictSpending(userId);
    return prediction?.insights || [];
  } catch (error) {
    return [];
  }
}

