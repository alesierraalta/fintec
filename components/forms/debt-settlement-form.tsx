'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select, Modal } from '@/components/ui';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import type { Account, Transaction } from '@/types/domain';
import { formatCurrency } from '@/lib/money';
import { toast } from 'sonner';

interface DebtSettlementFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  debt: Transaction | null;
  onSettle: (debt: Transaction, input: any) => Promise<void>;
  settlingId: string | null;
}

export function DebtSettlementForm({
  open,
  onClose,
  onSuccess,
  debt,
  onSettle,
  settlingId,
}: DebtSettlementFormProps) {
  const repository = useRepository();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);

  const remainingMinor = debt?.remainingAmountMinor ?? debt?.amountMinor ?? 0;

  const [amountInput, setAmountInput] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open && user?.id) {
      repository.accounts.findByUserId(user.id).then(setAccounts);
      setAmountInput((remainingMinor / 100).toString());
      setDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setAccountId('');
    }
  }, [open, user?.id, remainingMinor, repository]);

  if (!debt) return null;

  const paidMinor = debt.paidAmountMinor ?? 0;
  const isSettling = settlingId === debt.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      toast.error('Debe seleccionar una cuenta');
      return;
    }

    const amountMinor = Math.round(parseFloat(amountInput) * 100);
    if (!amountMinor || amountMinor <= 0) {
      toast.error('Monto inválido');
      return;
    }

    if (amountMinor > remainingMinor) {
      toast.error('El monto no puede ser mayor a la deuda restante');
      return;
    }

    try {
      await onSettle(debt, {
        amountMinor,
        settlementAccountId: accountId,
        date: new Date(date).toISOString(),
        note: note || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Saldar Deuda">
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div className="rounded-xl border border-border bg-muted/50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monto original:</span>
            <span className="font-medium">
              {formatCurrency(debt.amountMinor, debt.currencyCode)}
            </span>
          </div>
          {paidMinor > 0 && (
            <div className="mt-1 flex justify-between text-green-600">
              <span>Pagado:</span>
              <span className="font-medium">
                {formatCurrency(paidMinor, debt.currencyCode)}
              </span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-border pt-1 font-bold">
            <span>Restante:</span>
            <span>{formatCurrency(remainingMinor, debt.currencyCode)}</span>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Monto a saldar
          </label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max={remainingMinor / 100}
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <Select
            label="Cuenta de pago/cobro"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
            options={[
              { value: '', label: 'Selecciona una cuenta' },
              ...accounts.map((acc) => ({
                value: acc.id,
                label: `${acc.name} (${formatCurrency(acc.balance, acc.currencyCode)})`,
              })),
            ]}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Fecha
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Nota (Opcional)
          </label>
          <Input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej. Transferencia bancaria"
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSettling}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSettling}>
            {isSettling ? 'Saldando...' : 'Saldar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
