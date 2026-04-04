'use client';

import { useState } from 'react';
import { CreditCard, ExternalLink, Smartphone, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/money';
import type { PaymentOrder } from '@/types/payment-order';

interface PagoFlashInstructionsProps {
  order: PaymentOrder;
}

export function PagoFlashInstructions({ order }: PagoFlashInstructionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayNow = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create order with PagoFlash API on the backend
      const response = await fetch(`/api/payment-orders/${order.id}/initiate-pagoflash`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al iniciar el pago con PagoFlash');
      }

      // Redirect to PagoFlash gateway URL
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('URL de pago no recibida');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar el pago. Intenta de nuevo.');
      console.error('[PagoFlash] Error initiating payment:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold">Pago con PagoFlash</h3>
        
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">1. Click en Pagar</h4>
              <p className="text-sm text-muted-foreground">
                Inicia el proceso para pagar <span className="font-semibold text-foreground">{formatCurrency(order.amountMinor, order.currencyCode)}</span> de forma segura.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">2. Completa los datos</h4>
              <p className="text-sm text-muted-foreground">
                PagoFlash permite pagar con Tarjetas de Crédito, Pago Móvil y más.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex gap-2 items-center">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="mt-8">
          <Button 
            className="w-full h-12 text-lg"
            onClick={handlePayNow}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Cargando Pasarela...
              </>
            ) : (
              <>
                Pagar con PagoFlash <ExternalLink className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Serás redirigido a la pasarela segura de PagoFlash.
          </p>
        </div>
      </div>
      
      <div className="rounded-lg bg-blue-500/5 p-4 border border-blue-500/10">
        <p className="text-sm text-center">
          PagoFlash se integra con la mayoría de los bancos venezolanos.
        </p>
      </div>
    </div>
  );
}
