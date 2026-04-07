'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, Loader2, QrCode, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import type { Order } from '@/types/order';

interface CheckoutBinanceProps {
  amount: string;
  serviceName: string;
  binanceId?: string;
  qrCodeSrc?: string;
  onPaid?: (order: Order) => void;
}

type CheckoutState = 'idle' | 'submitting' | 'verifying' | 'paid';

function mapRealtimeOrder(row: any): Order {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    serviceName: row.serviceName ?? row.service_name,
    amount: String(row.amount),
    senderReference: row.senderReference ?? row.sender_reference,
    status: row.status,
    createdAt: row.createdAt ?? row.created_at,
  };
}

export function CheckoutBinance({
  amount,
  serviceName,
  binanceId = process.env.NEXT_PUBLIC_BINANCE_PAY_ID || '287654321',
  qrCodeSrc = '/binance-pay-qr.svg',
  onPaid,
}: CheckoutBinanceProps) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<CheckoutState>('idle');
  const [senderReference, setSenderReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);

  function markOrderPaid(order: Order) {
    setCreatedOrder(order);
    setState('paid');
    setError(null);
    onPaid?.(order);
  }

  async function fetchOrderSnapshot(orderId: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('No autenticado');
    }

    const response = await fetch(`/api/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'No se pudo verificar la orden.');
    }

    return result.data as Order;
  }

  useEffect(() => {
    if (!createdOrder || state !== 'verifying') {
      return;
    }

    const channel = supabase
      .channel(`orders:${createdOrder.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${createdOrder.id}`,
        },
        (payload) => {
          const nextOrder = mapRealtimeOrder(payload.new);

          if (nextOrder.status === 'paid') {
            markOrderPaid(nextOrder);
          }
        }
      )
      .subscribe(async (status) => {
        const shouldRefetchSnapshot =
          status === 'SUBSCRIBED' ||
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED';

        if (!shouldRefetchSnapshot) {
          return;
        }

        try {
          const snapshot = await fetchOrderSnapshot(createdOrder.id);

          if (snapshot.status === 'paid') {
            markOrderPaid(snapshot);
            return;
          }

          if (status !== 'SUBSCRIBED') {
            setError(
              'No pudimos activar la verificación en tiempo real. Revisá el estado manualmente en unos segundos.'
            );
          }
        } catch (refetchError: any) {
          setError(refetchError.message || 'No se pudo verificar la orden.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [createdOrder, onPaid, state, supabase]);

  async function handleCopyBinanceId() {
    await navigator.clipboard.writeText(binanceId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!senderReference) {
      setError('La referencia del remitente es obligatoria.');
      return;
    }

    setError(null);
    setState('submitting');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No autenticado');
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          serviceName,
          amount,
          senderReference,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'No se pudo crear la orden.');
      }

      setCreatedOrder(result.data as Order);
      setState(result.data.status === 'paid' ? 'paid' : 'verifying');
    } catch (submitError: any) {
      setState('idle');
      setError(submitError.message || 'No se pudo crear la orden.');
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-lg">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Checkout Binance Pay</h2>
        <p className="text-sm text-muted-foreground">
          Enviá exactamente{' '}
          <span className="font-semibold text-foreground">{amount}</span> para{' '}
          {serviceName}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-4">
          <img
            src={qrCodeSrc}
            alt="QR de Binance Pay"
            className="h-44 w-44 rounded-xl object-contain"
          />
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <QrCode className="h-4 w-4" />
            QR estático
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Binance ID
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <code className="text-lg font-bold">{binanceId}</code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyBinanceId}
              >
                {copied ? 'Copiado' : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm">
            <p className="font-medium">Importante</p>
            <p className="mt-1 text-muted-foreground">
              Pagá el monto exacto mostrado y cargá la referencia real del
              remitente para que podamos verificar tu pago.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
              <p className="text-muted-foreground">
                Apenas confirmes, nos suscribimos solamente a la orden creada
                para detectar cuando pase a <code>paid</code>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {state === 'paid' ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h3 className="mt-3 text-lg font-semibold">Pago confirmado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu orden ya fue marcada como paid.
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            type="text"
            label="Referencia del remitente"
            placeholder="Ej: BINANCE-REF-123"
            value={senderReference}
            onChange={(event) => setSenderReference(event.target.value)}
            required
            error={error || undefined}
          />

          {state === 'verifying' && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verificando pago...</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={state === 'submitting'}
            disabled={state === 'verifying' || senderReference.length === 0}
            className="w-full"
          >
            Confirmar Pago
          </Button>
        </form>
      )}
    </div>
  );
}
