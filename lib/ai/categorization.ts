import { openai, AI_MODEL, AI_TEMPERATURE, AI_MAX_TOKENS } from './config';
import { supabase } from '@/repositories/supabase/client';

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

    const categoriesList = categories
      .map(c => `${c.name} (${c.kind})`)
      .join(', ');

    const transactionExamples = recentTransactions
      ?.slice(0, 5)
      .map(t => `"${t.description}" → ${(t as any).categories?.name || 'Sin categoría'}`)
      .join('\n');

    const prompt = `Eres un asistente financiero experto. Categoriza la siguiente transacción:

Descripción: ${description}
Monto: $${(amount / 100).toFixed(2)}
${merchantInfo ? `Comerciante: ${merchantInfo}` : ''}

Categorías disponibles: ${categoriesList}

Ejemplos de transacciones previas del usuario:
${transactionExamples || 'No hay ejemplos previos'}

Analiza la transacción y sugiere la categoría más apropiada. Responde ÚNICAMENTE en formato JSON:
{
  "categoryName": "nombre de la categoría",
  "confidence": 0.0-1.0,
  "reason": "breve explicación"
}`;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en finanzas personales que categoriza transacciones de manera precisa.',
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
    
    // Find matching category
    const matchedCategory = categories.find(
      c => c.name.toLowerCase() === result.categoryName.toLowerCase()
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

