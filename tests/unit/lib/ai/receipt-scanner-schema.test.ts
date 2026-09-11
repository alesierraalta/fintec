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
});
