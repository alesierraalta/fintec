import {
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Folder,
  UtensilsCrossed,
  Car,
  Home,
  Zap,
  Gamepad2,
  Heart,
  GraduationCap,
  ShoppingBag,
  MoreHorizontal,
  Banknote,
  Laptop,
  TrendingUp,
  Plus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Category } from '@/types';

export type CategoryCardCategory = Category & {
  transactionCount?: number;
  totalVESMinor?: number;
  totalUSDMinor?: number;
  totalEquivUSDMinor?: number;
  subcategories?: Category[];
};

interface CategoryCardProps {
  category: CategoryCardCategory;
  onEdit?: (category: CategoryCardCategory) => void;
  onDelete?: (categoryId: string) => void;
  onView?: (categoryId: string) => void;
  onAddSubcategory?: (parentCategoryId: string) => void;
  viewMode?: 'grid' | 'list';
}

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Car,
  Home,
  Zap,
  Gamepad2,
  Heart,
  GraduationCap,
  ShoppingBag,
  MoreHorizontal,
  Banknote,
  Laptop,
  TrendingUp,
  Plus,
  Folder,
};

export function CategoryCard({
  category,
  onEdit,
  onDelete,
  onView,
  onAddSubcategory,
  viewMode,
}: CategoryCardProps) {
  const IconComponent = iconMap[category.icon] || Folder;

  if (viewMode === 'list') {
    return (
      <div className="relative flex h-[70px] items-center justify-between rounded-xl border border-border/40 bg-card/90 p-4 backdrop-blur-xl">
        <div className="flex min-w-0 flex-1 items-center space-x-3">
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: category.color }}
          >
            <IconComponent className="h-5 w-5 text-white" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <h3 className="truncate text-base font-semibold text-white">
              {category.name}
            </h3>
            {category.subcategories && category.subcategories.length > 0 && (
              <span className="truncate text-xs text-gray-400">
                {category.subcategories.length} subcategorías
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            {onView && (
              <button
                onClick={() => onView(category.id)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-blue-400/10 hover:text-blue-400"
                aria-label={`View category ${category.name}`}
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(category)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-yellow-400/10 hover:text-yellow-400"
                aria-label={`Edit category ${category.name}`}
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(category.id)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-400/10 hover:text-red-400"
                aria-label={`Delete category ${category.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {!category.parentId && onAddSubcategory && (
              <button
                onClick={() => onAddSubcategory(category.id)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-white"
                aria-label={`Add subcategory to ${category.name}`}
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-xl border border-gray-800 bg-gray-900 p-6 transition-all hover:bg-gray-800/50">
      {' '}
      <div className="flex items-start justify-between">
        {/* Category Info */}
        <div className="flex flex-1 items-center space-x-4">
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: category.color }}
          >
            <IconComponent className="h-6 w-6 text-white" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold text-white">
              {category.name}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  category.kind === 'INCOME'
                    ? 'bg-green-400/20 text-green-400'
                    : 'bg-red-400/20 text-red-400'
                }`}
              >
                {category.kind === 'INCOME' ? 'Ingreso' : 'Gasto'}
              </span>
              {category.parentId && (
                <span className="text-xs text-gray-500">• Subcategoría</span>
              )}
            </div>

            {/* Statistics */}
            <div className="mt-2 flex items-center space-x-4 text-sm">
              <div className="text-gray-300">
                <span className="font-medium">
                  {category.transactionCount || 0}
                </span>
                <span className="ml-1 text-gray-500">transacciones</span>
              </div>
            </div>

            {/* Subcategories */}
            {category.subcategories && category.subcategories.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-gray-500">
                  {category.subcategories.length} subcategorías
                </p>
                <div className="flex flex-wrap gap-1">
                  {category.subcategories.slice(0, 3).map((sub) => (
                    <span
                      key={sub.id}
                      className="rounded-full bg-gray-700 px-2 py-1 text-xs text-gray-300"
                    >
                      {sub.name}
                    </span>
                  ))}
                  {category.subcategories.length > 3 && (
                    <span className="rounded-full bg-gray-700 px-2 py-1 text-xs text-gray-400">
                      +{category.subcategories.length - 3} más
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Add subcategory button for parent categories */}
            {!category.parentId && onAddSubcategory && (
              <div className="mt-3">
                <button
                  onClick={() => onAddSubcategory(category.id)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center space-x-1 rounded-full bg-gray-700/50 px-2 py-1 text-xs text-gray-300 transition-colors hover:bg-gray-600/50 hover:text-white"
                  aria-label={`Add subcategory to ${category.name}`}
                >
                  <Plus className="h-3 w-3" />
                  <span>Agregar subcategoría</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 transition-opacity">
          {onView && (
            <button
              onClick={() => onView(category.id)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-blue-400/10 hover:text-blue-400"
              aria-label={`View category ${category.name}`}
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(category)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-yellow-400/10 hover:text-yellow-400"
              aria-label={`Edit category ${category.name}`}
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(category.id)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-400/10 hover:text-red-400"
              aria-label={`Delete category ${category.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {/* Color indicator bar */}
      <div
        className="mt-4 h-1 rounded-full"
        style={{ backgroundColor: `${category.color}40` }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            backgroundColor: category.color,
            width: category.transactionCount ? '75%' : '25%',
          }}
        />
      </div>
    </div>
  );
}
