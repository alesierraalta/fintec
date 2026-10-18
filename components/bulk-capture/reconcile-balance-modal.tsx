'use client';

import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import type { Account, Category } from '@/types/domain';
import { toMinorUnits, formatCurrency } from '@/lib/money';
import { parseAmountInput } from '@/lib/finance/quick-entry';
import { buildReconciliationTransaction } from '@/lib/finance/reconciliation';
import {
  CategorySelect,
  fieldClass,
  today,
  useCaptureSave,
} from './capture-controls';

export function ReconcileBalanceModal({
  isOpen,
  onClose,
  onSuccess,
  account,
  categories,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  account: Account;
  categories: Category[];
}) {
  const [actual, setActual] = useState('');
  const [date, setDate] = useState(today);
  const [categoryId, setCategoryId] = useState('');
  const { saving, save } = useCaptureSave(onClose, onSuccess);
  const amount = parseAmountInput(actual);
  const transaction =
    amount === null
      ? null
      : buildReconciliationTransaction({
          account,
          actualBalanceMinor: toMinorUnits(amount, account.currencyCode),
          date,
        });
  const difference = transaction
    ? formatCurrency(transaction.amountMinor, account.currencyCode)
    : '';
  return (
    <Modal
      open={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Conciliar saldo"
      description={account.name}
      mobileFullScreen
      footer={
        <Button
          disabled={saving || !transaction || !date}
          onClick={() => {
            if (transaction)
              void save([
                {
                  ...transaction,
                  categoryId: categories.some(
                    (c) =>
                      c.id === categoryId &&
                      c.active &&
                      String(c.kind) === transaction.type
                  )
                    ? categoryId
                    : undefined,
                },
              ]);
          }}
        >
          {saving ? 'Guardando…' : 'Confirmar conciliación'}
        </Button>
      }
    >
      <fieldset disabled={saving} className="space-y-4">
        <p>
          Saldo registrado:{' '}
          {formatCurrency(Number(account.balance), account.currencyCode)}
        </p>
        <label className="block">
          Saldo real hoy
          <input
            className={fieldClass}
            inputMode="decimal"
            value={actual}
            onChange={(e) => {
              setActual(e.target.value);
              setCategoryId('');
            }}
          />
        </label>
        <label className="block">
          Fecha
          <input
            className={fieldClass}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <p aria-live="polite">
          {amount === null
            ? 'Escribe tu saldo real.'
            : transaction
              ? `Se registrará un ${transaction.type === 'EXPENSE' ? 'gasto' : 'ingreso'} de ${difference}`
              : 'Tu saldo ya cuadra'}
        </p>
        <CategorySelect
          categories={categories}
          kind={transaction?.type ?? 'EXPENSE'}
          value={categoryId}
          onChange={setCategoryId}
        />
      </fieldset>
    </Modal>
  );
}
