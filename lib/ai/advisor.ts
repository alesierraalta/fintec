import { openai, AI_MODEL, AI_TEMPERATURE } from './config';
import { supabase } from '@/repositories/supabase/client';

const advisorSystemPrompt = `Eres un asesor financiero personal. Analiza los datos financieros del usuario y proporciona consejos personalizados en formato JSON.`;

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

    // Crear prompt simple
    const prompt = `Analiza los siguientes datos financieros del usuario y proporciona consejos personalizados:

Período: ${financialData.period}
Ingresos totales: $${financialData.totalIncome.toFixed(2)}
Gastos totales: $${financialData.totalExpenses.toFixed(2)}
Ahorros netos: $${financialData.netSavings.toFixed(2)}
Tasa de ahorro: ${financialData.savingsRate}%

Desglose por categoría:
${financialData.categoryBreakdown.map(c => `- ${c.name}: $${c.amount.toFixed(2)} (${c.percentage}%)`).join('\n')}

Presupuestos:
${financialData.budgets?.map((b: any) => `- ${b.category}: Presupuesto $${b.budget.toFixed(2)}, Gastado $${b.spent.toFixed(2)}, Restante $${b.remaining.toFixed(2)}`).join('\n') || 'Ninguno'}

Metas:
${financialData.goals?.map((g: any) => `- ${g.name}: $${g.current.toFixed(2)} / $${g.target.toFixed(2)} (${g.progress}%)`).join('\n') || 'Ninguna'}

Proporciona un análisis en formato JSON con: summary, advice (array con category, suggestion, priority, potentialSavings), strengths, areasForImprovement.`;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: advisorSystemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: AI_TEMPERATURE,
      max_completion_tokens: 800,
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

