'use client';

import { Check, Wrench } from 'lucide-react';
import {
  accountBalanceResultSchema,
  createPendingExpensesResultSchema,
  createTransactionResultSchema,
  createTransferResultSchema,
  reclassifyExpenseAsTransferResultSchema,
} from '@/lib/ai/tools/schemas';
import { BalanceCard } from './balance-card';
import { ClarificationCard } from './clarification-card';
import { PendingReceiptsCard } from './pending-receipts-card';
import { TransactionCard } from './transaction-card';
import { TransferCard } from './transfer-card';

function Notice({
  text,
  tone = 'muted',
}: {
  text: string;
  tone?: 'muted' | 'error';
}) {
  return (
    <div
      className={
        tone === 'error'
          ? 'w-full max-w-[86%] rounded-xl border border-destructive/40 bg-destructive/10 p-3 sm:max-w-md'
          : 'w-full max-w-[86%] rounded-xl border border-border/50 bg-muted/40 p-3 sm:max-w-md'
      }
    >
      <p
        className={
          tone === 'error'
            ? 'text-sm text-destructive'
            : 'text-sm text-muted-foreground'
        }
      >
        {text}
      </p>
    </div>
  );
}

/**
 * Renders one completed tool call as a standalone card. Only validated
 * structured outputs reach a card; anything else gets a safe fallback.
 */
export function ToolResult({
  type,
  output,
}: {
  type: string;
  output: unknown;
}) {
  switch (type) {
    case 'tool-createTransaction': {
      const parsed = createTransactionResultSchema.safeParse(output);
      if (!parsed.success) break;
      const data = parsed.data;
      if (data.status === 'success')
        return <TransactionCard transaction={data.transaction} />;
      if (data.status === 'needs_clarification')
        return (
          <ClarificationCard message={data.message} options={data.options} />
        );
      return <Notice text={data.message} tone="error" />;
    }
    case 'tool-createTransfer': {
      const parsed = createTransferResultSchema.safeParse(output);
      if (!parsed.success) break;
      const data = parsed.data;
      if (data.status === 'success')
        return (
          <TransferCard
            label="Transferencia entre tus cuentas"
            fromAccountName={data.transfer.fromAccountName}
            toAccountName={data.transfer.toAccountName}
            amountMinor={data.transfer.fromAmountMinor}
            currencyCode={data.transfer.fromCurrency}
            note="No es un gasto: tu saldo total no cambia."
          />
        );
      if (data.status === 'needs_clarification')
        return (
          <ClarificationCard message={data.message} options={data.options} />
        );
      return <Notice text={data.message} tone="error" />;
    }
    case 'tool-reclassifyExpenseAsTransfer': {
      const parsed = reclassifyExpenseAsTransferResultSchema.safeParse(output);
      if (!parsed.success) break;
      const data = parsed.data;
      if (data.status === 'success')
        return (
          <TransferCard
            label="Gasto convertido en transferencia"
            fromAccountName={data.converted.fromAccountName}
            toAccountName={data.converted.toAccountName}
            amountMinor={data.converted.amountMinor}
            currencyCode={data.converted.currencyCode}
            note={`El movimiento del ${data.converted.date} ya no cuenta como gasto y ambos saldos quedaron corregidos.`}
          />
        );
      if (data.status === 'needs_clarification')
        return (
          <ClarificationCard message={data.message} options={data.options} />
        );
      return <Notice text={data.message} tone="error" />;
    }
    case 'tool-createPendingExpenses': {
      const parsed = createPendingExpensesResultSchema.safeParse(output);
      if (!parsed.success) break;
      if (parsed.data.status === 'success')
        return <PendingReceiptsCard pending={parsed.data.pending} />;
      return <Notice text={parsed.data.message} tone="error" />;
    }
    case 'tool-getAccountBalance': {
      const parsed = accountBalanceResultSchema.safeParse(output);
      if (!parsed.success) break;
      if (parsed.data.status === 'success')
        return (
          <BalanceCard
            accounts={parsed.data.accounts}
            usdSubtotalMinor={parsed.data.usdSubtotalMinor}
          />
        );
      return <Notice text={parsed.data.message} />;
    }
    case 'tool-queryTransactions':
    case 'tool-searchTransactions':
      return (
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/50 px-2.5 py-1 text-xs text-muted-foreground">
          <Check className="h-3 w-3 text-primary" aria-hidden="true" />
          {type === 'tool-queryTransactions'
            ? 'Transacciones consultadas'
            : 'Búsqueda de transacciones realizada'}
        </div>
      );
  }

  return (
    <div className="w-full max-w-[86%] rounded-xl border border-border/50 bg-muted/40 p-3 sm:max-w-md">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Wrench className="h-3 w-3 text-primary" aria-hidden="true" />
        <span className="font-medium">{type.replace('tool-', '')}</span>
      </div>
      <div className="text-sm">
        {typeof output === 'string' ? output : JSON.stringify(output)}
      </div>
    </div>
  );
}
