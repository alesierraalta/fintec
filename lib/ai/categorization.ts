import { openai, AI_MODEL, AI_TEMPERATURE, AI_MAX_COMPLETION_TOKENS } from './config';
import { supabase } from '@/repositories/supabase/client';

const categorizationSystemPrompt = `Eres un sistema de categorización automática de transacciones. Analiza la descripción y sugiere la categoría más apropiada en formato JSON.`;

interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reason: string;
}

/**
 * Auto-categorizes a transaction using AI
 */
export async function categorizeTransaction(
  userId: string,
  description: string,
  amount: number,
  merchantInfo?: string
): Promise<CategorySuggestion | null> {
  try {
    // Get user's existing categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, kind')
      .eq('active', true);

    if (!categories || categories.length === 0) {
      return null;
    }

    // Get recent transactions for pattern learning
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select('description, category_id, categories(name)')
      .eq('account_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const categoriesList = (categories as any[])
      .map((c: any) => `${c.name} (${c.kind})`)
      .join(', ');

    const transactionExamples = (recentTransactions as any[])
      ?.slice(0, 5)
      .map((t: any) => `"${t?.description || ''}" → ${t?.categories?.name || 'Sin categoría'}`)
      .join('\n');

    // Crear prompt simple
    const prompt = `Categoriza la siguiente transacción:

Descripción: "${description}"
Monto: $${amount.toFixed(2)}
${merchantInfo ? `Información del comercio: ${merchantInfo}` : ''}

Categorías disponibles:
${categoriesList}

Ejemplos de transacciones recientes:
${transactionExamples || 'Ninguno'}

Sugiere la categoría más apropiada en formato JSON con: categoryName, confidence, reason.`;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: categorizationSystemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: AI_TEMPERATURE,
      max_completion_tokens: AI_MAX_COMPLETION_TOKENS,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Find matching category
    const matchedCategory = (categories as any[]).find(
      (c: any) => c.name?.toLowerCase() === (result.categoryName || '').toLowerCase()
    );

    if (!matchedCategory) {
      return null;
    }

    return {
      categoryId: matchedCategory.id,
      categoryName: matchedCategory.name,
      confidence: result.confidence || 0.7,
      reason: result.reason || 'Basado en descripción de la transacción',
    };
  } catch (error) {
    return null;
  }
}

/**
 * Batch categorize multiple transactions
 */
export async function batchCategorizeTransactions(
  userId: string,
  transactions: Array<{ id: string; description: string; amount: number }>
): Promise<Map<string, CategorySuggestion>> {
  const results = new Map<string, CategorySuggestion>();

  // Process in batches of 5 to avoid rate limits
  for (let i = 0; i < transactions.length; i += 5) {
    const batch = transactions.slice(i, i + 5);
    
    const promises = batch.map(async (txn) => {
      const suggestion = await categorizeTransaction(
        userId,
        txn.description,
        txn.amount
      );
      
      if (suggestion) {
        results.set(txn.id, suggestion);
      }
    });

    await Promise.all(promises);
    
    // Small delay to respect rate limits
    if (i + 5 < transactions.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

