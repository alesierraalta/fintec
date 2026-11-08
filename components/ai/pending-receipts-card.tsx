'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/ai/tools/formatters';
import { toMinorUnits } from '@/lib/money';
import { matchReceiptsToPending } from '@/lib/ai/receipts/match-pending';
import { planReceiptTransactions } from '@/lib/ai/receipts/plan-receipt-transactions';
import type { ScannedReceiptResult } from '@/lib/ai/receipt-scanner/types';
import { useChatActions } from './chat-actions';
import { ChatCard, ChatCardActions, ChatCardButton } from './chat-card';

interface ScanSlot {
  index: number;
  name: string;
  status: 'scanning' | 'done' | 'error';
  result?: ScannedReceiptResult;
}

function receiptText(result: ScannedReceiptResult): string {
  return [
    result.suggestedDescription,
    result.counterparty?.name,
    result.bankOrPlatform,
    ...(result.items ?? []).map((item) => item.description),
  ]
    .filter(Boolean)
    .join(' ');
}

function summarize(result: ScannedReceiptResult): string {
  return `${result.suggestedDescription} · ${formatCurrency(
    toMinorUnits(result.amount, result.currency),
    result.currency
  )}`;
}

/**
 * Expenses announced without amounts ("hice 3 gastos, te paso los
 * tickets"). The user pastes or uploads receipt photos; each one is scanned
 * and matched to the expense it belongs to before anything is recorded.
 */
export function PendingReceiptsCard({
  pending,
}: {
  pending: Array<{ id: string; name: string }>;
}) {
  const actions = useChatActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scans, setScans] = useState<ScanSlot[]>([]);
  // Pending id -> receipt summary, kept once recorded (it leaves the matching).
  const [settled, setSettled] = useState<
    Record<string, { scanIndex: number; summary: string }>
  >({});
  const [accountOverrides, setAccountOverrides] = useState<
    Record<string, string>
  >({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = pending.filter((p) => !(p.id in settled));
  // Photos already used to record an expense never match again.
  const usedScans = new Set(Object.values(settled).map((v) => v.scanIndex));
  const scanned = scans.filter(
    (s) => s.status === 'done' && s.result && !usedScans.has(s.index)
  );
  // Cheap pure functions over a handful of receipts: recomputed per render.
  const match = matchReceiptsToPending(
    open,
    scanned.map((s) => ({ index: s.index, text: receiptText(s.result!) }))
  );
  const plan = planReceiptTransactions({
    pending: open,
    scans: scanned.map((s) => ({ index: s.index, result: s.result! })),
    assignments: match.assignments,
    accounts: actions?.accounts ?? [],
    accountOverrides,
  });

  const addFiles = (files: File[]) => {
    if (!actions) return;
    const images = files.filter((f) => f.type.startsWith('image/'));
    const start = scans.length;
    setScans((prev) => [
      ...prev,
      ...images.map((file, i) => ({
        index: start + i,
        name: file.name,
        status: 'scanning' as const,
      })),
    ]);
    images.forEach((file, i) => {
      actions
        .scanReceipt(file)
        .then((result) =>
          setScans((prev) =>
            prev.map((s) =>
              s.index === start + i ? { ...s, status: 'done', result } : s
            )
          )
        )
        .catch(() =>
          setScans((prev) =>
            prev.map((s) =>
              s.index === start + i ? { ...s, status: 'error' } : s
            )
          )
        );
    });
  };

  const settledEntryFor = (pendingId: string) => {
    const assignment = match.assignments.find(
      (a) => a.pendingId === pendingId
    )!;
    const result = scans.find((s) => s.index === assignment.scanIndex)?.result;
    return {
      scanIndex: assignment.scanIndex,
      summary: result ? summarize(result) : '',
    };
  };

  const register = async () => {
    if (!actions) return;
    setSaving(true);
    setError(null);
    for (const item of plan.ready) {
      try {
        await actions.settlePendingReceipt(item.pendingId, item.transaction);
        const entry = settledEntryFor(item.pendingId);
        setSettled((prev) => ({ ...prev, [item.pendingId]: entry }));
      } catch {
        setError(
          'Algunos gastos no se pudieron registrar. Revisa e inténtalo de nuevo.'
        );
      }
    }
    setSaving(false);
  };

  const scanning = scans.filter((s) => s.status === 'scanning').length;
  const failed = scans.filter((s) => s.status === 'error').length;
  const unmatched = match.unmatchedScans.length;

  return (
    <ChatCard
      label={`${pending.length} gasto${pending.length === 1 ? '' : 's'} esperan su ticket`}
      tone="warning"
    >
      <ul className="grid gap-2">
        {pending.map((p) => {
          const assignment = match.assignments.find(
            (a) => a.pendingId === p.id
          );
          const result = assignment
            ? scans.find((s) => s.index === assignment.scanIndex)?.result
            : undefined;
          const isSettled = p.id in settled;
          const needsAccount = plan.needsAccount.includes(p.id);
          return (
            <li
              key={p.id}
              className="flex items-center gap-2.5 rounded-lg bg-background p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {isSettled
                    ? settled[p.id].summary
                    : result
                      ? summarize(result)
                      : 'Sin foto todavía'}
                </p>
                {needsAccount && actions && (
                  <label className="mt-1 flex items-center gap-2 text-[13px]">
                    <span className="text-muted-foreground">Cuenta</span>
                    <select
                      className="focus-ring rounded-md border border-border bg-card px-2 py-1"
                      value={accountOverrides[p.id] ?? ''}
                      onChange={(e) =>
                        setAccountOverrides((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                    >
                      <option value="" disabled>
                        Elige la cuenta ({result?.currency})
                      </option>
                      {actions.accounts
                        .filter(
                          (a) => !result || a.currencyCode === result.currency
                        )
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
              </div>
              <span
                className={
                  isSettled || (result && !needsAccount)
                    ? 'text-[13px] font-semibold text-success'
                    : 'text-[13px] text-muted-foreground'
                }
              >
                {isSettled
                  ? 'Registrado'
                  : result && !needsAccount
                    ? 'Listo'
                    : 'Pendiente'}
              </span>
            </li>
          );
        })}
      </ul>

      {actions && open.length > 0 && (
        <>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
            }}
            onPaste={(e) => addFiles(Array.from(e.clipboardData.files))}
            className="focus-ring mt-2.5 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary p-3 text-sm font-semibold text-primary"
          >
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            Pega o sube las fotos de los tickets
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            aria-label="Fotos de los tickets"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
        </>
      )}

      <div
        aria-live="polite"
        className="mt-2 space-y-1 text-[13px] text-muted-foreground"
      >
        {scanning > 0 && (
          <p className="flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Leyendo {scanning} ticket{scanning === 1 ? '' : 's'}…
          </p>
        )}
        {failed > 0 && (
          <p className="text-destructive">
            No pude leer {failed} foto{failed === 1 ? '' : 's'}.
          </p>
        )}
        {unmatched > 0 && (
          <p>
            {unmatched} foto{unmatched === 1 ? '' : 's'} no coinciden con ningún
            gasto pendiente.
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
      </div>

      {actions && plan.ready.length > 0 && (
        <ChatCardActions>
          <ChatCardButton disabled={saving} onClick={register}>
            {saving
              ? 'Registrando…'
              : `Registrar ${plan.ready.length === 1 ? 'el listo' : `los ${plan.ready.length} listos`}`}
          </ChatCardButton>
        </ChatCardActions>
      )}
    </ChatCard>
  );
}
