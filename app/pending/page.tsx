'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MainLayout } from '@/components/layout/main-layout';
import { useAuth } from '@/hooks/use-auth';
import { useRepository } from '@/providers/repository-provider';
import { FormLoading } from '@/components/ui/suspense-loading';
import {
  Check,
  ChevronDown,
  CreditCard,
  Plus,
  ReceiptText,
  ShoppingCart,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, toMinorUnits } from '@/lib/money';
import { logger } from '@/lib/utils/logger';
import type { PendingItem, PendingItemKind } from '@/types/pending-item';
import { TransactionType, type Transaction } from '@/types';

const TransactionForm = dynamic(
  () =>
    import('@/components/forms/transaction-form').then(
      (mod) => mod.TransactionForm
    ),
  { loading: () => <FormLoading />, ssr: false }
);

const MAX_NAME_LENGTH = 200;

type AmountParseResult =
  | { status: 'empty' }
  | { status: 'ok'; amountBaseMinor: number }
  | { status: 'invalid' };

// Parses approximate amounts for a zero-friction checklist. es-ES rules:
// "," is the decimal separator, "." groups thousands ("1.234" = 1234).
// Only two shapes ever reach parseFloat as digits: "1234" and "1234,56".
// Anything else — any dot that is not strict grouping ("20.50"), comma with
// 3+ digits ("1,234"), repeated commas ("1,5,5"), spaces ("1 234") — is
// rejected and the caller adds the item without an amount rather than
// guessing with money. Empty is fine (the amount is optional); anything
// unreadable is reported by the caller but never blocks the item.
function parseAmountInput(raw: string): AmountParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { status: 'empty' };

  // Strict es-ES grouping ("1.234", "1.234.567"): strip the dot separators.
  if (/^\d{1,3}(\.\d{3})+$/.test(trimmed)) {
    return parseAmountInput(trimmed.replace(/\./g, ''));
  }
  // Any other dot could be a decimal point: ambiguous, never guessed.
  if (trimmed.includes('.')) return { status: 'invalid' };

  // Decimal comma ("20,5" → 20.5) or plain digits ("20"). Everything else
  // ("1,234", "1,5,5", "1 234") is garbage: parseFloat would silently
  // truncate it to a 1000x-smaller amount, so reject before it can.
  const decimalComma = /^(\d+),(\d{1,2})$/.exec(trimmed);
  if (!decimalComma && !/^\d+$/.test(trimmed)) {
    return { status: 'invalid' };
  }

  const value = Number.parseFloat(
    decimalComma ? `${decimalComma[1]}.${decimalComma[2]}` : trimmed
  );
  if (!Number.isFinite(value) || value <= 0) return { status: 'invalid' };

  try {
    const amountBaseMinor = toMinorUnits(value, 'USD');
    if (amountBaseMinor <= 0) return { status: 'invalid' };
    return { status: 'ok', amountBaseMinor };
  } catch {
    return { status: 'invalid' };
  }
}

function formatApproxAmount(amountBaseMinor: number): string {
  return `~${formatCurrency(amountBaseMinor, 'USD', { locale: 'es-ES' })}`;
}

const doneLabel = (kind: PendingItemKind) =>
  kind === 'purchase' ? 'Comprado ✓' : 'Pagado ✓';

export default function PendingPage() {
  const { user } = useAuth();
  const repository = useRepository();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertTarget, setConvertTarget] = useState<PendingItem | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        setLoading(true);
        setItems(await repository.pendingItems.findByUser(user.id));
      } catch (error) {
        logger.error('Failed to load pending items:', error);
        toast.error('No se pudieron cargar los pendientes');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, repository]);

  const handleAdd = async (
    kind: PendingItemKind,
    name: string,
    amountRaw: string
  ) => {
    if (!user) return;
    const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
    if (!trimmed) return;

    const parsed = parseAmountInput(amountRaw);
    if (parsed.status === 'invalid') {
      toast.info(
        `No pude leer el monto "${amountRaw.trim()}" — lo agrego sin importe`
      );
    }

    try {
      const created = await repository.pendingItems.create(user.id, {
        kind,
        name: trimmed,
        amountBaseMinor: parsed.status === 'ok' ? parsed.amountBaseMinor : null,
      });
      setItems((prev) => [...prev, created]);
    } catch (error) {
      logger.error('Failed to create pending item:', error);
      toast.error('No se pudo agregar el elemento');
    }
  };

  const handleToggle = async (item: PendingItem) => {
    const done = !item.done;
    // Optimistic: the tap must feel instant. Roll back only if the
    // repository rejects the change.
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, done, doneAt: done ? new Date().toISOString() : null }
          : i
      )
    );
    try {
      const updated = await repository.pendingItems.update(item.id, { done });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      if (done) toast.success(doneLabel(item.kind));
    } catch (error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
      logger.error('Failed to update pending item:', error);
      toast.error('No se pudo actualizar');
    }
  };

  const handleDelete = async (item: PendingItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await repository.pendingItems.delete(item.id);
    } catch (error) {
      setItems((prev) =>
        [...prev, item].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      );
      logger.error('Failed to delete pending item:', error);
      toast.error('No se pudo eliminar');
    }
  };

  const handleClearCompleted = async (kind: PendingItemKind, count: number) => {
    if (!user) return;
    const snapshot = items;
    setItems((prev) => prev.filter((i) => !(i.done && i.kind === kind)));
    try {
      await repository.pendingItems.deleteCompleted(user.id, kind);
      toast.success(
        `Se limpiaron ${count} completado${count === 1 ? '' : 's'}`
      );
    } catch (error) {
      setItems(snapshot);
      logger.error('Failed to clear completed items:', error);
      toast.error('No se pudo limpiar la lista');
    }
  };

  const handleConverted = async (transaction: Transaction) => {
    const target = convertTarget;
    setConvertTarget(null);
    if (!target) return;
    try {
      const updated = await repository.pendingItems.update(target.id, {
        convertedTransactionId: transaction.id,
      });
      setItems((prev) => prev.map((i) => (i.id === target.id ? updated : i)));
      toast.success('Registrado en tus transacciones');
    } catch (error) {
      logger.error('Failed to link converted transaction:', error);
      toast.error('La transacción se creó pero no se pudo marcar el item');
    }
  };

  // MARKER:CHECKLIST-CARD-USAGE
  return (
    <MainLayout>
      <div className="animate-fade-in space-y-6">
        <div className="py-8 text-center">
          <div className="mb-4 inline-flex items-center space-x-2 text-muted-foreground">
            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500"></div>
            <span className="text-ios-caption font-medium">Memoria rápida</span>
          </div>

          <h1 className="mb-6 bg-gradient-to-r from-primary via-amber-500 to-orange-500 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl">
            Pendientes
          </h1>
          <p className="mb-2 font-light text-muted-foreground">
            Qué tienes que comprar y qué pagos sabes que vienen — sin fechas,
            sin formularios.
          </p>
          <p className="text-ios-footnote text-muted-foreground/70">
            Escribe y presiona Enter. Toca el círculo cuando esté hecho.
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-amber-500"></div>
            <p className="text-gray-400">Cargando pendientes...</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <ChecklistCard
              kind="purchase"
              title="Compras pendientes"
              subtitle="Cosas que vas a comprar, tarde o temprano"
              placeholder="Ej: Leche"
              icon={<ShoppingCart className="h-5 w-5 text-amber-500" />}
              activeItems={items.filter(
                (i) => i.kind === 'purchase' && !i.done
              )}
              completedItems={items.filter(
                (i) => i.kind === 'purchase' && i.done
              )}
              onAdd={handleAdd}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onClearCompleted={handleClearCompleted}
              onConvert={setConvertTarget}
            />
            <ChecklistCard
              kind="payment"
              title="Pagos pendientes"
              subtitle="Gastos que sabes que llegan, aunque la fecha varíe"
              placeholder="Ej: Suscripción X"
              icon={<CreditCard className="h-5 w-5 text-blue-500" />}
              activeItems={items.filter((i) => i.kind === 'payment' && !i.done)}
              completedItems={items.filter(
                (i) => i.kind === 'payment' && i.done
              )}
              onAdd={handleAdd}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onClearCompleted={handleClearCompleted}
              onConvert={setConvertTarget}
            />
          </div>
        )}
      </div>

      {convertTarget && (
        <TransactionForm
          isOpen
          onClose={() => setConvertTarget(null)}
          prefill={{
            type: TransactionType.EXPENSE,
            description: convertTarget.name,
            ...(convertTarget.amountBaseMinor != null
              ? {
                  amountMinor: convertTarget.amountBaseMinor,
                  currencyCode: 'USD',
                }
              : {}),
          }}
          onSuccess={handleConverted}
        />
      )}
    </MainLayout>
  );
}

interface ChecklistCardProps {
  kind: PendingItemKind;
  title: string;
  subtitle: string;
  placeholder: string;
  icon: React.ReactNode;
  activeItems: PendingItem[];
  completedItems: PendingItem[];
  onAdd: (kind: PendingItemKind, name: string, amountRaw: string) => void;
  onToggle: (item: PendingItem) => void;
  onDelete: (item: PendingItem) => void;
  onClearCompleted: (kind: PendingItemKind, count: number) => void;
  onConvert: (item: PendingItem) => void;
}

function ChecklistCard({
  kind,
  title,
  subtitle,
  placeholder,
  icon,
  activeItems,
  completedItems,
  onAdd,
  onToggle,
  onDelete,
  onClearCompleted,
  onConvert,
}: ChecklistCardProps) {
  const [nameInput, setNameInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!nameInput.trim()) return;
    onAdd(kind, nameInput, amountInput);
    setNameInput('');
    setAmountInput('');
  };

  return (
    <section className="rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-muted/40 p-2.5">{icon}</div>
        <div className="min-w-0">
          <h2 className="text-ios-title font-semibold text-foreground">
            {title}
          </h2>
          <p className="truncate text-ios-footnote text-muted-foreground">
            {subtitle}
          </p>
        </div>
        {activeItems.length > 0 && (
          <span className="ml-auto rounded-full bg-muted/40 px-2.5 py-1 text-ios-caption font-medium text-muted-foreground">
            {activeItems.length}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder={placeholder}
          aria-label={`Agregar a ${title}`}
          maxLength={MAX_NAME_LENGTH}
          className="min-w-0 flex-1 rounded-2xl border border-border/40 bg-background/40 px-4 py-3 text-base text-foreground placeholder-muted-foreground/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <input
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          placeholder="~$"
          inputMode="decimal"
          aria-label="Importe aproximado (opcional)"
          className="w-20 shrink-0 rounded-2xl border border-border/40 bg-background/40 px-3 py-3 text-base text-foreground placeholder-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          aria-label={`Añadir a ${title}`}
          disabled={!nameInput.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg transition-all hover:from-blue-600 hover:to-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-5 w-5" />
        </button>
      </form>

      <ul className="mt-4 space-y-2">
        {activeItems.length === 0 ? (
          <li className="py-6 text-center text-ios-footnote text-muted-foreground">
            Nada pendiente aquí por ahora ✨
          </li>
        ) : (
          activeItems.map((item) => (
            <li
              key={item.id}
              className="group flex items-center gap-2 rounded-2xl border border-border/30 bg-background/40 px-3 py-2 transition-colors hover:border-border/60"
            >
              <button
                type="button"
                onClick={() => onToggle(item)}
                aria-label={`Marcar "${item.name}" como ${kind === 'purchase' ? 'comprado' : 'pagado'}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-border/60 text-transparent transition-all hover:border-green-500 hover:text-green-500 active:scale-90"
              >
                <Check className="h-4 w-4" />
              </button>
              <span className="min-w-0 flex-1 truncate text-ios-body text-foreground">
                {item.name}
              </span>
              {item.amountBaseMinor != null && (
                <span className="shrink-0 text-ios-footnote text-muted-foreground">
                  {formatApproxAmount(item.amountBaseMinor)}
                </span>
              )}
              <button
                type="button"
                onClick={() => onDelete(item)}
                aria-label={`Eliminar "${item.name}"`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:transition-opacity sm:focus:opacity-100 sm:group-hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))
        )}
      </ul>

      {completedItems.length > 0 && (
        <div className="mt-5 border-t border-border/20 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowCompleted(!showCompleted)}
              aria-expanded={showCompleted}
              className="flex items-center gap-1.5 text-ios-footnote font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showCompleted ? '' : '-rotate-90'}`}
              />
              Completados ({completedItems.length})
            </button>
            <button
              type="button"
              onClick={() => onClearCompleted(kind, completedItems.length)}
              className="text-ios-caption text-muted-foreground underline-offset-2 transition-colors hover:text-destructive hover:underline"
            >
              Limpiar
            </button>
          </div>

          {showCompleted && (
            <ul className="space-y-2">
              {completedItems.map((item) => (
                <li
                  key={item.id}
                  className="group flex items-center gap-2 rounded-2xl border border-border/20 bg-muted/20 px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => onToggle(item)}
                    aria-label={`Devolver "${item.name}" a pendientes`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-green-500/40 bg-green-500/10 text-green-500 transition-all hover:border-muted-foreground hover:text-muted-foreground active:scale-90"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <span className="min-w-0 flex-1 truncate text-ios-body text-muted-foreground line-through">
                    {item.name}
                  </span>
                  {item.amountBaseMinor != null && (
                    <span className="shrink-0 text-ios-footnote text-muted-foreground/70">
                      {formatApproxAmount(item.amountBaseMinor)}
                    </span>
                  )}
                  {item.convertedTransactionId ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-ios-caption font-medium text-green-500">
                      <ReceiptText className="h-3.5 w-3.5" />
                      Registrado
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onConvert(item)}
                      aria-label={`Registrar "${item.name}" como transacción`}
                      className="shrink-0 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-ios-caption font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
                    >
                      Registrar gasto
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    aria-label={`Eliminar "${item.name}"`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:transition-opacity sm:focus:opacity-100 sm:group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
