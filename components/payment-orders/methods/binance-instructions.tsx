'use client';

import { useState } from 'react';
import { Smartphone, QrCode, Copy, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/money';
import type { PaymentOrder } from '@/types/payment-order';

interface BinanceInstructionsProps {
  order: PaymentOrder;
}

export function BinanceInstructions({ order }: BinanceInstructionsProps) {
  const [copied, setCopied] = useState(false);
  
  // Binance ID placeholder or from env
  const BINANCE_ID = process.env.NEXT_PUBLIC_BINANCE_PAY_ID || '123456789';
  
  // Logic to calculate estimated USDT (VES has 2 decimals, so order.amountMinor / 100)
  // To reach a real USDT amount, we need the exchange rate. 
  // For now let's assume a static rate or just show the ID to pay.
  const rate = 65.50; // Dynamic rate integration would be better
  const estimatedUSDT = (order.amountMinor / 100 / rate).toFixed(2);

  const handleCopy = () => {
    navigator.clipboard.writeText(BINANCE_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <QrCode className="h-24 w-24" />
        </div>

        <h3 className="mb-4 text-lg font-semibold">Pago con Binance Pay</h3>
        
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">1. Abre tu App de Binance</h4>
              <p className="text-sm text-muted-foreground">
                Ve a Binance Pay y selecciona "Enviar".
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500">
              <Copy className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">2. Ingresa el Binance ID</h4>
              <p className="text-sm text-muted-foreground">
                Usa el ID de abajo para realizar el envío.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-4 border border-border/50">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Binance ID:</span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-mono font-bold text-foreground">{BINANCE_ID}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCopy}
                className="h-8 w-8 p-0"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-xl bg-yellow-500/5 p-4 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-600">
              <Info className="h-4 w-4" />
              <span className="text-xs font-semibold">Monto Estimado:</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-foreground">
                {estimatedUSDT} <span className="text-sm">USDT</span>
              </span>
              <span className="text-xs text-muted-foreground">
                Calculado a Bs. {rate.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="rounded-lg bg-yellow-500/5 p-4 border border-yellow-500/10 text-center">
        <p className="text-sm">
          Recuerda subir el comprobante de Binance Pay abajo para procesar tu orden.
        </p>
      </div>
    </div>
  );
}
