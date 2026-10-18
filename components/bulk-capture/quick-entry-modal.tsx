'use client';

import { useMemo, useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { TransactionType } from '@/types/domain';
import { toMinorUnits, formatCurrency } from '@/lib/money';
import { parseQuickEntries } from '@/lib/finance/quick-entry';
import {
  AccountSelect,
  CategorySelect,
  type CaptureProps,
  fieldClass,
  today,
  useCaptureSave,
} from './capture-controls';

export function QuickEntryModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
}: CaptureProps) {
  const [text, setText] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(today);
  const [categoryId, setCategoryId] = useState('');
  const { saving, save } = useCaptureSave(onClose, onSuccess);
  const parsed = useMemo(() => parseQuickEntries(text), [text]);
  const account = accounts.find((a) => a.id === accountId);
  const ready = account && date && parsed.entries.length > 0;
  const submit = () => {
    if (!account) return;
    void save(
      parsed.entries.map((entry) => ({
        type: TransactionType.EXPENSE,
        accountId,
        currencyCode: account.currencyCode,
        amountMinor: toMinorUnits(entry.amount, account.currencyCode),
        date,
        description: entry.description,
        categoryId: categoryId || undefined,
        tags: ['registro-rapido'],
      }))
    );
  };
  return (
    <Modal
      open={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Registro rápido"
      description="Registra varios gastos pequeños de una vez."
      mobileFullScreen
      footer={
        <Button disabled={saving || !ready} onClick={submit}>
          {saving ? 'Guardando…' : `Guardar ${parsed.entries.length} gastos`}
        </Button>
      }
    >
      <fieldset disabled={saving} className="space-y-4">
        <label className="block">
          Gastos
          <textarea
            className={fieldClass}
            rows={5}
            placeholder={'café 2, taxi 5\nalmuerzo 12'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <AccountSelect
          accounts={accounts}
          value={accountId}
          onChange={setAccountId}
        />
        <label className="block">
          Fecha
          <input
            type="date"
            className={fieldClass}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <CategorySelect
          categories={categories}
          kind="EXPENSE"
          value={categoryId}
          onChange={setCategoryId}
        />
        <div aria-live="polite">
          <ul>
            {parsed.entries.map((entry, i) => (
              <li key={i}>
                {entry.description}:{' '}
                {account
                  ? formatCurrency(
                      toMinorUnits(entry.amount, account.currencyCode),
                      account.currencyCode
                    )
                  : entry.amount}
              </li>
            ))}
          </ul>
          <p>
            Total:{' '}
            {account
              ? formatCurrency(
                  parsed.entries.reduce(
                    (total, e) =>
                      total + toMinorUnits(e.amount, account.currencyCode),
                    0
                  ),
                  account.currencyCode
                )
              : 'Selecciona una cuenta'}
          </p>
          {parsed.invalid.length > 0 && (
            <p role="alert">No se importarán: {parsed.invalid.join('; ')}</p>
          )}
        </div>
      </fieldset>
    </Modal>
  );
}
