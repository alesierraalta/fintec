/**
 * Indexer - Indexa documentos financieros en RAG
 * 
 * Patrón: Service Layer + Repository Pattern
 * Principio SOLID: Single Responsibility (S), Dependency Inversion (D)
 * 
 * MCP usado: serena find_symbol para entender estructura de repositorios
 */

import { createSupabaseServiceClient } from '@/repositories/supabase/client';
import { generateEmbedding } from './embedder';
import { fromMinorUnits } from '@/lib/money';
import { logger } from '@/lib/utils/logger';

export type DocumentType = 'transaction' | 'account' | 'budget' | 'goal';

interface DocumentToIndex {
  userId: string;
  documentType: DocumentType;
  documentId: string;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Indexa un documento en RAG
 */
export async function indexDocument(doc: DocumentToIndex): Promise<void> {
  try {
    const client = createSupabaseServiceClient();
    
    // Generar embedding
    const { embedding } = await generateEmbedding(doc.content);
    
    // Insertar o actualizar en rag_documents
    // pgvector acepta el array directamente como string en formato PostgreSQL
    // Formato: '[0.1,0.2,0.3]'::vector
    const embeddingStr = `[${embedding.join(',')}]`;
    
    // La tabla rag_documents no está en los tipos de Supabase, usar any temporalmente
    const { error } = await (client
      .from('rag_documents') as any)
      .upsert({
        user_id: doc.userId,
        document_type: doc.documentType,
        document_id: doc.documentId,
        content: doc.content,
        embedding: embeddingStr,
        metadata: doc.metadata || {},
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,document_type,document_id',
      });

    if (error) {
      throw new Error(`Failed to index document: ${error.message}`);
    }

    logger.debug(`[indexDocument] Indexed ${doc.documentType} ${doc.documentId} for user ${doc.userId}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[indexDocument] Error indexing document:`, error);
    throw new Error(`Failed to index document: ${errorMessage}`);
  }
}

/**
 * Genera contenido para indexar una transacción
 */
export function formatTransactionContent(tx: {
  description?: string | null;
  amountBaseMinor: number;
  currencyCode: string;
  date: string;
  categoryName?: string | null;
  type: string;
}): string {
  const amount = fromMinorUnits(tx.amountBaseMinor, tx.currencyCode);
  const category = tx.categoryName || 'Sin categoría';
  const desc = tx.description ? ` - ${tx.description}` : '';
  
  return `Transaction: ${tx.type}${desc} - ${amount} ${tx.currencyCode} on ${tx.date} in category ${category}`;
}

/**
 * Genera contenido para indexar una cuenta
 */
export function formatAccountContent(account: {
  name: string;
  type: string;
  balance: number;
  currencyCode: string;
}): string {
  const balance = fromMinorUnits(account.balance, account.currencyCode);
  return `Account: ${account.name} (${account.type}) - Balance: ${balance} ${account.currencyCode}`;
}

/**
 * Genera contenido para indexar un presupuesto
 */
export function formatBudgetContent(budget: {
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  remaining: number;
  monthYear: string;
}): string {
  return `Budget: ${budget.categoryName} - ${budget.budgetAmount} budget, ${budget.spentAmount} spent, ${budget.remaining} remaining for ${budget.monthYear}`;
}

/**
 * Genera contenido para indexar una meta
 */
export function formatGoalContent(goal: {
  name: string;
  current: number;
  target: number;
  progress: number;
  targetDate?: string | null;
}): string {
  const dateStr = goal.targetDate ? ` target date ${goal.targetDate}` : '';
  return `Goal: ${goal.name} - ${goal.current}/${goal.target} (${goal.progress}%)${dateStr}`;
}

