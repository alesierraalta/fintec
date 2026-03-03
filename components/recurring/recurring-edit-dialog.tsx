'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import {
  RecurringFrequency,
  RecurringTransaction,
  UpdateRecurringTransactionDTO,
} from '@/types/recurring-transactions';

interface RecurringEditDialogProps {
  open: boolean;
  transaction: RecurringTransaction | null;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    id: string;
    data: UpdateRecurringTransactionDTO;
  }) => void;
}

interface FormErrors {
  name?: string;
  amount?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  note?: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
];

function formatMinorToMajorString(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function parseMajorToMinor(amountMajor: string): number {
  const parsed = Number.parseFloat(amountMajor.replace(',', '.'));
  if (!Number.isFinite(parsed)) {
    return NaN;
  }

  return Math.round(parsed * 100);
}

export function RecurringEditDialog({
  open,
  transaction,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: RecurringEditDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [amountMajor, setAmountMajor] = useState('0.00');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!transaction) {
      return;
    }

    setName(transaction.name);
    setDescription(transaction.description || '');
    setNote(transaction.note || '');
    setFrequency(transaction.frequency);
    setAmountMajor(formatMinorToMajorString(transaction.amountMinor));
    setStartDate(transaction.startDate);
    setEndDate(transaction.endDate || '');
    setIsActive(transaction.isActive);
    setErrors({});
  }, [transaction, open]);

  const hasChanges = useMemo(() => {
    if (!transaction) {
      return false;
    }

    return (
      name !== transaction.name ||
      description !== (transaction.description || '') ||
      note !== (transaction.note || '') ||
      frequency !== transaction.frequency ||
      amountMajor !== formatMinorToMajorString(transaction.amountMinor) ||
      startDate !== transaction.startDate ||
      endDate !== (transaction.endDate || '') ||
      isActive !== transaction.isActive
    );
  }, [
    amountMajor,
    description,
    endDate,
    frequency,
    isActive,
    name,
    note,
    startDate,
    transaction,
  ]);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    const amountMinor = parseMajorToMinor(amountMajor);

    if (!name.trim()) {
      nextErrors.name = 'El nombre es requerido';
    }

    if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
      nextErrors.amount = 'El monto debe ser mayor a 0';
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      nextErrors.startDate = 'La fecha de inicio es invalida';
    }

    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      nextErrors.endDate = 'La fecha de fin es invalida';
    }

    if (endDate && startDate && endDate < startDate) {
      nextErrors.endDate =
        'La fecha de fin debe ser posterior a la fecha de inicio';
    }

    if (description.length > 255) {
      nextErrors.description = 'La descripcion no puede superar 255 caracteres';
    }

    if (note.length > 500) {
      nextErrors.note = 'La nota no puede superar 500 caracteres';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!transaction) {
      return;
    }

    if (!validate()) {
      return;
    }

    const amountMinor = parseMajorToMinor(amountMajor);
    const payload: UpdateRecurringTransactionDTO = {
      name: name.trim(),
      description: description.trim() || undefined,
      note: note.trim() || undefined,
      frequency,
      amountMinor,
      startDate,
      endDate: endDate || undefined,
      isActive,
    };

    onSubmit({ id: transaction.id, data: payload });
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSubmitting) {
          onOpenChange(false);
        }
      }}
      title="Editar transaccion recurrente"
      description="Actualiza los datos y guarda cambios"
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
          <Input
            label="Monto"
            value={amountMajor}
            onChange={(event) => setAmountMajor(event.target.value)}
            error={errors.amount}
            inputMode="decimal"
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
            label="Fecha de inicio"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            error={errors.startDate}
            disabled={isSubmitting}
          />

          <Input
            label="Fecha de fin (opcional)"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            error={errors.endDate}
            disabled={isSubmitting}
          />
        </div>

        <Input
          label="Descripcion (opcional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          error={errors.description}
          maxLength={255}
          disabled={isSubmitting}
        />

        <Input
          label="Nota (opcional)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          error={errors.note}
          maxLength={500}
          disabled={isSubmitting}
        />

        <label className="flex min-h-[44px] items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            disabled={isSubmitting}
            aria-label="Activa"
          />
          Activa
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
            disabled={!hasChanges || isSubmitting}
            loading={isSubmitting}
          >
            Guardar cambios
          </Button>
        </div>
      </div>
    </Modal>
  );
}
