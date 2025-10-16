'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select, Modal } from '@/components/ui';
import { ColorPicker } from './color-picker';
import { IconPicker } from './icon-picker';
import { CategoryKind } from '@/types';
import { Tag, Folder } from 'lucide-react';
import { useRepository } from '@/providers/repository-provider';
import { useOptimizedData } from '@/hooks/use-optimized-data';

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  category?: any;
  parentCategoryId?: string | null;
  onSave?: (createdCategory?: any) => void;
  defaultKind?: CategoryKind;
}

const categoryKinds = [
  { value: 'INCOME', label: 'Ingreso' },
  { value: 'EXPENSE', label: 'Gasto' },
];

export function CategoryForm({ isOpen, onClose, category, parentCategoryId, onSave, defaultKind }: CategoryFormProps) {
  const repository = useRepository();
  const { invalidateCache, loadCategories } = useOptimizedData();
  const [formData, setFormData] = useState({
    name: category?.name || '',
    kind: category?.kind || defaultKind || 'EXPENSE',
    color: category?.color || '#3b82f6',
    icon: category?.icon || 'Tag',
    parentId: category?.parentId || parentCategoryId || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parentCategories, setParentCategories] = useState<any[]>([]);

  // Load parent categories from database
  useEffect(() => {
    const loadParentCategories = async () => {
      try {
        const categories = await repository.categories.findAll();
        const parentOptions = [
          { value: '', label: 'Sin categoría padre (crear categoría principal)' },
          ...categories
            .filter(cat => !cat.parentId) // Only root categories
            .map(cat => ({ value: cat.id, label: cat.name }))
        ];
        setParentCategories(parentOptions);
      } catch (error) {
        setParentCategories([{ value: '', label: 'Sin categoría padre (crear categoría principal)' }]);
      }
    };

    if (isOpen) {
      loadParentCategories();
    }
  }, [isOpen, repository]);

  // Update form data when category changes
  useEffect(() => {
    setFormData({
      name: category?.name || '',
      kind: category?.kind || defaultKind || 'EXPENSE',
      color: category?.color || '#3b82f6',
      icon: category?.icon || 'Tag',
      parentId: category?.parentId || parentCategoryId || '',
    });
  }, [category, parentCategoryId, defaultKind]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    setError(null);
    
    try {
      let createdCategory = null;
      
      if (category) {
        // Update existing category
        await repository.categories.update(category.id, {
          id: category.id,
          name: formData.name.trim(),
          kind: formData.kind as CategoryKind,
          color: formData.color,
          icon: formData.icon,
          parentId: formData.parentId || undefined,
        });
      } else {
        // Create new category
        createdCategory = await repository.categories.create({
          name: formData.name.trim(),
          kind: formData.kind as CategoryKind,
          color: formData.color,
          icon: formData.icon,
          parentId: formData.parentId || undefined,
        });
      }
      
      // Invalidate cache and refresh data
      invalidateCache('categories');
      await loadCategories(true);
      
      onSave?.(createdCategory);
      onClose();
      
      // Reset form for new category
      if (!category) {
        setFormData({
          name: '',
          kind: defaultKind || 'EXPENSE',
          color: '#3b82f6',
          icon: 'Tag',
          parentId: '',
        });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al crear/actualizar la categoría');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-700">Error: {error}</p>
        <button onClick={() => setError(null)} className="mt-2 text-blue-600">Reintentar</button>
      </div>
    );
  }

  return (
    <Modal open={isOpen} onClose={onClose} title={category ? 'Editar Categoría' : 'Nueva Categoría'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Nombre de la categoría"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Ej: Alimentación, Transporte..."
          required
        />

        <Select
          label="Tipo"
          value={formData.kind}
          onChange={(e) => setFormData(prev => ({ ...prev, kind: e.target.value }))}
          options={categoryKinds}
        />

        <Select
          label="Categoría padre"
          value={formData.parentId}
          onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value }))}
          options={parentCategories}
        />

        <ColorPicker
          label="Color"
          selectedColor={formData.color}
          onColorChange={(color) => setFormData(prev => ({ ...prev, color }))}
        />

        <IconPicker
          label="Icono"
          selectedIcon={formData.icon}
          onIconChange={(icon) => setFormData(prev => ({ ...prev, icon }))}
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || !formData.name.trim()}>
            {loading ? 'Guardando...' : (category ? 'Actualizar' : 'Crear')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
