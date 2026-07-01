'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Button, Input, Select } from '@/components/ui';
import { X, Target, Calendar, DollarSign } from 'lucide-react';
import type { Account, SavingsGoal } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useCurrencyConverter } from '@/hooks/use-currency-converter';

const currencies = [
  { value: 'USD', label: 'USD - Dólar Americano' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'VES', label: 'VES - Bolívar Venezolano' },
  { value: 'GBP', label: 'GBP - Libra Esterlina' },
  { value: 'JPY', label: 'JPY - Yen Japonés' },
  { value: 'CAD', label: 'CAD - Dólar Canadiense' },
  { value: 'AUD', label: 'AUD - Dólar Australiano' },
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
  { value: 'BRL', label: 'BRL - Real Brasileño' },
  { value: 'BTC', label: 'BTC - Bitcoin' },
  { value: 'ETH', label: 'ETH - Ethereum' },
];

const goalSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'Máximo 100 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
  targetAmount: z.number().min(0.01, 'El monto meta debe ser mayor a 0'),
  currencyCode: z.string(),
  targetDate: z.string().optional(),
  accountId: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalFormProps {
  isOpen: boolean;
  onClose: () => void;
  goal?: SavingsGoal | null;
  accounts: Pick<Account, 'id' | 'name' | 'type'>[];
  onSave?: (goal: Partial<SavingsGoal>) => Promise<void> | void;
}

export function GoalForm({
  isOpen,
  onClose,
  goal,
  accounts,
  onSave,
}: GoalFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { baseCurrency } = useAuth();
  const { getRate } = useCurrencyConverter();

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
      targetAmount: 0,
      currencyCode: baseCurrency,
      targetDate: '',
      accountId: '',
    },
  });

  useEffect(() => {
    if (goal) {
      setValue('name', goal.name);
      setValue('description', goal.description || '');
      setValue('targetAmount', goal.targetBaseMinor / 100);
      setValue('currencyCode', baseCurrency);
      setValue('targetDate', goal.targetDate || '');
      // Only pre-select the linked account if it's still in the accounts list;
      // otherwise fall back to '' ("Sin cuenta específica") to avoid a dangling selection.
      const stillExists =
        goal.accountId &&
        accounts.some((account) => account.id === goal.accountId);
      setValue('accountId', stillExists ? goal.accountId! : '');
    } else {
      // Set default target date to 1 year from now
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setValue('targetDate', nextYear.toISOString().split('T')[0]);
      setValue('currencyCode', baseCurrency);
    }
  }, [goal, accounts, setValue, baseCurrency]);

  const onSubmit = async (data: GoalFormData) => {
    setIsLoading(true);

    try {
      // Calculate targetBaseMinor using exchange rate
      const rate = getRate(data.currencyCode, baseCurrency);
      const targetBaseMinor = Math.round(data.targetAmount * rate * 100);

      const goalData: Partial<SavingsGoal> = {
        name: data.name,
        description: data.description,
        targetBaseMinor,
        targetDate: data.targetDate,
        accountId: data.accountId,
        id: goal?.id || `goal_${Date.now()}`,
        currentBaseMinor: goal?.currentBaseMinor || 0,
        active: goal?.active !== undefined ? goal.active : true,
        createdAt: goal?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Await the persistence callback so the form stays open until it resolves
      // and re-throws rejections so the page can surface the real error.
      await onSave?.(goalData);

      reset();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const selectedAccount = accounts.find((acc) => acc.id === watch('accountId'));
  const targetAmount = watch('targetAmount') || 0;
  const currencyCode = watch('currencyCode') || baseCurrency;

  // Calculate estimated monthly savings needed in the selected currency
  const getMonthlyTarget = () => {
    const targetDate = watch('targetDate');
    if (!targetDate || !targetAmount) return 0;

    const today = new Date();
    const target = new Date(targetDate);
    const monthsRemaining = Math.max(
      1,
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    return Math.ceil(targetAmount / monthsRemaining);
  };

  const formatCurrencyLocal = (amount: number, curr: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={goal ? 'Editar Meta de Ahorro' : 'Nueva Meta de Ahorro'}
      size="md"
    >
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e).catch(() => undefined)}
        className="space-y-4"
      >
        {/* Goal Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Nombre de la Meta *
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
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
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Descripción (Opcional)
          </label>
          <textarea
            {...register('description')}
            className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Describe tu meta y por qué es importante para ti..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-400">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Target Amount */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Monto Meta *
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register('targetAmount', { valueAsNumber: true })}
                error={errors.targetAmount?.message}
                className="pl-10"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="currencyCode"
              className="mb-2 block text-sm font-medium text-gray-300"
            >
              Moneda
            </label>
            <Select
              id="currencyCode"
              {...register('currencyCode')}
              options={currencies}
            />
          </div>
        </div>

        {/* Target Date */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Fecha Meta (Opcional)
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
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
          <p className="mt-1 text-xs text-gray-500">
            Opcional: Establece una fecha límite para tu meta
          </p>
        </div>

        {/* Account Selection */}
        <div>
          <label
            htmlFor="accountId"
            className="mb-2 block text-sm font-medium text-gray-300"
          >
            Cuenta Asociada (Opcional)
          </label>
          <Select
            id="accountId"
            {...register('accountId')}
            error={errors.accountId?.message}
            className="w-full"
            placeholder="Sin cuenta específica"
            options={
              accounts.length === 0
                ? [
                    {
                      value: '',
                      label: 'Sin cuentas disponibles',
                      disabled: true,
                    },
                  ]
                : [
                    { value: '', label: 'Sin cuenta específica' },
                    ...accounts.map((account) => ({
                      value: account.id,
                      label: `${account.name} (${account.type})`,
                    })),
                  ]
            }
          />
          <p className="mt-1 text-xs text-gray-500">
            Opcional: Vincula tu meta a una cuenta específica
          </p>
        </div>

        {/* Preview */}
        {targetAmount > 0 && (
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <h4 className="mb-3 text-sm font-medium text-gray-300">
              Vista Previa
            </h4>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Meta:</span>
                <span className="font-medium text-white">
                  {formatCurrencyLocal(targetAmount, currencyCode)}
                </span>
              </div>

              {(() => {
                const targetDate = watch('targetDate');
                return (
                  targetDate && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Fecha límite:</span>
                        <span className="text-white">
                          {new Date(targetDate).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </>
                  )
                );
              })()}

              {watch('targetDate') && (
                <div className="flex justify-between">
                  <span className="text-gray-400">
                    Ahorro mensual sugerido:
                  </span>
                  <span className="font-medium text-blue-400">
                    {formatCurrencyLocal(getMonthlyTarget(), currencyCode)}
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
        <div className="flex justify-end space-x-3 border-t border-border/50 pt-4">
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
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading
              ? 'Guardando...'
              : goal
                ? 'Actualizar Meta'
                : 'Crear Meta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
