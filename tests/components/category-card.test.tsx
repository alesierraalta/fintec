import { render } from '@testing-library/react';
import { CategoryCard } from '@/components/categories/category-card';
import type { CategoryCardCategory } from '@/components/categories/category-card';
import { CategoryKind } from '@/types';

const baseCategory: CategoryCardCategory = {
  id: 'cat-1',
  name: 'Comida',
  kind: CategoryKind.EXPENSE,
  color: '#ef4444',
  icon: 'UtensilsCrossed',
  active: true,
  userId: null,
  isDefault: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  transactionCount: 3,
  subcategories: [
    {
      id: 'cat-2',
      name: 'Delivery',
      kind: CategoryKind.EXPENSE,
      color: '#ef4444',
      icon: 'UtensilsCrossed',
      parentId: 'cat-1',
      active: true,
      userId: null,
      isDefault: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

// The design system is theme-aware through semantic tokens (bg-card,
// border-border, text-foreground, bg-muted). Hardcoded gray-* palette
// classes render as dark surfaces in light mode, which is the regression
// this suite guards against.
const GRAY_CLASS = /(?:^|\s)(?:bg|border|text|hover:bg|hover:text)-gray-\d/;

function grayClassedElements(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll<HTMLElement>('*'))
    .map((el) => el.className)
    .filter(
      (cls): cls is string => typeof cls === 'string' && GRAY_CLASS.test(cls)
    );
}

describe('CategoryCard theme tokens', () => {
  it('grid view uses semantic card tokens instead of hardcoded grays', () => {
    const { container } = render(
      <CategoryCard
        category={baseCategory}
        viewMode="grid"
        onView={() => {}}
        onEdit={() => {}}
        onAddSubcategory={() => {}}
      />
    );

    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain('bg-card');
    expect(card.className).toContain('border-border');
    expect(grayClassedElements(container)).toEqual([]);
  });

  it('list view uses semantic tokens instead of hardcoded grays', () => {
    const { container } = render(
      <CategoryCard
        category={baseCategory}
        viewMode="list"
        onView={() => {}}
        onAddSubcategory={() => {}}
      />
    );

    expect(grayClassedElements(container)).toEqual([]);
  });
});
