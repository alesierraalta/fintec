'use client';

import type { PaymentOrder } from '@/types/payment-order';
import { UbiiInstructions } from './methods/ubii-instructions';
import { PagoFlashInstructions } from './methods/pagoflash-instructions';
import { BinanceInstructions } from './methods/binance-instructions';
import { LegacyInstructions } from './methods/legacy-instructions';

interface PaymentInstructionsProps {
  order: PaymentOrder;
}

export function PaymentInstructions({ order }: PaymentInstructionsProps) {
  // Strategy Map for instructions
  const renderInstructions = () => {
    switch (order.paymentMethod) {
      case 'ubii':
        return <UbiiInstructions order={order} />;
      case 'pagoflash':
        return <PagoFlashInstructions order={order} />;
      case 'binance_pay':
        return <BinanceInstructions order={order} />;
      default:
        // Legacy support and fallback
        return <LegacyInstructions order={order} />;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {renderInstructions()}
    </div>
  );
}

