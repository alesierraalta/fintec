'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Button, Input, Select } from '@/components/ui';
import { X, DollarSign } from 'lucide-react';
import type { Budget, Category } from '@/types';
import { CategoryKind } from '@/types';

const budgetSchema = z.object({
  categoryId: z.string().min(1, 'La categoría es requerida'),
  monthYYYYMM: z.string().min(1, 'El mes es requerido'),
  amountBaseMinor: z.number().min(1, 'El monto debe ser mayor a 0'),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

interface BudgetFormProps {
  isOpen: boolean;
  onClose: () => void;
  budget?: Budget | null;
  onSave?: (budget: Partial<Budget>) => void;
}

// Mock categories for the form
const mockCategories: Category[] = [
  { id: '1', name: 'Alimentación', kind: CategoryKind.EXPENSE, color: '#10b981', icon: 'UtensilsCrossed', parentId: undefined, active: true, userId: null, isDefault: true, createdAt: '', updatedAt: '' },
  { id: '2', name: 'Transporte', kind: CategoryKind.EXPENSE, color: '#f59e0b', icon: 'Car', parentId: undefined, active: true, userId: null, isDefault: true, createdAt: '', updatedAt: '' },
  { id: '3', name: 'Entretenimiento', kind: CategoryKind.EXPENSE, color: '#8b5cf6', icon: 'Gamepad2', parentId: undefined, active: true, userId: null, isDefault: true, createdAt: '', updatedAt: '' },
  { id: '4', name: 'Salud', kind: CategoryKind.EXPENSE, color: '#ef4444', icon: 'Heart', parentId: undefined, active: true, userId: null, isDefault: true, createdAt: '', updatedAt: '' },
  { id: '5', name: 'Educación', kind: CategoryKind.EXPENSE, color: '#3b82f6', icon: 'GraduationCap', parentId: undefined, active: true, userId: null, isDefault: true, createdAt: '', updatedAt: '' },
  { id: '6', name: 'Hogar', kind: CategoryKind.EXPENSE, color: '#06b6d4', icon: 'Home', parentId: undefined, active: true, userId: null, isDefault: true, createdAt: '', updatedAt: '' },
];

export function BudgetForm({ isOpen, onClose, budget, onSave }: BudgetFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      categoryId: '',
      monthYYYYMM: '',
      amountBaseMinor: 0,
    },
  });

  // Generate month options (current month and next 11 months)
  const generateMonthOptions = () => {
    const months = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long' 
      });
      
      months.push({
        value: monthKey,
        label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      });
    }
    
    return months;
  };

  const monthOptions = generateMonthOptions();

  useEffect(() => {
    if (budget) {
      setValue('categoryId', budget.categoryId);
      setValue('monthYYYYMM', budget.monthYYYYMM);
      setValue('amountBaseMinor', budget.amountBaseMinor);
    } else {
      // Set default month to current month
      const now = new Date();
      const currentMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      setValue('monthYYYYMM', currentMonth);
    }
  }, [budget, setValue]);

  const onSubmit = async (data: BudgetFormData) => {
    setIsLoading(true);
    
    try {
      const budgetData: Partial<Budget> = {
        ...data,
        id: budget?.id || `budget_${Date.now()}`,
        userId: 'user_1', // Mock user ID
      };

      onSave?.(budgetData);
      
      reset();
      onClose();
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const selectedCategory = mockCategories.find(cat => cat.id === watch('categoryId'));

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <div className="bg-card/60 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md mx-4 border border-white/20">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {budget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Categoría *
            </label>
            <Select
              {...register('categoryId')}
              error={errors.categoryId?.message}
              className="w-full"
              placeholder="Seleccionar categoría"
              options={[
                { value: "", label: "Seleccionar categoría" },
                ...mockCategories.map((category) => ({
                  value: category.id,
                  label: category.name
                }))
              ]}
            />
          </div>

          {/* Month Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mes *
            </label>
            <Select
              {...register('monthYYYYMM')}
              error={errors.monthYYYYMM?.message}
              className="w-full"
              placeholder="Seleccionar mes"
              options={[
                { value: "", label: "Seleccionar mes" },
                ...monthOptions
              ]}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Monto Presupuestado *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register('amountBaseMinor', {
                  valueAsNumber: true,
                  setValueAs: (value) => Math.round(value * 100), // Convert to minor units
                })}
                error={errors.amountBaseMinor?.message}
                className="pl-10"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Ingrese el monto en su moneda base
            </p>
          </div>

          {/* Preview */}
          {selectedCategory && (
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Vista Previa</h4>
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedCategory.color }}
                />
                <div>
                  <p className="text-white font-medium">{selectedCategory.name}</p>
                  <p className="text-sm text-gray-400">
                    {monthOptions.find(m => m.value === watch('monthYYYYMM'))?.label}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Guardando...' : budget ? 'Actualizar' : 'Crear Presupuesto'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
