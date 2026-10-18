import type { CapturedTransaction, CapturedType } from './normalize';

export interface HistoryCategoryHint {
  description: string;
  category: string;
}

export interface Neighbor extends HistoryCategoryHint {
  score: number;
}

export type Embedder = (
  text: string,
  task: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'
) => Promise<number[]>;

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function trigrams(text: string): Set<string> {
  const padded = `  ${fold(text)} `;
  const grams = new Set<string>();
  for (let i = 0; i + 3 <= padded.length; i++)
    grams.add(padded.slice(i, i + 3));
  return grams;
}

/** Dice coefficient over character trigrams of accent/case-folded text. */
export function trigramSimilarity(a: string, b: string): number {
  if (!fold(a) || !fold(b)) return 0;
  const ga = trigrams(a);
  const gb = trigrams(b);
  let shared = 0;
  for (const gram of ga) if (gb.has(gram)) shared++;
  return (2 * shared) / (ga.size + gb.size);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

const topK = (scored: Neighbor[], k: number) =>
  scored.sort((x, y) => y.score - x.score).slice(0, k);

export function lexicalNeighbors(
  query: string,
  history: HistoryCategoryHint[],
  k: number
): Neighbor[] {
  return topK(
    history.map((h) => ({
      ...h,
      score: trigramSimilarity(query, h.description),
    })),
    k
  );
}

/** Embeds history descriptions once per cache and ranks them by cosine. */
export async function embeddingNeighbors(
  query: string,
  history: HistoryCategoryHint[],
  k: number,
  embed: Embedder,
  documentCache: Map<string, number[]>
): Promise<Neighbor[]> {
  for (const h of history) {
    if (!documentCache.has(h.description)) {
      documentCache.set(
        h.description,
        await embed(h.description, 'RETRIEVAL_DOCUMENT')
      );
    }
  }
  const q = await embed(query, 'RETRIEVAL_QUERY');
  return topK(
    history.map((h) => ({
      ...h,
      score: cosineSimilarity(q, documentCache.get(h.description)!),
    })),
    k
  );
}

/**
 * Replaces a movement's category with its nearest history neighbour's when the
 * similarity clears the threshold and that category exists for the movement's
 * type; otherwise the model's choice stands.
 */
export function recategorize(
  movements: CapturedTransaction[],
  neighbors: Neighbor[][],
  categories: { id: string; name: string; kind: CapturedType }[],
  threshold: number
): CapturedTransaction[] {
  return movements.map((movement, i) => {
    const best = neighbors[i]?.[0];
    if (!best || best.score < threshold) return movement;
    const category = categories.find(
      (c) => c.name === best.category && c.kind === movement.type
    );
    return category ? { ...movement, categoryId: category.id } : movement;
  });
}
