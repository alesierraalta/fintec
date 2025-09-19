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

  const getCategoryColors = () => {
    if (category.kind === 'INCOME') {
      return {
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        icon: 'text-green-600',
        badge: 'bg-green-500/20 text-green-600',
        badgeHover: 'group-hover:bg-green-500/30 group-hover:text-green-500',
        amount: 'text-green-600 group-hover:text-green-500'
      };
    } else {
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        icon: 'text-red-600',
        badge: 'bg-red-500/20 text-red-600',
        badgeHover: 'group-hover:bg-red-500/30 group-hover:text-red-500',
        amount: 'text-red-600 group-hover:text-red-500'
      };
    }
  };

  const colors = getCategoryColors();

  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border/20 rounded-3xl p-6 hover:bg-card/80 hover:border-border/30 hover:shadow-ios-lg transition-all duration-300 ease-out group cursor-pointer shadow-ios-sm hover:scale-[1.02] hover:-translate-y-1">
      <div className="flex items-start justify-between">
        {/* Category Info */}
        <div className="flex items-center space-x-4 flex-1">
          <div 
            className={`p-3 rounded-2xl border backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-ios-md ${colors.bg} ${colors.border}`}
            style={{ backgroundColor: category.color + '20' }}
          >
            <IconComponent className={`h-6 w-6 transition-all duration-300 group-hover:rotate-6 ${colors.icon}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-ios-title font-semibold text-foreground truncate transition-colors duration-300 group-hover:text-foreground/90 mb-1">
              {category.name}
            </h3>
            
            <div className="flex items-center space-x-2 mb-3">
              <span className={`px-3 py-1.5 rounded-full text-ios-caption font-medium transition-all duration-300 ${colors.badge} ${colors.badgeHover}`}>
                {category.kind === 'INCOME' ? 'Ingreso' : 'Gasto'}
              </span>
              {category.parentId && (
                <span className="text-ios-caption text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-300">• Subcategoría</span>
              )}
            </div>
            
            {/* Statistics */}
            <div className="flex items-center space-x-4 text-ios-caption">
              <div className="text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-300">
                <span className="font-semibold">{category.transactionCount || 0}</span>
                <span className="ml-1">transacciones</span>
              </div>
              {category.totalAmount !== undefined && (
                <div className={`font-semibold transition-all duration-300 ${colors.amount}`}>
                  ${Math.abs(category.totalAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>

            {/* Subcategories */}
            {category.subcategories && category.subcategories.length > 0 && (
              <div className="mt-3">
                <p className="text-ios-caption text-muted-foreground mb-2 group-hover:text-muted-foreground/80 transition-colors duration-300">
                  {category.subcategories.length} subcategorías
                </p>
                <div className="flex flex-wrap gap-1">
                  {category.subcategories.slice(0, 3).map((sub) => (
                    <span 
                      key={sub.id}
                      className="px-2 py-1 bg-muted/20 text-muted-foreground text-ios-caption rounded-full transition-all duration-300 group-hover:bg-muted/30 group-hover:text-foreground/80 backdrop-blur-sm"
                    >
                      {sub.name}
                    </span>
                  ))}
                  {category.subcategories.length > 3 && (
                    <span className="px-2 py-1 bg-muted/20 text-muted-foreground text-ios-caption rounded-full transition-all duration-300 group-hover:bg-muted/30 group-hover:text-foreground/80 backdrop-blur-sm">
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
                  className="flex items-center space-x-1 px-3 py-1.5 bg-muted/20 hover:bg-muted/30 text-muted-foreground hover:text-foreground text-ios-caption rounded-full transition-all duration-300 hover:scale-105 hover:shadow-ios-xs backdrop-blur-sm"
                >
                  <Plus className="h-3 w-3 transition-transform duration-300 hover:rotate-90" />
                  <span>Agregar subcategoría</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform translate-x-2 group-hover:translate-x-0">
          {onView && (
            <button
              onClick={() => onView(category.id)}
              className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-ios-xs backdrop-blur-sm"
              title="Ver detalles"
            >
              <Eye className="h-4 w-4 transition-transform duration-300 hover:scale-110" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(category)}
              className="p-2 text-muted-foreground hover:text-yellow-600 hover:bg-yellow-500/10 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-ios-xs backdrop-blur-sm"
              title="Editar categoría"
            >
              <Edit className="h-4 w-4 transition-transform duration-300 hover:scale-110" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(category.id)}
              className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-ios-xs backdrop-blur-sm"
              title="Eliminar categoría"
            >
              <Trash2 className="h-4 w-4 transition-transform duration-300 hover:scale-110" />
            </button>
          )}
        </div>
      </div>

      {/* Color indicator bar */}
      <div 
        className="mt-4 h-1 rounded-full transition-all duration-300 group-hover:h-1.5 backdrop-blur-sm"
        style={{ backgroundColor: `${category.color}30` }}
      >
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ 
            backgroundColor: category.color,
            width: category.totalAmount ? '75%' : '25%'
          }}
        />
      </div>
    </div>
  );
}