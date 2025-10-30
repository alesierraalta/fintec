import { openai, AI_MODEL, AI_TEMPERATURE } from './config';
import { supabase } from '@/repositories/supabase/client';

interface FinancialAdvice {
  summary: string;
  advice: Array<{
    category: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
    potentialSavings?: number;
  }>;
  strengths: string[];
  areasForImprovement: string[];
}

/**
 * Provides personalized financial advice
 */
export async function getFinancialAdvice(userId: string): Promise<FinancialAdvice | null> {
  try {
    // Get financial overview
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        amount_base_minor,
        type,
        date,
        categories(name, kind)
      `)
      .gte('date', threeMonthsAgo.toISOString());

    const { data: budgets } = await supabase
      .from('budgets')
      .select('amount_base_minor, spent_base_minor, categories(name)');

    const { data: goals } = await supabase
      .from('goals')
      .select('name, target_base_minor, current_base_minor, active')
      .eq('active', true);

    if (!transactions) {
      return null;
    }

    // Calculate summary statistics
    const tx = (transactions as any[]) || [];
    const income = tx
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount_base_minor, 0);

    const expenses = tx
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount_base_minor, 0);

    const categoryBreakdown = tx
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc: any, t: any) => {
        const cat = t.categories?.name || 'Sin categoría';
        acc[cat] = (acc[cat] || 0) + t.amount_base_minor;
        return acc;
      }, {});

    const financialData = {
      period: '3 meses',
      totalIncome: income / 100,
      totalExpenses: expenses / 100,
      netSavings: (income - expenses) / 100,
      savingsRate: income > 0 ? ((income - expenses) / income * 100).toFixed(1) : 0,
      categoryBreakdown: Object.entries(categoryBreakdown)
        .map(([name, amount]) => ({
          name,
          amount: (amount as number) / 100,
          percentage: income > 0 ? ((amount as number) / expenses * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
      budgets: (budgets as any[])?.map((b: any) => ({
        category: b?.categories?.name,
        budget: (b?.amount_base_minor || 0) / 100,
        spent: (b?.spent_base_minor || 0) / 100,
        remaining: ((b?.amount_base_minor || 0) - (b?.spent_base_minor || 0)) / 100
      })),
      goals: (goals as any[])?.map((g: any) => ({
        name: g?.name,
        target: (g?.target_base_minor || 0) / 100,
        current: (g?.current_base_minor || 0) / 100,
        progress: ((g?.current_base_minor || 0) / (g?.target_base_minor || 1) * 100).toFixed(1)
      }))
    };

    const prompt = `Eres un asesor financiero personal experto. Analiza la siguiente información financiera y proporciona consejos personalizados y accionables:

${JSON.stringify(financialData, null, 2)}

Proporciona un análisis completo. Responde ÚNICAMENTE en formato JSON:
{
  "summary": "resumen general de la situación financiera",
  "advice": [
    {
      "category": "categoría o área",
      "suggestion": "consejo específico",
      "priority": "high" | "medium" | "low",
      "potentialSavings": número opcional
    }
  ],
  "strengths": ["fortaleza 1", "fortaleza 2"],
  "areasForImprovement": ["área 1", "área 2"]
}`;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Eres un asesor financiero certificado que brinda consejos prácticos y personalizados.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: AI_TEMPERATURE,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      summary: result.summary || '',
      advice: result.advice || [],
      strengths: result.strengths || [],
      areasForImprovement: result.areasForImprovement || [],
    };
  } catch (error) {
    return null;
  }
}

