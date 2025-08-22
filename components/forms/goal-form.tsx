'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Button, Input, Select } from '@/components/ui';
import { X, Target, Calendar, DollarSign } from 'lucide-react';
import type { SavingsGoal } from '@/types';

const goalSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
  targetBaseMinor: z.number().min(1, 'El monto meta debe ser mayor a 0'),
  targetDate: z.string().optional(),
  accountId: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalFormProps {
  isOpen: boolean;
  onClose: () => void;
  goal?: SavingsGoal | null;
  onSave?: (goal: Partial<SavingsGoal>) => void;
}

// Mock accounts for the form
const mockAccounts = [
  { id: '1', name: 'Cuenta de Ahorros', type: 'BANK' },
  { id: '2', name: 'Efectivo', type: 'CASH' },
  { id: '3', name: 'Cuenta Corriente', type: 'BANK' },
  { id: '4', name: 'Inversiones', type: 'INVESTMENT' },
];

export function GoalForm({ isOpen, onClose, goal, onSave }: GoalFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      description: '',
      targetBaseMinor: 0,
      targetDate: '',
      accountId: '',
    },
  });

  useEffect(() => {
    if (goal) {
      setValue('name', goal.name);
      setValue('description', goal.description || '');
      setValue('targetBaseMinor', goal.targetBaseMinor);
      setValue('targetDate', goal.targetDate || '');
      setValue('accountId', goal.accountId || '');
    } else {
      // Set default target date to 1 year from now
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setValue('targetDate', nextYear.toISOString().split('T')[0]);
    }
  }, [goal, setValue]);

  const onSubmit = async (data: GoalFormData) => {
    setIsLoading(true);
    
    try {
      const goalData: Partial<SavingsGoal> = {
        ...data,
        id: goal?.id || `goal_${Date.now()}`,
        currentBaseMinor: goal?.currentBaseMinor || 0,
        active: goal?.active !== undefined ? goal.active : true,
        createdAt: goal?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onSave?.(goalData);
      console.log('Goal saved:', goalData);
      
      reset();
      onClose();
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const selectedAccount = mockAccounts.find(acc => acc.id === watch('accountId'));
  const targetAmount = watch('targetBaseMinor');

  // Calculate estimated monthly savings needed
  const getMonthlyTarget = () => {
    const targetDate = watch('targetDate');
    if (!targetDate || !targetAmount) return 0;
    
    const today = new Date();
    const target = new Date(targetDate);
    const monthsRemaining = Math.max(1, (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    return Math.ceil((targetAmount / 100) / monthsRemaining);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {goal ? 'Editar Meta de Ahorro' : 'Nueva Meta de Ahorro'}
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
          {/* Goal Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre de la Meta *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Target className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                {...register('name')}
                error={errors.name?.message}
                className="pl-10"
                placeholder="Ej: Casa nueva, Vacaciones, Emergencias"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descripción (Opcional)
            </label>
            <textarea
              {...register('description')}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Describe tu meta y por qué es importante para ti..."
            />
            {errors.description && (
              <p className="text-red-400 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Target Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Monto Meta *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register('targetBaseMinor', {
                  valueAsNumber: true,
                  setValueAs: (value) => Math.round(value * 100), // Convert to minor units
                })}
                error={errors.targetBaseMinor?.message}
                className="pl-10"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fecha Meta (Opcional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="date"
                {...register('targetDate')}
                error={errors.targetDate?.message}
                className="pl-10"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Opcional: Establece una fecha límite para tu meta
            </p>
          </div>

          {/* Account Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cuenta Asociada (Opcional)
            </label>
            <Select
              {...register('accountId')}
              error={errors.accountId?.message}
              className="w-full"
              placeholder="Sin cuenta específica"
              options={[
                { value: "", label: "Sin cuenta específica" },
                ...mockAccounts.map((account) => ({
                  value: account.id,
                  label: `${account.name} (${account.type})`
                }))
              ]}
            />
            <p className="text-xs text-gray-500 mt-1">
              Opcional: Vincula tu meta a una cuenta específica
            </p>
          </div>

          {/* Preview */}
          {targetAmount > 0 && (
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Vista Previa</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Meta:</span>
                  <span className="text-white font-medium">{formatCurrency(targetAmount / 100)}</span>
                </div>
                
                {(() => {
                  const targetDate = watch('targetDate');
                  return targetDate && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Fecha límite:</span>
                        <span className="text-white">
                          {new Date(targetDate).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </>
                  );
                })()}
                    
                {watch('targetDate') && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ahorro mensual sugerido:</span>
                    <span className="text-blue-400 font-medium">
                      {formatCurrency(getMonthlyTarget())}
                    </span>
                  </div>
                )}
                
                {selectedAccount && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cuenta:</span>
                    <span className="text-white">{selectedAccount.name}</span>
                  </div>
                )}
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
              {isLoading ? 'Guardando...' : goal ? 'Actualizar Meta' : 'Crear Meta'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
