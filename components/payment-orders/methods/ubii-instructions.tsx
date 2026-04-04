'use client';

import { ExternalLink, Smartphone, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/money';
import type { PaymentOrder } from '@/types/payment-order';

interface UbiiInstructionsProps {
  order: PaymentOrder;
}

export function UbiiInstructions({ order }: UbiiInstructionsProps) {
  // Normally the user would provide their Ubii Link in settings
  // For now we use a placeholder or check if there's one in env
  const UBII_LINK = process.env.NEXT_PUBLIC_UBII_LINK || 'https://link.ubii.com/pay/fintec';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold">Pago con Ubii</h3>
        
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">1. Abre el Link de Ubii</h4>
              <p className="text-sm text-muted-foreground">
                Haz clic en el botón de abajo para ir a la plataforma segura de Ubii.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">2. Realiza el Pago</h4>
              <p className="text-sm text-muted-foreground">
                Paga un total de <span className="font-semibold text-foreground">{formatCurrency(order.amountMinor, order.currencyCode)}</span> usando Pago Móvil o Tarjeta.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Button 
            className="w-full h-12 text-lg"
            onClick={() => window.open(UBII_LINK, '_blank')}
          >
            Pagar con Ubii <ExternalLink className="ml-2 h-5 w-5" />
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Serás redirigido a una plataforma externa segura.
          </p>
        </div>
      </div>
      
      <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
        <p className="text-sm text-center">
          Una vez realizado el pago, recuerda subir el comprobante abajo.
        </p>
      </div>
    </div>
  );
}
