'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select, Modal } from '@/components/ui';
import { ColorPicker } from './color-picker';
import { IconPicker } from './icon-picker';
import { CategoryKind } from '@/types';
import { Tag, Folder } from 'lucide-react';

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  category?: any; // For editing
  parentCategoryId?: string | null; // For creating subcategories
}

const categoryKinds = [
  { value: 'INCOME', label: 'Ingreso' },
  { value: 'EXPENSE', label: 'Gasto' },
];

// Mock data - in a real app this would come from props or API
const mockParentCategories = [
  { value: '', label: 'Sin categoría padre (crear categoría principal)' },
  { value: '4', label: 'Alimentación' },
  { value: '5', label: 'Transporte' },
  { value: '6', label: 'Entretenimiento' },
  { value: '7', label: 'Servicios' },
  { value: '8', label: 'Salud' },
  { value: '1', label: 'Salario' },
  { value: '2', label: 'Freelance' },
  { value: '3', label: 'Inversiones' },
];

export function CategoryForm({ isOpen, onClose, category, parentCategoryId }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    kind: category?.kind || 'EXPENSE',
    color: category?.color || '#3b82f6',
    icon: category?.icon || 'MoreHorizontal',
    parentId: category?.parentId || parentCategoryId || '',
  });

  const [loading, setLoading] = useState(false);

  // Update form data when category or parentCategoryId changes
  useEffect(() => {
    setFormData({
      name: category?.name || '',
      kind: category?.kind || 'EXPENSE',
      color: category?.color || '#3b82f6',
      icon: category?.icon || 'MoreHorizontal',
      parentId: category?.parentId || parentCategoryId || '',
    });
  }, [category, parentCategoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simular guardado
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Category data:', formData);
    setLoading(false);
    onClose();
    
    // Reset form
    if (!category) {
      setFormData({
        name: '',
        kind: 'EXPENSE',
        color: '#3b82f6',
        icon: 'MoreHorizontal',
        parentId: '',
      });
    }
  };

  // Get icon component dynamically
  const getIconComponent = (iconName: string) => {
    // This is a simplified version - in a real app you'd have a proper icon mapping
    return iconName;
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        category 
          ? 'Editar Categoría' 
          : parentCategoryId 
            ? 'Nueva Subcategoría' 
            : 'Nueva Categoría'
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Name */}
        <div>
          <Input
            label={parentCategoryId ? "Nombre de la Subcategoría" : "Nombre de la Categoría"}
            placeholder={
              parentCategoryId 
                ? "Ej: Supermercado, Restaurantes, Gasolina..." 
                : "Ej: Alimentación, Transporte, Salario..."
            }
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            icon={<Tag className="h-4 w-4" />}
            required
          />
        </div>

        {/* Category Kind */}
        <div>
          <Select
            label="Tipo de Categoría"
            value={formData.kind}
            onChange={(e) => setFormData({ ...formData, kind: e.target.value as CategoryKind })}
            options={categoryKinds}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Los ingresos aumentan tu balance, los gastos lo disminuyen
          </p>
        </div>

        {/* Parent Category */}
        <div>
          <Select
            label="Categoría Padre (Opcional)"
            value={formData.parentId}
            onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
            options={mockParentCategories}
          />
          <p className="text-xs text-gray-500 mt-1">
            Crea subcategorías para mejor organización
          </p>
        </div>

        {/* Color Picker */}
        <ColorPicker
          label="Color de la Categoría"
          selectedColor={formData.color}
          onColorChange={(color) => setFormData({ ...formData, color })}
        />

        {/* Icon Picker */}
        <IconPicker
          label="Icono de la Categoría"
          selectedIcon={formData.icon}
          onIconChange={(icon) => setFormData({ ...formData, icon })}
        />

        {/* Preview Card */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-3">Vista previa:</p>
          <div 
            className="inline-flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-all"
            style={{ 
              borderColor: formData.color,
              backgroundColor: `${formData.color}10`
            }}
          >
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: formData.color }}
            >
              <Folder className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">
                {formData.name || 'Nombre de la categoría'}
              </p>
              <p className="text-sm text-gray-400">
                {formData.kind === 'INCOME' ? 'Ingreso' : 'Gasto'}
                {formData.parentId && ' • Subcategoría'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={loading}
            icon={<Tag className="h-4 w-4" />}
          >
            {loading 
              ? (category ? 'Actualizando...' : 'Creando...') 
              : (category ? 'Actualizar Categoría' : 'Crear Categoría')
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
}
