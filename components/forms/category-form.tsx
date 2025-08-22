'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select, Modal } from '@/components/ui';
import { ColorPicker } from './color-picker';
import { IconPicker } from './icon-picker';
import { CategoryKind } from '@/types';
import { Tag, Folder } from 'lucide-react';
import { useRepository } from '@/providers/repository-provider';

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  category?: any;
  parentCategoryId?: string | null;
  onSave?: () => void;
}

const categoryKinds = [
  { value: 'INCOME', label: 'Ingreso' },
  { value: 'EXPENSE', label: 'Gasto' },
];

export function CategoryForm({ isOpen, onClose, category, parentCategoryId, onSave }: CategoryFormProps) {
  const repository = useRepository();
  const [formData, setFormData] = useState({
    name: category?.name || '',
    kind: category?.kind || 'EXPENSE',
    color: category?.color || '#3b82f6',
    icon: category?.icon || 'Tag',
    parentId: category?.parentId || parentCategoryId || '',
  });
  const [loading, setLoading] = useState(false);
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
        console.error('Error loading parent categories:', error);
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
      kind: category?.kind || 'EXPENSE',
      color: category?.color || '#3b82f6',
      icon: category?.icon || 'Tag',
      parentId: category?.parentId || parentCategoryId || '',
    });
  }, [category, parentCategoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    
    try {
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
        await repository.categories.create({
          name: formData.name.trim(),
          kind: formData.kind as CategoryKind,
          color: formData.color,
          icon: formData.icon,
          parentId: formData.parentId || undefined,
        });
      }
      
      onSave?.();
      onClose();
      
      // Reset form for new category
      if (!category) {
        setFormData({
          name: '',
          kind: 'EXPENSE',
          color: '#3b82f6',
          icon: 'Tag',
          parentId: '',
        });
      }
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setLoading(false);
    }
  };

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