import { openai, AI_MODEL, AI_TEMPERATURE, AI_MAX_TOKENS } from './config';
import { supabase } from '@/repositories/supabase/client';

interface Anomaly {
  transactionId: string;
  description: string;
  amount: number;
  date: string;
  type: 'unusual_amount' | 'unusual_merchant' | 'unusual_category' | 'unusual_frequency';
  severity: 'high' | 'medium' | 'low';
  explanation: string;
  recommendation: string;
}

/**
 * Detects unusual transactions using AI
 */
export async function detectAnomalies(userId: string): Promise<Anomaly[]> {
  try {
    // Get last 30 days of transactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select(`
        id,
        description,
        amount_base_minor,
        date,
        type,
        categories(name)
      `)
      .gte('date', thirtyDaysAgo.toISOString())
      .order('date', { ascending: false })
      .limit(50);

    // Get historical average for comparison
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: historicalTransactions } = await supabase
      .from('transactions')
      .select(`
        amount_base_minor,
        type,
        categories(name)
      `)
      .gte('date', ninetyDaysAgo.toISOString())
      .lt('date', thirtyDaysAgo.toISOString());

    if (!recentTransactions || recentTransactions.length === 0) {
      return [];
    }

    // Calculate historical averages by category
    const historicalAverages: Record<string, number[]> = {};
    historicalTransactions?.forEach((txn: any) => {
      const category = txn.categories?.name || 'Sin categoría';
      if (!historicalAverages[category]) {
        historicalAverages[category] = [];
      }
      historicalAverages[category].push(txn.amount_base_minor);
    });

    const averagesByCategory = Object.entries(historicalAverages).reduce((acc, [cat, amounts]) => {
      const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const max = Math.max(...amounts);
      acc[cat] = { average: avg, max };
      return acc;
    }, {} as Record<string, { average: number; max: number }>);

    // Format data for AI
    const recentData = recentTransactions.map((txn: any) => ({
      id: txn.id,
      description: txn.description,
      amount: txn.amount_base_minor / 100,
      date: txn.date,
      category: txn.categories?.name || 'Sin categoría',
      type: txn.type
    }));

    const historicalStats = Object.entries(averagesByCategory).map(([cat, stats]) => ({
      category: cat,
      averageAmount: stats.average / 100,
      maxAmount: stats.max / 100
    }));

    const prompt = `Eres un detector de fraudes y anomalías financieras. Analiza estas transacciones recientes y detecta cualquier actividad inusual:

Transacciones recientes (últimos 30 días):
${JSON.stringify(recentData, null, 2)}

Estadísticas históricas:
${JSON.stringify(historicalStats, null, 2)}

Identifica transacciones anómalas (montos inusuales, patrones extraños, etc.). Responde ÚNICAMENTE en formato JSON:
{
  "anomalies": [
    {
      "transactionId": "id",
      "type": "unusual_amount" | "unusual_merchant" | "unusual_category" | "unusual_frequency",
      "severity": "high" | "medium" | "low",
      "explanation": "por qué es inusual",
      "recommendation": "qué hacer al respecto"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en detección de anomalías financieras y prevención de fraudes.',
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
    
    // Map back to full transaction data
    const anomalies: Anomaly[] = (result.anomalies || []).map((anomaly: any) => {
      const txn = recentTransactions.find((t: any) => t.id === anomaly.transactionId);
      return {
        transactionId: anomaly.transactionId,
        description: txn?.description || '',
        amount: (txn?.amount_base_minor || 0) / 100,
        date: txn?.date || '',
        type: anomaly.type,
        severity: anomaly.severity,
        explanation: anomaly.explanation,
        recommendation: anomaly.recommendation,
      };
    });

    return anomalies;
  } catch (error) {
    return [];
  }
}

/**
 * Checks if a single transaction is anomalous
 */
export async function checkTransactionAnomaly(
  userId: string,
  description: string,
  amount: number,
  category: string
): Promise<{ isAnomalous: boolean; explanation?: string } | null> {
  try {
    // Quick check: get similar transactions
    const { data: similar } = await supabase
      .from('transactions')
      .select('amount_base_minor')
      .ilike('description', `%${description.split(' ')[0]}%`)
      .limit(10);

    if (!similar || similar.length === 0) {
      return { isAnomalous: false };
    }

    const amounts = similar.map(t => t.amount_base_minor);
    const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / amounts.length
    );

    // Simple statistical check: more than 2 standard deviations away
    if (Math.abs(amount - avg) > 2 * stdDev) {
      return {
        isAnomalous: true,
        explanation: `Este monto es significativamente diferente al promedio de $${(avg / 100).toFixed(2)} para transacciones similares.`,
      };
    }

    return { isAnomalous: false };
  } catch (error) {
    return null;
  }
}

