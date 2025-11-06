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
/**
 * Indexa un documento en la base de datos RAG
 * Enriquece automáticamente los metadatos con información temporal, de moneda y relaciones
 * 
 * @param doc - Documento a indexar
 */
export async function indexDocument(doc: DocumentToIndex): Promise<void> {
  try {
    const client = createSupabaseServiceClient();
    
    // Generar embedding
    const { embedding } = await generateEmbedding(doc.content);
    
    // Enriquecer metadatos automáticamente
    const enrichedMetadata = enrichMetadata(doc);
    
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
        metadata: enrichedMetadata,
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
 * Enriquece metadatos con información temporal, de moneda y relaciones
 * 
 * @param doc - Documento a indexar
 * @returns Metadatos enriquecidos
 */
function enrichMetadata(doc: DocumentToIndex): Record<string, any> {
  const metadata = { ...(doc.metadata || {}) };
  const today = new Date();
  
  // Agregar información temporal basada en el tipo de documento
  if (doc.documentType === 'transaction' && doc.metadata?.date) {
    const txDate = new Date(doc.metadata.date as string);
    const daysDiff = Math.floor((today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
    
    metadata.is_recent = daysDiff <= 30;
    metadata.is_current_month = txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
    metadata.is_last_month = txDate.getMonth() === today.getMonth() - 1 && txDate.getFullYear() === today.getFullYear();
    metadata.days_ago = daysDiff;
    metadata.month = txDate.getMonth() + 1;
    metadata.year = txDate.getFullYear();
    metadata.date_iso = txDate.toISOString().split('T')[0];
  }
  
  // Agregar información de moneda si está disponible
  if (doc.metadata?.currencyCode || doc.metadata?.currency_code) {
    const currency = doc.metadata.currencyCode || doc.metadata.currency_code;
    metadata.currency = currency;
    metadata.currency_code = currency; // Alias para compatibilidad
  }
  
  // Agregar relaciones (accountId, categoryId, etc.)
  if (doc.metadata?.accountId) {
    metadata.account_id = doc.metadata.accountId;
  }
  if (doc.metadata?.categoryId) {
    metadata.category_id = doc.metadata.categoryId;
  }
  
  // Agregar timestamp de indexación
  metadata.indexed_at = new Date().toISOString();
  
  // Agregar tipo de documento explícito
  metadata.document_type = doc.documentType;
  
  return metadata;
}

/**
 * Genera contenido para indexar una transacción
 */
/**
 * Formatea el contenido de una transacción para indexación RAG
 * Incluye contexto temporal, monetario y de categoría para mejor recuperación
 * 
 * @param tx - Datos de la transacción
 * @returns Contenido formateado para embedding
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
  
  // Determinar contexto temporal
  const txDate = new Date(tx.date);
  const today = new Date();
  const daysDiff = Math.floor((today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
  const isRecent = daysDiff <= 30;
  const isCurrentMonth = txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
  const isLastMonth = txDate.getMonth() === today.getMonth() - 1 && txDate.getFullYear() === today.getFullYear();
  
  let temporalContext = '';
  if (daysDiff === 0) {
    temporalContext = 'This is a transaction from today.';
  } else if (daysDiff === 1) {
    temporalContext = 'This is a transaction from yesterday.';
  } else if (isRecent && isCurrentMonth) {
    temporalContext = `This is a recent transaction from the current month (${txDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}).`;
  } else if (isLastMonth) {
    temporalContext = `This is a transaction from last month (${txDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}).`;
  } else {
    temporalContext = `This is a transaction from ${txDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}.`;
  }
  
  // Tipo de transacción en español/inglés
  const typeLabel = tx.type === 'INCOME' ? 'Income transaction' : tx.type === 'EXPENSE' ? 'Expense transaction' : 'Transaction';
  const typeLabelEs = tx.type === 'INCOME' ? 'Ingreso' : tx.type === 'EXPENSE' ? 'Gasto' : 'Transacción';
  
  // Formato mejorado con más contexto
  return `${typeLabel} (${typeLabelEs}): ${amount} ${tx.currencyCode} on ${txDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}. Category: ${category}${desc ? `. Description: ${desc}` : ''}. ${temporalContext}`;
}

/**
 * Genera contenido para indexar una cuenta
 */
/**
 * Formatea el contenido de una cuenta para indexación RAG
 * Incluye tipo de cuenta descriptivo y contexto de balance
 * 
 * @param account - Datos de la cuenta
 * @returns Contenido formateado para embedding
 */
export function formatAccountContent(account: {
  name: string;
  type: string;
  balance: number;
  currencyCode: string;
}): string {
  const balance = fromMinorUnits(account.balance, account.currencyCode);
  
  // Mapear tipos de cuenta a descripciones más descriptivas
  const typeMap: Record<string, { en: string; es: string }> = {
    'CASH': { en: 'Cash account', es: 'Cuenta de efectivo' },
    'BANK': { en: 'Bank account', es: 'Cuenta bancaria' },
    'CARD': { en: 'Credit/Debit card', es: 'Tarjeta de crédito/débito' },
    'SAVINGS': { en: 'Savings account', es: 'Cuenta de ahorros' },
    'INVESTMENT': { en: 'Investment account', es: 'Cuenta de inversión' },
  };
  
  const typeInfo = typeMap[account.type] || { en: account.type, es: account.type };
  
  // Contexto de balance (positivo, negativo, cero)
  let balanceContext = '';
  if (account.balance > 0) {
    balanceContext = 'The account has a positive balance.';
  } else if (account.balance < 0) {
    balanceContext = 'The account has a negative balance (overdraft).';
  } else {
    balanceContext = 'The account has a zero balance.';
  }
  
  return `Account (Cuenta): ${account.name} - Type: ${typeInfo.en} (${typeInfo.es}). Current balance: ${balance} ${account.currencyCode}. ${balanceContext}`;
}

/**
 * Genera contenido para indexar un presupuesto
 */
/**
 * Formatea el contenido de un presupuesto para indexación RAG
 * Incluye contexto de mes, patrones de gasto y progreso
 * 
 * @param budget - Datos del presupuesto
 * @returns Contenido formateado para embedding
 */
export function formatBudgetContent(budget: {
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  remaining: number;
  monthYear: string;
}): string {
  // Parsear mes/año
  const [month, year] = budget.monthYear.split('/');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthNamesEs = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const monthIndex = parseInt(month, 10) - 1;
  const monthName = monthIndex >= 0 && monthIndex < 12 ? monthNames[monthIndex] : month;
  const monthNameEs = monthIndex >= 0 && monthIndex < 12 ? monthNamesEs[monthIndex] : month;
  
  // Calcular porcentaje usado
  const percentageUsed = budget.budgetAmount > 0 
    ? Math.round((budget.spentAmount / budget.budgetAmount) * 100) 
    : 0;
  
  // Contexto de progreso
  let progressContext = '';
  if (percentageUsed >= 100) {
    progressContext = 'The budget has been exceeded.';
  } else if (percentageUsed >= 80) {
    progressContext = 'The budget is almost exhausted (over 80% used).';
  } else if (percentageUsed >= 50) {
    progressContext = 'The budget is halfway used.';
  } else {
    progressContext = 'The budget is still available (less than 50% used).';
  }
  
  // Determinar si es el mes actual
  const today = new Date();
  const isCurrentMonth = parseInt(month, 10) === today.getMonth() + 1 && parseInt(year, 10) === today.getFullYear();
  const monthContext = isCurrentMonth 
    ? 'This is the budget for the current month.' 
    : `This is the budget for ${monthNameEs} ${year} (${monthName} ${year}).`;
  
  return `Budget (Presupuesto): ${budget.categoryName} - Budget amount: ${budget.budgetAmount}, Spent: ${budget.spentAmount}, Remaining: ${budget.remaining} (${percentageUsed}% used). ${monthContext} ${progressContext}`;
}

/**
 * Genera contenido para indexar una meta
 */
/**
 * Formatea el contenido de una meta para indexación RAG
 * Incluye progreso, tiempo restante y contexto temporal
 * 
 * @param goal - Datos de la meta
 * @returns Contenido formateado para embedding
 */
export function formatGoalContent(goal: {
  name: string;
  current: number;
  target: number;
  progress: number;
  targetDate?: string | null;
}): string {
  const progressPercent = Math.round(goal.progress);
  
  // Contexto de progreso
  let progressContext = '';
  if (progressPercent >= 100) {
    progressContext = 'The goal has been achieved.';
  } else if (progressPercent >= 75) {
    progressContext = 'The goal is almost achieved (over 75% complete).';
  } else if (progressPercent >= 50) {
    progressContext = 'The goal is halfway complete.';
  } else if (progressPercent >= 25) {
    progressContext = 'The goal has made some progress (over 25% complete).';
  } else {
    progressContext = 'The goal is in early stages (less than 25% complete).';
  }
  
  // Contexto de fecha objetivo
  let dateContext = '';
  if (goal.targetDate) {
    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining < 0) {
      dateContext = `The target date (${targetDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}) has passed.`;
    } else if (daysRemaining === 0) {
      dateContext = 'The target date is today.';
    } else if (daysRemaining <= 30) {
      dateContext = `The target date is ${targetDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} (${daysRemaining} days remaining).`;
    } else {
      dateContext = `The target date is ${targetDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
    }
  } else {
    dateContext = 'No specific target date is set.';
  }
  
  return `Goal (Meta): ${goal.name} - Current: ${goal.current}, Target: ${goal.target} (${progressPercent}% complete). ${progressContext} ${dateContext}`;
}

