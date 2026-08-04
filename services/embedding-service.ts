import { EmbeddingTaskType } from '@/lib/ai/rag/embeddings';

export interface EmbeddingService {
  embedText(text: string, taskType: EmbeddingTaskType): Promise<number[]>;
}

export class ProductionEmbeddingService implements EmbeddingService {
  async embedText(
    text: string,
    taskType: EmbeddingTaskType
  ): Promise<number[]> {
    const { embedText } = await import('@/lib/ai/rag/embeddings');
    return embedText(text, taskType);
  }
}
