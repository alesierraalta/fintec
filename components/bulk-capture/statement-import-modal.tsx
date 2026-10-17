'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Modal, Button } from '@/components/ui';
import type { Transaction } from '@/types/domain';
import { toMinorUnits, formatCurrency } from '@/lib/money';
import {
  parseCsv,
  guessColumnMapping,
  mapStatementRows,
  type StatementColumnMapping,
} from '@/lib/finance/statement-import';
import { detectHistoryDuplicate } from '@/lib/finance/duplicate-detector';
import {
  AccountSelect,
  type CaptureProps,
  fieldClass,
  useCaptureSave,
} from './capture-controls';

const columnLabels: Record<keyof StatementColumnMapping, string> = {
  date: 'Fecha',
  description: 'Descripción',
  amount: 'Monto',
  reference: 'Referencia',
  debit: 'Débito',
  credit: 'Crédito',
};
export function StatementImportModal({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  existingTransactions,
}: CaptureProps & { existingTransactions: Transaction[] }) {
  const [csv, setCsv] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<StatementColumnMapping>(() =>
    guessColumnMapping([])
  );
  const [hasHeader, setHasHeader] = useState(true);
  const [invertSign, setInvertSign] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [selection, setSelection] = useState<Record<number, boolean>>({});
  const [reading, setReading] = useState(false);
  const { saving, save } = useCaptureSave(onClose, onSuccess);
  const account = accounts.find((a) => a.id === accountId);
  const preview = useMemo(
    () => mapStatementRows(csv, mapping, { hasHeader, invertSign }),
    [csv, mapping, hasHeader, invertSign]
  );
  const rows = useMemo(
    () =>
      preview.rows.map((row) => {
        const duplicate = detectHistoryDuplicate(
          {
            referenceId: row.reference,
            amountMinor: account
              ? toMinorUnits(row.amount, account.currencyCode)
              : undefined,
            currencyCode: account?.currencyCode,
            accountId: account?.id,
            date: row.date,
          },
          existingTransactions
        );
        return { ...row, duplicate };
      }),
    [preview, account, existingTransactions]
  );
  const selected = rows.filter(
    (row) => selection[row.rowNumber] ?? !row.duplicate.isDuplicate
  );
  const submit = () => {
    if (!account) return;
    void save(
      selected.map((row) => ({
        type: row.type,
        accountId,
        currencyCode: account.currencyCode,
        amountMinor: toMinorUnits(row.amount, account.currencyCode),
        date: row.date,
        description: row.description,
        tags: ['extracto'],
        note: row.reference ? `Ref: ${row.reference}` : undefined,
      }))
    );
  };
  return (
    <Modal
      open={isOpen}
      onClose={() => {
        if (!saving && !reading) onClose();
      }}
      title="Importar extracto"
      description="Revisa las columnas y selecciona los movimientos que deseas importar."
      size="xl"
      mobileFullScreen
      footer={
        <Button
          disabled={saving || reading || !account || selected.length === 0}
          onClick={submit}
        >
          {saving ? 'Guardando…' : `Importar ${selected.length} movimientos`}
        </Button>
      }
    >
      <fieldset disabled={saving || reading} className="space-y-4">
        <label className="block">
          Archivo CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className={fieldClass}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setReading(true);
              setCsv([]);
              setSelection({});
              try {
                const data = parseCsv(await file.text());
                setCsv(data);
                setMapping(guessColumnMapping(data[0] ?? []));
              } catch {
                toast.error('No se pudo leer el archivo CSV.');
              } finally {
                setReading(false);
              }
            }}
          />
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={hasHeader}
            onChange={(e) => {
              setHasHeader(e.target.checked);
              setSelection({});
            }}
          />
          El archivo tiene encabezados
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(columnLabels) as (keyof StatementColumnMapping)[]).map(
            (key) => (
              <label key={key}>
                {columnLabels[key]}
                <select
                  className={fieldClass}
                  value={mapping[key] ?? ''}
                  onChange={(e) => {
                    setMapping({
                      ...mapping,
                      [key]:
                        e.target.value === '' ? null : Number(e.target.value),
                    });
                    setSelection({});
                  }}
                >
                  <option value="">Sin columna</option>
                  {(csv[0] ?? []).map((header, i) => (
                    <option key={i} value={i}>
                      {hasHeader ? header : `Columna ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            )
          )}
        </div>
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={invertSign}
            onChange={(e) => {
              setInvertSign(e.target.checked);
              setSelection({});
            }}
          />
          Invertir signo
        </label>
        <AccountSelect
          accounts={accounts}
          value={accountId}
          onChange={(value) => {
            setAccountId(value);
            setSelection({});
          }}
        />
        <p aria-live="polite">
          {preview.invalidRows.length} filas inválidas · {selected.length}{' '}
          seleccionadas
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th>Importar</th>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Monto</th>
                <th>Advertencia</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.rowNumber} className="border-t border-border">
                  <td className="p-3">
                    <input
                      aria-label={`Importar fila ${row.rowNumber}`}
                      type="checkbox"
                      checked={
                        selection[row.rowNumber] ?? !row.duplicate.isDuplicate
                      }
                      onChange={(e) =>
                        setSelection({
                          ...selection,
                          [row.rowNumber]: e.target.checked,
                        })
                      }
                    />
                  </td>
                  <td>{row.date}</td>
                  <td>{row.description}</td>
                  <td>
                    {row.type === 'EXPENSE' ? '−' : '+'}
                    {account
                      ? formatCurrency(
                          toMinorUnits(row.amount, account.currencyCode),
                          account.currencyCode
                        )
                      : row.amount}
                  </td>
                  <td>{row.duplicate.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>
    </Modal>
  );
}
