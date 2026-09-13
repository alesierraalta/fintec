import * as fs from 'fs';
import * as path from 'path';
import { matchReceiptCategory } from '@/lib/ai/receipt-scanner/category-matcher';
import type { CategoryCandidate } from '@/lib/ai/receipt-scanner/types';
import type { ReceiptEvalCase } from '@/evals/receipt-scanner/types';
import { toMinorUnits } from '@/lib/money';

describe('Receipt Scanner Evals & Fiscal Taxonomy Suite', () => {
  const GT_PATH = path.resolve(
    process.cwd(),
    'evals/receipt-scanner/dataset/ground-truth.json'
  );

  const testCategories: CategoryCandidate[] = [
    { id: 'cat-food', name: 'Alimentación y Víveres', kind: 'EXPENSE' },
    { id: 'cat-health', name: 'Salud y Farmacia', kind: 'EXPENSE' },
    { id: 'cat-transport', name: 'Transporte y Combustible', kind: 'EXPENSE' },
    { id: 'cat-services', name: 'Servicios Básicos', kind: 'EXPENSE' },
    { id: 'cat-salary', name: 'Nómina y Salarios', kind: 'INCOME' },
    { id: 'cat-sales', name: 'Ventas y Facturación', kind: 'INCOME' },
  ];

  it('validates ground-truth.json schema contains required fiscal and category fields', () => {
    expect(fs.existsSync(GT_PATH)).toBe(true);
    const rawData = fs.readFileSync(GT_PATH, 'utf8');
    const cases: ReceiptEvalCase[] = JSON.parse(rawData);

    expect(cases.length).toBeGreaterThanOrEqual(30);

    // Verify paper-thermal-pos-01 (Farmacia SENIAT)
    const farmaciaCase = cases.find((c) => c.id === 'paper-thermal-pos-01');
    expect(farmaciaCase).toBeDefined();
    expect(farmaciaCase?.expected.taxAmountMinor).toBe(4480);
    expect(farmaciaCase?.expected.subtotalMinor).toBe(28000);
    expect(farmaciaCase?.expected.taxRate).toBe(16);
    expect(farmaciaCase?.expected.invoiceNumber).toBe('00049281');
    expect(farmaciaCase?.expected.taxId).toBe('J-00020202-1');
    expect(farmaciaCase?.expected.expectedCategoryId).toBe('cat-health');
    expect(farmaciaCase?.candidateCategories).toBeDefined();

    // Verify paper-dual-currency-seniat-01 (Dual Divisas e IGTF)
    const dualCase = cases.find(
      (c) => c.id === 'paper-dual-currency-seniat-01'
    );
    expect(dualCase).toBeDefined();
    expect(dualCase?.expected.subtotalMinor).toBe(2000);
    expect(dualCase?.expected.taxAmountMinor).toBe(320);
    expect(dualCase?.expected.taxRate).toBe(16);
    expect(dualCase?.expected.igtfAmountMinor).toBe(60);
    expect(dualCase?.expected.invoiceNumber).toBe('00084920');
    expect(dualCase?.expected.taxId).toBe('J-40192847-1');
    expect(dualCase?.expected.expectedCategoryId).toBe('cat-food');

    // Verify paper-generic-merchant-groceries-01
    const genericGroceryCase = cases.find(
      (c) => c.id === 'paper-generic-merchant-groceries-01'
    );
    expect(genericGroceryCase).toBeDefined();
    expect(genericGroceryCase?.expected.subtotalMinor).toBe(73000);
    expect(genericGroceryCase?.expected.taxAmountMinor).toBe(12000);
    expect(genericGroceryCase?.expected.invoiceNumber).toBe('00091823');
    expect(genericGroceryCase?.expected.taxId).toBe('J-50192847-9');
    expect(genericGroceryCase?.expected.expectedCategoryId).toBe('cat-food');
  });

  describe('Fiscal Invoice Evaluation Logic', () => {
    it('evaluates exact and minor-unit tolerant subtotal and tax amounts', () => {
      const expectedSubtotalMinor = 28000;
      const expectedTaxMinor = 4480;

      // Actual extraction from OCR
      const actualSubtotal = 280.0;
      const actualTax = 44.8;

      const subtotalMinor = toMinorUnits(actualSubtotal, 'VES');
      const taxMinor = toMinorUnits(actualTax, 'VES');

      expect(
        Math.abs(subtotalMinor - expectedSubtotalMinor)
      ).toBeLessThanOrEqual(2);
      expect(Math.abs(taxMinor - expectedTaxMinor)).toBeLessThanOrEqual(2);
    });

    it('evaluates SENIAT invoice number and RIF normalization', () => {
      const expectedInvoice = '00049281';
      const actualInvoiceRaw = '00049281';
      const expectedRif = 'J-00020202-1';
      const actualRifRaw = 'J000202021';

      expect(actualInvoiceRaw.toLowerCase()).toContain(
        expectedInvoice.toLowerCase()
      );

      const cleanExpectedRif = expectedRif
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const cleanActualRif = actualRifRaw
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      expect(cleanActualRif).toContain(cleanExpectedRif);
    });

    it('evaluates IGTF (3%) tax calculation on dual currency invoice', () => {
      const subtotalUSD = 20.0;
      const ivaUSD = 3.2; // 16%
      const igtfUSD = 0.6; // 3% on $20.00
      const totalUSD = subtotalUSD + ivaUSD + igtfUSD;

      expect(totalUSD).toBe(23.8);

      const igtfMinor = toMinorUnits(igtfUSD, 'USD');
      expect(igtfMinor).toBe(60);
    });
  });

  describe('Automated Category Candidate Resolution on Benchmark Scenarios', () => {
    it('resolves medical and pharmacy invoices to the user health category', () => {
      const match = matchReceiptCategory({
        transactionType: 'EXPENSE',
        merchantOrCounterparty: 'FARMACIA FARMATODO, C.A.',
        suggestedCategoryName: 'Farmacia',
        items: [
          { description: 'ACETAMINOFEN 500MG', totalPrice: 120 },
          { description: 'ALCOHOL 70%', totalPrice: 95 },
        ],
        userCategories: testCategories,
      });

      expect(match.suggestedCategoryId).toBe('cat-health');
      expect(match.suggestedCategoryName).toBe('Salud y Farmacia');
      expect(match.confidence).toBe('HIGH');
    });

    it('resolves supermarket dual-currency invoice to the food category', () => {
      const match = matchReceiptCategory({
        transactionType: 'EXPENSE',
        merchantOrCounterparty: "AUTOMERCADO PLAZA'S C.A.",
        suggestedCategoryName: 'Supermercado',
        items: [
          { description: 'ARROZ PREMIUM 1KG', totalPrice: 5.0 },
          { description: 'ACEITE DE GIRASOL 1L', totalPrice: 9.0 },
          { description: 'POLLO BENEFICIADO 2KG', totalPrice: 6.0 },
        ],
        userCategories: testCategories,
      });

      expect(match.suggestedCategoryId).toBe('cat-food');
      expect(match.suggestedCategoryName).toBe('Alimentación y Víveres');
      expect(match.confidence).toBe('HIGH');
    });

    it('resolves generic merchant receipt by analyzing line items basket', () => {
      const match = matchReceiptCategory({
        transactionType: 'EXPENSE',
        merchantOrCounterparty: 'INVERSIONES Y COMERCIAL 2024 C.A.',
        items: [
          { description: 'HARINA PAN 1KG', totalPrice: 240 },
          { description: 'QUESO BLANCO 500G', totalPrice: 250 },
          { description: 'LECHE ENTERA 1L', totalPrice: 320 },
        ],
        userCategories: testCategories,
      });

      expect(match.suggestedCategoryId).toBe('cat-food');
      expect(match.suggestedCategoryName).toBe('Alimentación y Víveres');
      expect(match.confidence).toBe('HIGH');
    });

    it('strictly isolates income categories when transaction is INCOME', () => {
      const match = matchReceiptCategory({
        transactionType: 'INCOME',
        suggestedMotive: 'Pago de nómina quincenal',
        merchantOrCounterparty: 'EMPRESA TECH C.A.',
        userCategories: testCategories,
      });

      expect(match.suggestedCategoryId).toBe('cat-salary');
      expect(match.suggestedCategoryName).toBe('Nómina y Salarios');
      expect(match.confidence).toBe('HIGH');
    });

    it('strictly isolates sales income when user sells via P2P', () => {
      const match = matchReceiptCategory({
        transactionType: 'INCOME',
        suggestedMotive: 'Venta de criptoactivos USDT',
        merchantOrCounterparty: 'Binance P2P',
        userCategories: testCategories,
      });

      expect(match.suggestedCategoryId).toBe('cat-sales');
      expect(match.suggestedCategoryName).toBe('Ventas y Facturación');
      expect(match.confidence).toBe('HIGH');
    });

    it('never assigns an INCOME category to an EXPENSE transaction', () => {
      const match = matchReceiptCategory({
        transactionType: 'EXPENSE',
        suggestedMotive: 'Honorarios y servicios',
        merchantOrCounterparty: 'Electricidad de Caracas',
        userCategories: testCategories,
      });

      // Must pick the expense category (Servicios Básicos), NEVER the income category (Honorarios)
      expect(match.suggestedCategoryId).toBe('cat-services');
      expect(match.suggestedCategoryName).toBe('Servicios Básicos');
    });
  });
});
