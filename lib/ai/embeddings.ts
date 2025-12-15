import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { supabase } from '@/repositories/supabase/client';
import { AI_CONFIG } from './config';
// import { Database } from '@/repositories/supabase/types'; // Not using directly here, but implies knowledge

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding(AI_CONFIG.embeddingModel),
    value: text,
  });
  return embedding;
}

export interface SemanticSearchResult {
  id: string;
  description: string;
  amount_base_minor: number;
  date: string;
  similarity: number;
}

export async function searchTransactions(
  userId: string,
  query: string,
  threshold = 0.5, // Slightly lower default to capture more potential matches
  count = 10
): Promise<SemanticSearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await (supabase as any).rpc('match_transactions', { // Cast to any for rpc
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: count,
    filter_user_id: userId,
  });

  if (error) {
    console.error('Error searching transactions:', error);
    return [];
  }

  return data as SemanticSearchResult[];
}
