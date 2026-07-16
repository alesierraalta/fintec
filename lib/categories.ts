import type { Category } from '@/types';

/**
 * Collect a category id plus all of its transitive descendant ids.
 *
 * Single source of truth for hierarchy-aware category scoping: the drilldown
 * panel (whose default view includes subcategories) and the category card
 * transaction count both use this walk, so the count shown on a card always
 * matches the list the drilldown opens with. The visited set guards against
 * cycles in corrupted parentId chains.
 */
export function getDescendantIds(
  id: string,
  cats: Category[],
  visited = new Set<string>()
): string[] {
  if (visited.has(id)) return [];
  visited.add(id);
  const ids = [id];
  for (const c of cats)
    if (c.parentId === id) ids.push(...getDescendantIds(c.id, cats, visited));
  return ids;
}
