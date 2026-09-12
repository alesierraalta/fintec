import { receiptExtractionSchema } from '@/lib/ai/receipt-scanner/scanner-service';

describe('receiptExtractionSchema', () => {
  it('validates a typical Venezuelan Pago Móvil expense receipt', () => {
    const rawData = {
      type: 'EXPENSE',
      confidence: 'HIGH',
      amount: 1250.75,
      currency: 'VES',
      date: '2026-09-11',
      time: '14:32',
      referenceId: '0987654321',
      paymentMethod: 'Pago Móvil',
      bankOrPlatform: 'Banesco',
      counterpartyName: 'Comercializadora Los Andes',
      counterpartyId: 'J-123456789',
      counterpartyPhone: '0414-1234567',
      suggestedMotive: 'Compra de víveres',
      suggestedCategory: 'Alimentación',
      tags: ['pago-movil', 'banesco', 'alimentos'],
    };

    const parsed = receiptExtractionSchema.safeParse(rawData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe('EXPENSE');
      expect(parsed.data.amount).toBe(1250.75);
      expect(parsed.data.referenceId).toBe('0987654321');
    }
  });

  it('validates a Pago Móvil income receipt', () => {
    const rawData = {
      type: 'INCOME',
      confidence: 'HIGH',
      amount: 3500.0,
      currency: 'VES',
      date: '2026-09-10',
      referenceId: 'REF-12345',
      paymentMethod: 'Pago Móvil',
      bankOrPlatform: 'Banco de Venezuela',
      counterpartyName: 'Carlos Mendoza',
      suggestedMotive: 'Pago de servicio técnico',
    };

    const parsed = receiptExtractionSchema.safeParse(rawData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe('INCOME');
      expect(parsed.data.amount).toBe(3500.0);
    }
  });

  it('validates a Binance P2P exchange screenshot as TRANSFER', () => {
    const rawData = {
      type: 'TRANSFER',
      confidence: 'HIGH',
      amount: 50.0,
      currency: 'USDT',
      targetAmount: 1825.0,
      targetCurrency: 'VES',
      exchangeRate: 36.5,
      date: '2026-09-11',
      referenceId: '202609110827391823',
      paymentMethod: 'Binance P2P',
      bankOrPlatform: 'Binance',
      counterpartyName: 'P2P Trader Pro',
      suggestedMotive: 'Venta de USDT por Bolívares',
      tags: ['binance-p2p', 'usdt', 'ves'],
    };

    const parsed = receiptExtractionSchema.safeParse(rawData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe('TRANSFER');
      expect(parsed.data.amount).toBe(50.0);
      expect(parsed.data.targetAmount).toBe(1825.0);
      expect(parsed.data.exchangeRate).toBe(36.5);
    }
  });

  it('validates a Binance P2P order screenshot with explicit fee and release quantity', () => {
    const rawData = {
      type: 'TRANSFER',
      confidence: 'HIGH',
      amount: 42.72,
      currency: 'USDT',
      targetAmount: 41000.0,
      targetCurrency: 'VES',
      exchangeRate: 961.05,
      fee: 0.06,
      feeCurrency: 'USDT',
      netAmount: 42.66,
      date: '2026-09-02',
      time: '09:29',
      referenceId: '22928458552938688512',
      paymentMethod: 'Binance P2P',
      bankOrPlatform: 'Binance',
      counterpartyBank: 'Mercantil',
      counterpartyName: 'GLOBAL_STEPHANIE_SPA',
      suggestedMotive: 'Sell USDT for VES',
      tags: ['binance-p2p', 'usdt', 'ves', 'mercantil'],
    };

    const parsed = receiptExtractionSchema.safeParse(rawData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe('TRANSFER');
      expect(parsed.data.amount).toBe(42.72);
      expect(parsed.data.targetAmount).toBe(41000.0);
      expect(parsed.data.exchangeRate).toBe(961.05);
      expect(parsed.data.fee).toBe(0.06);
      expect(parsed.data.feeCurrency).toBe('USDT');
      expect(parsed.data.netAmount).toBe(42.66);
      expect(parsed.data.referenceId).toBe('22928458552938688512');
    }
  });

  it('validates an itemized supermarket/grocery purchase with line items and basket category inference', () => {
    const rawData = {
      type: 'EXPENSE',
      confidence: 'HIGH',
      amount: 850.0,
      currency: 'VES',
      date: '2026-09-11',
      time: '17:15',
      referenceId: '00091823',
      paymentMethod: 'Punto de Venta',
      counterpartyName: 'INVERSIONES Y COMERCIAL 2024 C.A.',
      counterpartyId: 'J-50192847-9',
      suggestedMotive:
        'Mercado en INVERSIONES Y COMERCIAL 2024 C.A. (4 artículos)',
      suggestedCategory: 'Alimentación',
      items: [
        {
          description: 'HARINA PAN 1KG',
          quantity: 2,
          unitPrice: 60.0,
          totalPrice: 120.0,
        },
        {
          description: 'QUESO BLANCO 500G',
          quantity: 1,
          unitPrice: 250.0,
          totalPrice: 250.0,
        },
        {
          description: 'LECHE ENTERA 1L',
          quantity: 2,
          unitPrice: 80.0,
          totalPrice: 160.0,
        },
        {
          description: 'CAFE MOLIDO 250G',
          quantity: 1,
          unitPrice: 200.0,
          totalPrice: 200.0,
        },
      ],
      tags: ['punto-de-venta', 'factura-detallada', 'comprobante-ia'],
    };

    const parsed = receiptExtractionSchema.safeParse(rawData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe('EXPENSE');
      expect(parsed.data.suggestedCategory).toBe('Alimentación');
      expect(parsed.data.items).toHaveLength(4);
      expect(parsed.data.items[0]).toEqual({
        description: 'HARINA PAN 1KG',
        quantity: 2,
        unitPrice: 60.0,
        totalPrice: 120.0,
      });
      expect(parsed.data.suggestedMotive).toContain('Mercado');
    }
  });

  it('accepts null and zero values for line item quantity, unitPrice, and totalPrice', () => {
    const rawData = {
      type: 'EXPENSE',
      amount: 100.0,
      currency: 'VES',
      date: '2026-09-11',
      items: [
        {
          description: 'Promo Item',
          quantity: null,
          unitPrice: 0,
          totalPrice: 0,
        },
        {
          description: 'Unspecified Item',
          quantity: 1,
          unitPrice: null,
          totalPrice: null,
        },
      ],
    };

    const parsed = receiptExtractionSchema.safeParse(rawData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items).toHaveLength(2);
      expect(parsed.data.items[0]).toEqual({
        description: 'Promo Item',
        quantity: null,
        unitPrice: 0,
        totalPrice: 0,
      });
      expect(parsed.data.items[1]).toEqual({
        description: 'Unspecified Item',
        quantity: 1,
        unitPrice: null,
        totalPrice: null,
      });
    }
  });

  it('rejects negative prices or zero quantity in line items', () => {
    const invalidData = {
      type: 'EXPENSE',
      amount: 100.0,
      currency: 'VES',
      date: '2026-09-11',
      items: [
        {
          description: 'Invalid Item',
          quantity: 0, // Must be positive if provided
          unitPrice: -5.0, // Must be non-negative
        },
      ],
    };

    const parsed = receiptExtractionSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });
});
