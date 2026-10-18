'use client';

import { useRef, useState } from 'react';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { useActiveUsdVesRate } from '@/lib/rates';
import type { Account, Category, CreateTransactionDTO } from '@/types/domain';
import { saveTransactions } from './save-transactions';

export interface CaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  accounts: Account[];
  categories: Category[];
}

export const fieldClass =
  'w-full rounded-lg border border-border bg-background p-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
export function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function AccountSelect({
  accounts,
  value,
  onChange,
}: {
  accounts: Account[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      Cuenta
      <select
        className={fieldClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Seleccionar cuenta</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.currencyCode})
          </option>
        ))}
      </select>
    </label>
  );
}
export function CategorySelect({
  categories,
  kind,
  value,
  onChange,
}: {
  categories: Category[];
  kind: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      Categoría (opcional)
      <select
        className={fieldClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Sin categoría</option>
        {categories
          .filter((c) => c.active && c.kind === kind)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
    </label>
  );
}

export function useCaptureSave(onClose: () => void, onSuccess?: () => void) {
  const repository = useRepository();
  const { user } = useAuth();
  const exchangeRate = useActiveUsdVesRate();
  const [saving, setSaving] = useState(false);
  const locked = useRef(false);
  const save = async (transactions: CreateTransactionDTO[]) => {
    if (locked.current || transactions.length === 0) return;
    locked.current = true;
    setSaving(true);
    try {
      const result = await saveTransactions({
        userId: user?.id,
        repository,
        transactions,
        exchangeRate,
      });
      if (result.saved > 0) onSuccess?.();
      // Close partial batches too: retrying the same preview would duplicate committed rows.
      if (result.complete || result.saved > 0) onClose();
    } finally {
      locked.current = false;
      setSaving(false);
    }
  };
  return { saving, save };
}
