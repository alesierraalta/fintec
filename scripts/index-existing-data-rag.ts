/**
 * Script para indexar datos existentes en RAG
 * Ejecutar una vez después de implementar RAG
 * 
 * Uso: tsx scripts/index-existing-data-rag.ts
 */

import { createSupabaseServiceClient } from '@/repositories/supabase/client';
import { indexDocument, formatTransactionContent, formatAccountContent } from '@/lib/ai/rag/indexer';
import { logger } from '@/lib/utils/logger';

async function indexExistingData() {
  const client = createSupabaseServiceClient();
  
  logger.info('Starting RAG indexation for existing data...');
  
  // Indexar todas las cuentas activas
  logger.info('Indexing accounts...');
  const { data: accounts, error: accountsError } = await client
    .from('accounts')
    .select('id, user_id, name, type, balance, currency_code')
    .eq('active', true);
  
  if (accountsError) {
    logger.error('Error fetching accounts:', accountsError);
  } else {
    logger.info(`Found ${accounts?.length || 0} active accounts to index`);
    
    for (const account of accounts || []) {
      try {
        const acc = account as any;
        const content = formatAccountContent({
          name: acc.name,
          type: acc.type,
          balance: acc.balance,
          currencyCode: acc.currency_code,
        });
        
        await indexDocument({
          userId: acc.user_id,
          documentType: 'account',
          documentId: acc.id,
          content,
        });
      } catch (error) {
        logger.error(`Failed to index account ${(account as any).id}:`, error);
      }
    }
    
    logger.info(`Indexed ${accounts?.length || 0} accounts`);
  }
  
  // Indexar transacciones de últimos 90 días
  logger.info('Indexing transactions...');
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const { data: transactions, error: transactionsError } = await client
    .from('transactions')
    .select('id, account_id, category_id, type, amount_base_minor, currency_code, date, description, accounts!inner(user_id), categories(name)')
    .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
    .limit(1000); // Batch processing
  
  if (transactionsError) {
    logger.error('Error fetching transactions:', transactionsError);
  } else {
    logger.info(`Found ${transactions?.length || 0} transactions to index`);
    
    for (const tx of transactions || []) {
      try {
        const txData = tx as any;
        if (txData.accounts?.user_id) {
          const content = formatTransactionContent({
            description: txData.description,
            amountBaseMinor: txData.amount_base_minor,
            currencyCode: txData.currency_code,
            date: txData.date,
            categoryName: txData.categories?.name || null,
            type: txData.type,
          });
          
          await indexDocument({
            userId: txData.accounts.user_id,
            documentType: 'transaction',
            documentId: txData.id,
            content,
            metadata: {
              accountId: txData.account_id,
              categoryId: txData.category_id,
              date: txData.date,
            },
          });
        }
      } catch (error) {
        logger.error(`Failed to index transaction ${(tx as any).id}:`, error);
      }
    }
    
    logger.info(`Indexed ${transactions?.length || 0} transactions`);
  }
  
  logger.info('Indexación inicial completada');
}

indexExistingData().catch((error) => {
  logger.error('Fatal error in indexation script:', error);
  process.exit(1);
});

