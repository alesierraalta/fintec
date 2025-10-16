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
  Plus
} from 'lucide-react';

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    kind: 'INCOME' | 'EXPENSE';
    color: string;
    icon: string;
    transactionCount?: number;
    totalAmount?: number;
    parentId?: string;
    subcategories?: any[];
  };
  onEdit?: (category: any) => void;
  onDelete?: (categoryId: string) => void;
  onView?: (categoryId: string) => void;
  onAddSubcategory?: (parentCategoryId: string) => void;
}

// Icon mapping
const iconMap: Record<string, any> = {
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

export function CategoryCard({ category, onEdit, onDelete, onView, onAddSubcategory }: CategoryCardProps) {
  const IconComponent = iconMap[category.icon] || Folder;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:bg-gray-800/50 transition-all group">
      <div className="flex items-start justify-between">
        {/* Category Info */}
        <div className="flex items-center space-x-4 flex-1">
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: category.color }}
          >
            <IconComponent className="h-6 w-6 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">
              {category.name}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span className={`px-2 py-1 rounded-full text-xs ${
                category.kind === 'INCOME' 
                  ? 'bg-green-400/20 text-green-400' 
                  : 'bg-red-400/20 text-red-400'
              }`}>
                {category.kind === 'INCOME' ? 'Ingreso' : 'Gasto'}
              </span>
              {category.parentId && (
                <span className="text-xs text-gray-500">• Subcategoría</span>
              )}
            </div>
            
            {/* Statistics */}
            <div className="mt-2 flex items-center space-x-4 text-sm">
              <div className="text-gray-300">
                <span className="font-medium">{category.transactionCount || 0}</span>
                <span className="text-gray-500 ml-1">transacciones</span>
              </div>
              {category.totalAmount !== undefined && (
                <div className={`font-medium ${
                  category.kind === 'INCOME' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {category.kind === 'INCOME' ? '+' : '-'}${Math.abs(category.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>

            {/* Subcategories */}
            {category.subcategories && category.subcategories.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">
                  {category.subcategories.length} subcategorías
                </p>
                <div className="flex flex-wrap gap-1">
                  {category.subcategories.slice(0, 3).map((sub) => (
                    <span 
                      key={sub.id}
                      className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full"
                    >
                      {sub.name}
                    </span>
                  ))}
                  {category.subcategories.length > 3 && (
                    <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-full">
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
                  className="flex items-center space-x-1 px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white text-xs rounded-full transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>Agregar subcategoría</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onView && (
            <button
              onClick={() => onView(category.id)}
              className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
              title="Ver detalles"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(category)}
              className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
              title="Editar categoría"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(category.id)}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              title="Eliminar categoría"
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
            width: category.totalAmount ? '75%' : '25%'
          }}
        />
      </div>
    </div>
  );
}
