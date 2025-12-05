'use client';

import { CheckCircle2, Smartphone, ArrowRight, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '@/lib/money';
import type { PaymentOrder } from '@/types/payment-order';

interface PaymentInstructionsProps {
  order: PaymentOrder;
}

// Account information for Mercantil Banco (this should be configurable)
const MERCHANT_ACCOUNT = {
  accountNumber: '0105-0123-45-1234567890', // Example - should be in env
  accountType: 'Corriente',
  bankName: 'Banco Mercantil',
};

export function PaymentInstructions({ order }: PaymentInstructionsProps) {
  const [copied, setCopied] = useState(false);

  // Generate unique payment reference
  const paymentReference = `ORD-${order.id.substring(0, 8).toUpperCase()}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Failed to copy - silent fail
    }
  };

  const steps = [
    {
      number: 1,
      title: 'Abre la app de Mercantil Banco',
      description: 'Inicia sesión en tu aplicación móvil de Mercantil Banco',
      icon: Smartphone,
    },
    {
      number: 2,
      title: 'Realiza la transferencia',
      description: `Transfiere ${formatCurrency(order.amountMinor, order.currencyCode)} a la cuenta indicada`,
      icon: ArrowRight,
    },
    {
      number: 3,
      title: 'Copia la referencia de pago',
      description: 'Usa esta referencia única en el concepto de la transferencia',
      icon: Copy,
    },
    {
      number: 4,
      title: 'Sube el comprobante',
      description: 'Después de realizar el pago, sube una foto del comprobante',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold">Instrucciones de Pago</h3>
        
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold">Información de la Cuenta</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm text-muted-foreground">Banco:</span>
            <span className="font-medium">{MERCHANT_ACCOUNT.bankName}</span>
          </div>
          
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm text-muted-foreground">Número de Cuenta:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium">{MERCHANT_ACCOUNT.accountNumber}</span>
              <button
                onClick={() => copyToClipboard(MERCHANT_ACCOUNT.accountNumber)}
                className="rounded p-1 hover:bg-muted"
                title="Copiar número de cuenta"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm text-muted-foreground">Tipo de Cuenta:</span>
            <span className="font-medium">{MERCHANT_ACCOUNT.accountType}</span>
          </div>
          
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm text-muted-foreground">Monto:</span>
            <span className="font-semibold text-primary">
              {formatCurrency(order.amountMinor, order.currencyCode)}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6">
        <h3 className="mb-2 text-lg font-semibold">Referencia de Pago</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Copia esta referencia y úsala en el concepto de la transferencia
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-background p-3">
          <code className="flex-1 font-mono text-sm font-semibold">
            {paymentReference}
          </code>
          <button
            onClick={() => copyToClipboard(paymentReference)}
            className="rounded p-2 hover:bg-muted"
            title="Copiar referencia"
          >
            {copied ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

