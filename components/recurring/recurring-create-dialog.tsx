'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useRepository } from '@/providers';
import { logger } from '@/lib/utils/logger';
import {
  CreateRecurringTransactionDTO,
  RecurringFrequency,
} from '@/types/recurring-transactions';
import { TransactionType } from '@/types/domain';

export interface CreateRecurringPayload {
  data: CreateRecurringTransactionDTO;
  /** Explicit user choice: register the first operation immediately after
   * the rule is persisted. The route never registers without this flag. */
  registerFirstOperation: boolean;
}

interface RecurringCreateDialogProps {
  open: boolean;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateRecurringPayload) => void;
}

interface FormErrors {
  name?: string;
  amount?: string;
  accountId?: string;
  startDate?: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
];

const TYPE_OPTIONS = [
  { value: 'EXPENSE', label: 'Gasto' },
  { value: 'INCOME', label: 'Ingreso' },
];

function parseMajorToMinor(amountMajor: string): number {
  const parsed = Number.parseFloat(amountMajor.replace(',', '.'));
  if (!Number.isFinite(parsed)) {
    return NaN;
  }

  return Math.round(parsed * 100);
}

export function RecurringCreateDialog({
  open,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: RecurringCreateDialogProps) {
  const { user } = useAuth();
  const repository = useRepository();
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amountMajor, setAmountMajor] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<
    Array<{ id: string; name: string; currencyCode: string }>
  >([]);
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState('');
  const [registerFirstOperation, setRegisterFirstOperation] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Load the user's active accounts when the dialog opens so the new rule
  // always carries a real accountId + currencyCode (route requirement).
  useEffect(() => {
    if (!open) {
      return;
    }

    let mounted = true;

    if (!user) {
      setAccounts([]);
      return () => {
        mounted = false;
      };
    }

    repository.accounts
      .findByUserId(user.id)
      .then((userAccounts) => {
        if (mounted) {
          setAccounts(
            userAccounts
              .filter((account) => account.active)
              .map((account) => ({
                id: account.id,
                name: account.name,
                currencyCode: account.currencyCode,
              }))
          );
        }
      })
      .catch((error) => {
        logger.error('Error loading accounts for recurring rule:', error);
        if (mounted) {
          setAccounts([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [open, user, repository]);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (!open) {
      return;
    }

    setName('');
    setType(TransactionType.EXPENSE);
    setAmountMajor('');
    setAccountId('');
    setFrequency('monthly');
    setStartDate(new Date().toISOString().split('T')[0]);
    setRegisterFirstOperation(false);
    setErrors({});
  }, [open]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId),
    [accounts, accountId]
  );

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        value: account.id,
        label: `${account.name} (${account.currencyCode})`,
      })),
    [accounts]
  );

  const validate = useCallback((): boolean => {
    const nextErrors: FormErrors = {};
    const amountMinor = parseMajorToMinor(amountMajor);

    if (!name.trim()) {
      nextErrors.name = 'El nombre es requerido';
    }

    if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
      nextErrors.amount = 'El monto debe ser mayor a 0';
    }

    if (!accountId) {
      nextErrors.accountId = 'Selecciona una cuenta';
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      nextErrors.startDate = 'La fecha de inicio es invalida';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [accountId, amountMajor, name, startDate]);

  const handleSubmit = useCallback(() => {
    if (!validate()) {
      return;
    }

    if (!selectedAccount) {
      return;
    }

    const dto: CreateRecurringTransactionDTO = {
      name: name.trim(),
      type,
      accountId: selectedAccount.id,
      currencyCode: selectedAccount.currencyCode,
      amountMinor: parseMajorToMinor(amountMajor),
      frequency,
      startDate,
    };

    onSubmit({ data: dto, registerFirstOperation });
  }, [
    frequency,
    name,
    onSubmit,
    registerFirstOperation,
    selectedAccount,
    startDate,
    type,
    validate,
  ]);

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSubmitting) {
          onOpenChange(false);
        }
      }}
      title="Nueva transaccion recurrente"
      description="La regla se guarda primero; tu decides si registras la primera operacion ahora"
      size="lg"
      className="max-h-[92dvh] pb-safe-bottom"
    >
      <div className="space-y-4">
        <Input
          label="Nombre"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
          maxLength={255}
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Tipo"
            value={type}
            onChange={(event) =>
              setType(event.target.value as TransactionType)
            }
            options={TYPE_OPTIONS}
            disabled={isSubmitting}
          />

          <Select
            label="Frecuencia"
            value={frequency}
            onChange={(event) =>
              setFrequency(event.target.value as RecurringFrequency)
            }
            options={FREQUENCY_OPTIONS}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Monto"
            value={amountMajor}
            onChange={(event) => setAmountMajor(event.target.value)}
            error={errors.amount}
            inputMode="decimal"
            disabled={isSubmitting}
          />

          <Select
            label="Cuenta"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            options={accountOptions}
            error={errors.accountId}
            placeholder="Selecciona una cuenta"
            disabled={isSubmitting || accounts.length === 0}
          />
        </div>

        <Input
          label="Fecha de inicio"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          error={errors.startDate}
          disabled={isSubmitting}
        />

        <label className="flex min-h-[44px] items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={registerFirstOperation}
            onChange={(event) => setRegisterFirstOperation(event.target.checked)}
            aria-label="Registrar la primera operacion ahora"
            disabled={isSubmitting}
          />
          Registrar la primera operacion ahora
        </label>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="min-h-[44px]"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            className="min-h-[44px]"
            onClick={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            Crear regla recurrente
          </Button>
        </div>
      </div>
    </Modal>
  );
}
