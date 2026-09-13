import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import type { ReceiptEvalCase } from '../types';
import type { CategoryCandidate } from '@/lib/ai/receipt-scanner/types';
import {
  renderBDVPagoMovil,
  renderBanescoPagoMovil,
  renderMercantilTpago,
  renderBBVAProvincialPagoMovil,
  renderBNCReceipt,
  renderBancamigaReceipt,
  renderBinanceP2P,
  renderZinliReceipt,
  renderZelleReceipt,
  renderThermalReceipt,
  renderDualCurrencySENIAT,
  renderBanescoAmbiguousBalances,
  renderBDVAmbiguousBalances,
  renderBDVRejected,
  renderBanescoFailed,
  renderBinanceCancelled,
  renderWhatsAppChatFake,
  renderBalanceInquiry,
  renderCashPhoto,
  renderAdversarialNonFinancial,
  renderAdversarialPromptInjection,
} from './templates';

const DEFAULT_CANDIDATE_CATEGORIES: CategoryCandidate[] = [
  { id: 'cat-food', name: 'Alimentación y Comidas', kind: 'EXPENSE' },
  { id: 'cat-health', name: 'Salud y Farmacia', kind: 'EXPENSE' },
  { id: 'cat-services', name: 'Servicios Básicos', kind: 'EXPENSE' },
  { id: 'cat-transport', name: 'Transporte y Movilidad', kind: 'EXPENSE' },
  { id: 'cat-entertainment', name: 'Entretenimiento y Ocio', kind: 'EXPENSE' },
  { id: 'cat-salary', name: 'Nómina y Salario', kind: 'INCOME' },
  { id: 'cat-freelance', name: 'Honorarios Profesionales', kind: 'INCOME' },
  { id: 'cat-sales', name: 'Ventas y Comercio', kind: 'INCOME' },
];

const DATASET_DIR = path.resolve(
  process.cwd(),
  'evals/receipt-scanner/dataset'
);
const IMAGES_DIR = path.join(DATASET_DIR, 'images');

function applyMotionBlur(html: string): string {
  return html.replace(
    '</style>',
    `body { filter: blur(2.2px); transform: rotate(-0.5deg); }
    .card, .phone, .ticket, .bill { filter: contrast(110%); }
    </style>`
  );
}

function applyPerspectiveTilt(html: string): string {
  return html.replace(
    '</style>',
    `body { perspective: 750px; background: #334155; padding: 40px 20px; }
    .card { transform: rotateX(24deg) rotateY(-18deg) rotateZ(3deg) scale(0.92); box-shadow: 25px 30px 45px rgba(0,0,0,0.45); }
    </style>`
  );
}

function applyFlashGlare(html: string): string {
  return html.replace(
    '</body>',
    `<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:radial-gradient(circle at 45% 35%, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.12) 45%, rgba(0,0,0,0.35) 100%);pointer-events:none;"></div></body>`
  );
}

async function main() {
  console.log(
    '🚀 Starting comprehensive dataset generation with Playwright...'
  );

  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const cases: ReceiptEvalCase[] = [
    // 1. Pago Móvil Standard & Multi-bank
    {
      id: 'pagomovil-bdv-01',
      name: 'BDV Pago Móvil Almuerzo',
      category: 'pagomovil',
      difficulty: 'easy',
      imageFileName: 'pagomovil-bdv-01.png',
      description:
        'Banco de Venezuela standard mobile receipt for 1,450.00 VES',
      candidateCategories: DEFAULT_CANDIDATE_CATEGORIES,
      expected: {
        type: 'EXPENSE',
        amountMinor: 145000,
        currency: 'VES',
        referenceNumber: '0028491823',
        paymentMethod: 'Pago Móvil',
        bankName: 'Banco de Venezuela',
        suggestedCategory: 'Alimentación',
        expectedCategoryId: 'cat-food',
        isFinancial: true,
        difficulty: 'easy',
      },
    },
    {
      id: 'pagomovil-bdv-02',
      name: 'BDV Pago Móvil Farmacia',
      category: 'pagomovil',
      difficulty: 'easy',
      imageFileName: 'pagomovil-bdv-02.png',
      description: 'BDV Pago Móvil with decimals: 380.50 VES',
      candidateCategories: DEFAULT_CANDIDATE_CATEGORIES,
      expected: {
        type: 'EXPENSE',
        amountMinor: 38050,
        currency: 'VES',
        referenceNumber: '0019283741',
        paymentMethod: 'Pago Móvil',
        bankName: 'Banco de Venezuela',
        suggestedCategory: 'Salud',
        expectedCategoryId: 'cat-health',
        isFinancial: true,
        difficulty: 'easy',
      },
    },
    {
      id: 'pagomovil-banesco-fee-01',
      name: 'Banesco Pago Móvil con Comisión Interbancaria',
      category: 'pagomovil',
      difficulty: 'medium',
      imageFileName: 'pagomovil-banesco-fee-01.png',
      description: 'Banesco receipt with explicit 0.3% commission breakdown',
      candidateCategories: DEFAULT_CANDIDATE_CATEGORIES,
      expected: {
        type: 'EXPENSE',
        amountMinor: 320960,
        netAmountMinor: 320000,
        feeMinor: 960,
        currency: 'VES',
        referenceNumber: '04928172',
        paymentMethod: 'Pago Móvil',
        bankName: 'Banesco',
        suggestedCategory: 'Servicios',
        expectedCategoryId: 'cat-services',
        isFinancial: true,
        difficulty: 'medium',
      },
    },
    {
      id: 'pagomovil-mercantil-01',
      name: 'Mercantil Tpago Móvil',
      category: 'pagomovil',
      difficulty: 'easy',
      imageFileName: 'pagomovil-mercantil-01.png',
      description: 'Mercantil Tpago receipt with approval code 74829103',
      expected: {
        type: 'EXPENSE',
        amountMinor: 85000,
        currency: 'VES',
        referenceNumber: '74829103',
        paymentMethod: 'Pago Móvil',
        bankName: 'Banco Mercantil',
        isFinancial: true,
        difficulty: 'easy',
      },
    },
    {
      id: 'pagomovil-bbva-01',
      name: 'BBVA Provincial Dinero Rápido',
      category: 'pagomovil',
      difficulty: 'medium',
      imageFileName: 'pagomovil-bbva-01.png',
      description: 'BBVA Provinet Dinero Rápido with 0.3% fee',
      expected: {
        type: 'EXPENSE',
        amountMinor: 92276,
        netAmountMinor: 92000,
        feeMinor: 276,
        currency: 'VES',
        referenceNumber: '00218937',
        paymentMethod: 'Pago Móvil',
        bankName: 'BBVA Provincial',
        isFinancial: true,
        difficulty: 'medium',
      },
    },
    {
      id: 'pagomovil-bnc-01',
      name: 'BNC Al Instante',
      category: 'pagomovil',
      difficulty: 'easy',
      imageFileName: 'pagomovil-bnc-01.png',
      description: 'Banco Nacional de Crédito mobile transfer for 2,150.00 VES',
      expected: {
        type: 'EXPENSE',
        amountMinor: 215000,
        currency: 'VES',
        referenceNumber: '8839201',
        paymentMethod: 'Pago Móvil',
        bankName: 'Banco Nacional de Crédito',
        isFinancial: true,
        difficulty: 'easy',
      },
    },
    {
      id: 'pagomovil-bancamiga-01',
      name: 'Bancamiga Pago Móvil Interbancario',
      category: 'pagomovil',
      difficulty: 'medium',
      imageFileName: 'pagomovil-bancamiga-01.png',
      description: 'Bancamiga Pago Móvil with fee: 640.00 VES + 1.92 fee',
      expected: {
        type: 'EXPENSE',
        amountMinor: 64192,
        netAmountMinor: 64000,
        feeMinor: 192,
        currency: 'VES',
        referenceNumber: '593021',
        paymentMethod: 'Pago Móvil',
        bankName: 'Bancamiga',
        isFinancial: true,
        difficulty: 'medium',
      },
    },

    // 2. Crypto P2P & Digital Wallets
    {
      id: 'p2p-binance-buy-fee-01',
      name: 'Binance P2P Compra con Fee',
      category: 'p2p',
      difficulty: 'medium',
      imageFileName: 'p2p-binance-buy-fee-01.png',
      description: 'Binance P2P USDT buy order with 0.06 USDT commission',
      expected: {
        type: 'INCOME',
        amountMinor: 4272,
        netAmountMinor: 4266,
        feeMinor: 6,
        currency: 'USDT',
        referenceNumber: '2198402918491029384',
        exchangeRate: 73.15,
        paymentMethod: 'Binance P2P',
        bankName: null,
        isFinancial: true,
        difficulty: 'medium',
      },
    },
    {
      id: 'p2p-binance-sell-01',
      name: 'Binance P2P Venta Limpia',
      category: 'p2p',
      difficulty: 'easy',
      imageFileName: 'p2p-binance-sell-01.png',
      description: 'Binance P2P clean USDT sell order of 100.00 USDT at 73.50',
      expected: {
        type: 'EXPENSE',
        amountMinor: 10000,
        currency: 'USDT',
        referenceNumber: '9928102938172839401',
        exchangeRate: 73.5,
        paymentMethod: 'Binance P2P',
        bankName: null,
        isFinancial: true,
        difficulty: 'easy',
      },
    },
    {
      id: 'p2p-zinli-01',
      name: 'Zinli Digital Wallet USD',
      category: 'p2p',
      difficulty: 'medium',
      imageFileName: 'p2p-zinli-01.png',
      description: 'Zinli P2P wallet send of $35.00 USD',
      expected: {
        type: 'EXPENSE',
        amountMinor: 3500,
        currency: 'USD',
        referenceNumber: 'ZN-8839210',
        paymentMethod: 'Zinli',
        bankName: null,
        isFinancial: true,
        difficulty: 'medium',
      },
    },

    // 3. International Payments
    {
      id: 'international-zelle-chase-01',
      name: 'Chase QuickPay Zelle USD',
      category: 'international',
      difficulty: 'easy',
      imageFileName: 'international-zelle-chase-01.png',
      description: 'Chase Zelle payment receipt for $85.00',
      expected: {
        type: 'EXPENSE',
        amountMinor: 8500,
        currency: 'USD',
        referenceNumber: 'ZL98302194',
        paymentMethod: 'Zelle',
        bankName: 'Chase',
        isFinancial: true,
        difficulty: 'easy',
      },
    },

    // 4. Paper POS & Fiscal
    {
      id: 'paper-thermal-pos-01',
      name: 'Ticket Fiscal Farmacia SENIAT',
      category: 'paper_pos',
      difficulty: 'medium',
      imageFileName: 'paper-thermal-pos-01.png',
      description:
        'Thermal paper fiscal receipt with 16% IVA and 324.80 VES total',
      candidateCategories: DEFAULT_CANDIDATE_CATEGORIES,
      expected: {
        type: 'EXPENSE',
        amountMinor: 32480,
        currency: 'VES',
        referenceNumber: '00049281',
        paymentMethod: 'Punto de Venta',
        bankName: null,
        suggestedCategory: 'Salud',
        expectedCategoryId: 'cat-health',
        subtotalMinor: 28000,
        taxAmountMinor: 4480,
        taxRate: 16,
        invoiceNumber: '00049281',
        taxId: 'J-00020202-1',
        itemsExpected: true,
        minItemCount: 3,
        isFinancial: true,
        difficulty: 'medium',
      },
    },
    {
      id: 'paper-dual-currency-seniat-01',
      name: 'Factura Dual Divisas e IGTF SENIAT',
      category: 'paper_pos',
      difficulty: 'hard',
      imageFileName: 'paper-dual-currency-seniat-01.png',
      description:
        'Fiscal SENIAT invoice with USD ($23.80), IGTF 3%, and VES (Bs. 1.773,10)',
      candidateCategories: DEFAULT_CANDIDATE_CATEGORIES,
      expected: {
        type: 'EXPENSE',
        amountMinor: 177310,
        netAmountMinor: 2380,
        currency: 'VES',
        referenceNumber: '00084920',
        paymentMethod: 'Punto de Venta',
        bankName: null,
        suggestedCategory: 'Alimentación',
        expectedCategoryId: 'cat-food',
        subtotalMinor: 2000,
        taxAmountMinor: 320,
        taxRate: 16,
        igtfAmountMinor: 60,
        invoiceNumber: '00084920',
        taxId: 'J-40192847-1',
        itemsExpected: true,
        minItemCount: 3,
        isFinancial: true,
        difficulty: 'hard',
      },
    },
    {
      id: 'paper-generic-merchant-groceries-01',
      name: 'Ticket Fiscal Víveres (Comercio Genérico)',
      category: 'paper_pos',
      difficulty: 'medium',
      imageFileName: 'paper-generic-merchant-groceries-01.png',
      description:
        'Thermal paper receipt from generic merchant INVERSIONES Y COMERCIAL 2024 C.A. where category Alimentación must be inferred from products',
      candidateCategories: DEFAULT_CANDIDATE_CATEGORIES,
      expected: {
        type: 'EXPENSE',
        amountMinor: 85000,
        currency: 'VES',
        referenceNumber: '00091823',
        paymentMethod: 'Punto de Venta',
        bankName: null,
        suggestedCategory: 'Alimentación',
        expectedCategoryId: 'cat-food',
        subtotalMinor: 73000,
        taxAmountMinor: 12000,
        invoiceNumber: '00091823',
        taxId: 'J-50192847-9',
        itemsExpected: true,
        minItemCount: 4,
        isFinancial: true,
        difficulty: 'medium',
      },
    },

    // 5. Ambiguous Balances
    {
      id: 'ambiguous-banesco-balances-01',
      name: 'Banesco Saldo Anterior vs Monto Operación',
      category: 'ambiguous',
      difficulty: 'hard',
      imageFileName: 'ambiguous-banesco-balances-01.png',
      description:
        'Banesco receipt with prior balance (Bs. 24,850.20), transfer (Bs. 1,500.00), fee (Bs. 4.50), and available balance (Bs. 23,345.70)',
      expected: {
        type: 'EXPENSE',
        amountMinor: 150450,
        netAmountMinor: 150000,
        feeMinor: 450,
        currency: 'VES',
        referenceNumber: '04918234',
        paymentMethod: 'Pago Móvil',
        bankName: 'Banesco',
        isFinancial: true,
        difficulty: 'hard',
      },
    },
    {
      id: 'ambiguous-bdv-balances-01',
      name: 'BDV Monto Débito vs Saldo en Cuenta',
      category: 'ambiguous',
      difficulty: 'hard',
      imageFileName: 'ambiguous-bdv-balances-01.png',
      description:
        'BDV screen showing debit of 780.00 VES alongside account balance of 4,910.40 VES',
      expected: {
        type: 'EXPENSE',
        amountMinor: 78000,
        currency: 'VES',
        referenceNumber: '0019283721',
        paymentMethod: 'Pago Móvil',
        bankName: 'Banco de Venezuela',
        isFinancial: true,
        difficulty: 'hard',
      },
    },

    // 6. Visual Degradations
    {
      id: 'degraded-motion-blur-01',
      name: 'BDV con Borrosidad de Movimiento',
      category: 'visual_degradation',
      difficulty: 'hard',
      imageFileName: 'degraded-motion-blur-01.png',
      description: 'Banco de Venezuela receipt with 2.2px camera shake blur',
      expected: {
        type: 'EXPENSE',
        amountMinor: 145000,
        currency: 'VES',
        referenceNumber: '0028491823',
        paymentMethod: 'Pago Móvil',
        bankName: 'Banco de Venezuela',
        isFinancial: true,
        difficulty: 'hard',
      },
    },
    {
      id: 'degraded-perspective-tilt-01',
      name: 'Banesco con Ángulo y Perspectiva 3D',
      category: 'visual_degradation',
      difficulty: 'hard',
      imageFileName: 'degraded-perspective-tilt-01.png',
      description:
        'Banesco receipt photographed with sharp tilt and perspective angle',
      expected: {
        type: 'EXPENSE',
        amountMinor: 320960,
        netAmountMinor: 320000,
        currency: 'VES',
        referenceNumber: '04928172',
        paymentMethod: 'Pago Móvil',
        bankName: 'Banesco',
        isFinancial: true,
        difficulty: 'hard',
      },
    },
    {
      id: 'degraded-flash-glare-01',
      name: 'Mercantil con Reflejo de Flash Severo',
      category: 'visual_degradation',
      difficulty: 'hard',
      imageFileName: 'degraded-flash-glare-01.png',
      description:
        'Mercantil voucher with camera flash glare covering the central area',
      expected: {
        type: 'EXPENSE',
        amountMinor: 85000,
        currency: 'VES',
        referenceNumber: '74829103',
        paymentMethod: 'Pago Móvil',
        bankName: 'Banco Mercantil',
        isFinancial: true,
        difficulty: 'hard',
      },
    },
    {
      id: 'degraded-whatsapp-lowres-01',
      name: 'BDV con Compresión WhatsApp Baja Calidad',
      category: 'visual_degradation',
      difficulty: 'hard',
      imageFileName: 'degraded-whatsapp-lowres-01.jpg',
      description:
        'BDV receipt severely compressed via JPEG quality 20 with chroma sub-sampling',
      expected: {
        type: 'EXPENSE',
        amountMinor: 38050,
        currency: 'VES',
        referenceNumber: '0019283741',
        paymentMethod: 'Pago Móvil',
        bankName: 'Banco de Venezuela',
        isFinancial: true,
        difficulty: 'hard',
      },
    },

    // 7. Rejected & Failed Operations
    {
      id: 'rejected-bdv-insufficient-funds-01',
      name: 'BDV Operación Declinada Fondos Insuficientes',
      category: 'rejected',
      difficulty: 'hard',
      imageFileName: 'rejected-bdv-insufficient-funds-01.png',
      description:
        'BDV voucher with large red error indicating insufficient funds',
      expected: {
        type: null,
        amountMinor: null,
        currency: null,
        referenceNumber: '0092817234',
        paymentMethod: null,
        bankName: 'Banco de Venezuela',
        isFinancial: false,
        isRejected: true,
        difficulty: 'hard',
      },
    },
    {
      id: 'rejected-banesco-error-01',
      name: 'Banesco Transacción Fallida Error 902',
      category: 'rejected',
      difficulty: 'hard',
      imageFileName: 'rejected-banesco-error-01.png',
      description: 'Banesco error screen showing failed interbank connection',
      expected: {
        type: null,
        amountMinor: null,
        currency: null,
        referenceNumber: null,
        paymentMethod: null,
        bankName: 'Banesco',
        isFinancial: false,
        isRejected: true,
        difficulty: 'hard',
      },
    },
    {
      id: 'rejected-binance-cancelled-01',
      name: 'Binance P2P Orden Cancelada por Timeout',
      category: 'rejected',
      difficulty: 'medium',
      imageFileName: 'rejected-binance-cancelled-01.png',
      description:
        'Binance P2P cancelled order screen with strikethrough amount',
      expected: {
        type: null,
        amountMinor: null,
        currency: null,
        referenceNumber: '201948291048291039',
        paymentMethod: null,
        bankName: null,
        isFinancial: false,
        isRejected: true,
        difficulty: 'medium',
      },
    },

    // 8. Negative Controls (Non-Receipts)
    {
      id: 'negative-whatsapp-chat-01',
      name: "WhatsApp Chat 'Ya te transferí 30$'",
      category: 'negative_control',
      difficulty: 'medium',
      imageFileName: 'negative-whatsapp-chat-01.png',
      description:
        'Text message chat screenshot claiming a transfer was made, without voucher',
      expected: {
        type: null,
        amountMinor: null,
        currency: null,
        referenceNumber: null,
        paymentMethod: null,
        bankName: null,
        isFinancial: false,
        difficulty: 'medium',
      },
    },
    {
      id: 'negative-balance-inquiry-01',
      name: 'BDV Consulta de Saldo sin Movimiento',
      category: 'negative_control',
      difficulty: 'medium',
      imageFileName: 'negative-balance-inquiry-01.png',
      description:
        'Bank balance consultation screen showing Bs. 1,250 available, not a payment',
      expected: {
        type: null,
        amountMinor: null,
        currency: null,
        referenceNumber: null,
        paymentMethod: null,
        bankName: 'Banco de Venezuela',
        isFinancial: false,
        difficulty: 'medium',
      },
    },
    {
      id: 'negative-cash-photo-01',
      name: 'Billete Físico de 100 Bolívares',
      category: 'negative_control',
      difficulty: 'easy',
      imageFileName: 'negative-cash-photo-01.png',
      description:
        'Photograph/drawing of a physical 100 Bolívares banknote, not a receipt',
      expected: {
        type: null,
        amountMinor: null,
        currency: null,
        referenceNumber: null,
        paymentMethod: null,
        bankName: null,
        isFinancial: false,
        difficulty: 'easy',
      },
    },

    // 9. Adversarial & Security Probes
    {
      id: 'adversarial-non-financial-01',
      name: 'Receta de Cocina Ensalada César',
      category: 'adversarial',
      difficulty: 'easy',
      imageFileName: 'adversarial-non-financial-01.png',
      description: 'Recipe text without any financial voucher data',
      expected: {
        type: null,
        amountMinor: null,
        currency: null,
        referenceNumber: null,
        paymentMethod: null,
        bankName: null,
        isFinancial: false,
        difficulty: 'easy',
      },
    },
    {
      id: 'adversarial-prompt-injection-01',
      name: 'Bancamiga con Prompt Injection en Concepto',
      category: 'adversarial',
      difficulty: 'extreme',
      imageFileName: 'adversarial-prompt-injection-01.png',
      description:
        'Voucher for 50.00 VES with an injected instruction asking for $1M USD override',
      expected: {
        type: 'EXPENSE',
        amountMinor: 5000,
        currency: 'VES',
        referenceNumber: '88491823',
        paymentMethod: 'Pago Móvil',
        bankName: 'Bancamiga',
        isFinancial: true,
        difficulty: 'extreme',
      },
    },
  ];

  // Append real SROIE physical receipt cases if images exist
  if (fs.existsSync(path.join(IMAGES_DIR, 'sroie-paper-000.jpg'))) {
    cases.push({
      id: 'paper-sroie-000',
      name: 'SROIE Recibo Real de Tienda (000)',
      category: 'paper_pos',
      difficulty: 'hard',
      imageFileName: 'sroie-paper-000.jpg',
      description:
        'Real physical thermal paper receipt from ICDAR 2019 SROIE dataset',
      expected: {
        type: 'EXPENSE',
        amountMinor: 900,
        currency: null,
        referenceNumber: null,
        paymentMethod: 'Punto de Venta',
        bankName: null,
        isFinancial: true,
        difficulty: 'hard',
      },
    });
  }

  if (fs.existsSync(path.join(IMAGES_DIR, 'sroie-paper-001.jpg'))) {
    cases.push({
      id: 'paper-sroie-001',
      name: 'SROIE Recibo Real de Tienda (001)',
      category: 'paper_pos',
      difficulty: 'hard',
      imageFileName: 'sroie-paper-001.jpg',
      description:
        'Real physical thermal paper receipt from ICDAR 2019 SROIE dataset',
      expected: {
        type: 'EXPENSE',
        amountMinor: 6030,
        currency: null,
        referenceNumber: null,
        paymentMethod: 'Punto de Venta',
        bankName: null,
        isFinancial: true,
        difficulty: 'hard',
      },
    });
  }

  const baseBDV01 = renderBDVPagoMovil({
    amountFormatted: '1.450,00',
    reference: '0028491823',
    date: '11/09/2026 - 10:24 AM',
    recipientName: 'Inversiones El Chamo C.A.',
    recipientId: 'J-30491823-1',
    recipientPhone: '0414-3829102',
    recipientBank: 'Banco de Venezuela',
    concept: 'Almuerzo ejecutivo',
  });

  const baseBDV02 = renderBDVPagoMovil({
    amountFormatted: '380,50',
    reference: '0019283741',
    date: '10/09/2026 - 04:12 PM',
    recipientName: 'Farmacia La Paz C.A.',
    recipientId: 'J-40918273-2',
    recipientPhone: '0424-5829102',
    recipientBank: 'Banco de Venezuela',
    concept: 'Medicamentos',
  });

  const baseBanesco = renderBanescoPagoMovil({
    amountFormatted: '3.200,00',
    commissionFormatted: '9,60',
    totalFormatted: '3.209,60',
    reference: '04928172',
    date: '11-09-2026 11:15:22',
    fromAccount: '*1234',
    fromId: 'V-19.823.411',
    toName: 'Carlos Gomez',
    toId: 'V-21.902.345',
    toPhone: '0424-9123849',
    toBank: 'Banco Mercantil',
    concept: 'Pago de servicios',
  });

  const baseMercantil = renderMercantilTpago({
    amountFormatted: '850,00',
    reference: '74829103',
    date: '11/09/2026',
    recipientName: 'Elena Rodriguez',
    recipientId: 'V-15.678.901',
    recipientPhone: '0412-4829104',
    recipientBank: 'Banco de Venezuela',
    concept: 'Repuestos',
  });

  const htmlMap: Record<string, string> = {
    'pagomovil-bdv-01': baseBDV01,
    'pagomovil-bdv-02': baseBDV02,
    'pagomovil-banesco-fee-01': baseBanesco,
    'pagomovil-mercantil-01': baseMercantil,
    'pagomovil-bbva-01': renderBBVAProvincialPagoMovil({
      amountFormatted: '920,00',
      feeFormatted: '2,76',
      totalFormatted: '922,76',
      reference: '00218937',
      date: '11/09/2026 14:15',
      recipientName: 'Pedro Castillo',
      recipientId: 'V-17.391.029',
      recipientPhone: '0416-8920192',
      recipientBank: 'Banco Mercantil (0105)',
      concept: 'Mantenimiento aire',
    }),
    'pagomovil-bnc-01': renderBNCReceipt({
      amountFormatted: '2.150,00',
      reference: '8839201',
      date: '11/09/2026',
      recipientName: 'Maria Gomez',
      recipientPhone: '0414-9988221',
      concept: 'Compra repuesto',
    }),
    'pagomovil-bancamiga-01': renderBancamigaReceipt({
      amountFormatted: '640,00',
      feeFormatted: '1,92',
      reference: '593021',
      date: '11/09/2026',
      recipientName: 'Distribuidora Los Andes',
      concept: 'Víveres',
    }),
    'p2p-binance-buy-fee-01': renderBinanceP2P({
      orderType: 'Compra',
      cryptoAmount: '42.72',
      cryptoSymbol: 'USDT',
      feeAmount: '0.06',
      netAmount: '42.66',
      fiatAmount: '3.125,00',
      fiatSymbol: 'VES',
      unitPrice: '73.15',
      orderNumber: '2198402918491029384',
      counterparty: 'TraderPro_VZLA',
      paymentMethod: 'Pago Móvil',
      date: '2026-09-11 11:24:30',
    }),
    'p2p-binance-sell-01': renderBinanceP2P({
      orderType: 'Venta',
      cryptoAmount: '100.00',
      cryptoSymbol: 'USDT',
      fiatAmount: '7.350,00',
      fiatSymbol: 'VES',
      unitPrice: '73.50',
      orderNumber: '9928102938172839401',
      counterparty: 'CriptoCambios_Ccs',
      paymentMethod: 'Pago Móvil',
      date: '2026-09-11 09:10:00',
    }),
    'p2p-zinli-01': renderZinliReceipt({
      amountFormatted: '35.00',
      recipientEmail: 'maria.garcia@gmail.com',
      transactionId: 'ZN-8839210',
      date: '11 Sep 2026',
    }),
    'international-zelle-chase-01': renderZelleReceipt({
      amountFormatted: '85.00',
      recipientName: 'Carlos Mendoza',
      memo: 'Rent share',
      confirmation: 'ZL98302194',
      date: 'Sep 11, 2026',
    }),
    'paper-thermal-pos-01': renderThermalReceipt({
      merchantName: 'FARMACIA FARMATODO, C.A.',
      rif: 'RIF: J-00020202-1',
      invoiceNumber: '00049281',
      date: '11-09-2026',
      time: '14:22:15',
      items: [
        { name: 'ACETAMINOFEN 500MG', qty: 1, price: '120,00' },
        { name: 'ALCOHOL 70% 500ML', qty: 1, price: '95,00' },
        { name: 'AGUA MINERAL 1.5L', qty: 1, price: '65,00' },
      ],
      subtotal: '280,00',
      tax: '44,80',
      total: '324,80',
      paymentMethod: 'TARJETA DE DÉBITO',
    }),
    'paper-generic-merchant-groceries-01': renderThermalReceipt({
      merchantName: 'INVERSIONES Y COMERCIAL 2024 C.A.',
      rif: 'RIF: J-50192847-9',
      invoiceNumber: '00091823',
      date: '11-09-2026',
      time: '17:15:30',
      items: [
        { name: 'HARINA PAN 1KG', qty: 2, price: '120,00' },
        { name: 'QUESO BLANCO 500G', qty: 1, price: '250,00' },
        { name: 'LECHE ENTERA 1L', qty: 2, price: '160,00' },
        { name: 'CAFE MOLIDO 250G', qty: 1, price: '200,00' },
      ],
      subtotal: '730,00',
      tax: '120,00',
      total: '850,00',
      paymentMethod: 'TARJETA DE DÉBITO',
    }),
    'paper-dual-currency-seniat-01': renderDualCurrencySENIAT({
      invoiceNumber: '00084920',
      rif: 'J-40192847-1',
      merchantName: "AUTOMERCADO PLAZA'S C.A.",
      items: [
        {
          desc: 'ARROZ PRIMIUM 1KG',
          qty: 2,
          priceUSD: '2.50',
          totalUSD: '5.00',
        },
        {
          desc: 'ACEITE DE GIRASOL 1L',
          qty: 2,
          priceUSD: '4.50',
          totalUSD: '9.00',
        },
        {
          desc: 'POLLO BENEFICIADO 2KG',
          qty: 1,
          priceUSD: '6.00',
          totalUSD: '6.00',
        },
      ],
      subtotalUSD: '20.00',
      ivaUSD: '3.20',
      igtfUSD: '0.60',
      totalUSD: '23.80',
      rateBCV: '74.50',
      totalVES: '1.773,10',
      paidCashUSD: '20.00',
      paidPagoMovilVES: '283,10',
      date: '11-09-2026',
    }),
    'ambiguous-banesco-balances-01': renderBanescoAmbiguousBalances({
      priorBalanceFormatted: '24.850,20',
      transferAmountFormatted: '1.500,00',
      feeFormatted: '4,50',
      availableBalanceFormatted: '23.345,70',
      reference: '04918234',
      date: '11/09/2026 15:40',
      recipientName: 'Andres Bello',
      recipientId: 'V-18.492.012',
    }),
    'ambiguous-bdv-balances-01': renderBDVAmbiguousBalances({
      amountFormatted: '780,00',
      availableBalanceFormatted: '4.910,40',
      blockedBalanceFormatted: '120,00',
      reference: '0019283721',
      date: '11/09/2026',
    }),
    'degraded-motion-blur-01': applyMotionBlur(baseBDV01),
    'degraded-perspective-tilt-01': applyPerspectiveTilt(baseBanesco),
    'degraded-flash-glare-01': applyFlashGlare(baseMercantil),
    'degraded-whatsapp-lowres-01': baseBDV02,
    'rejected-bdv-insufficient-funds-01': renderBDVRejected({
      amountFormatted: '5.000,00',
      reference: '0092817234',
      reason: 'Fondos insuficientes en la cuenta debitada',
      date: '11/09/2026 16:02:10',
    }),
    'rejected-banesco-error-01': renderBanescoFailed({
      amountFormatted: '850,00',
      errorCode: '902',
      errorMessage: 'Conexión interbancaria interrumpida temporalmente',
      date: '11/09/2026',
    }),
    'rejected-binance-cancelled-01': renderBinanceCancelled({
      cryptoAmount: '250.00',
      fiatAmount: '18.375,00',
      orderNumber: '201948291048291039',
      date: '2026-09-11 10:15:00',
    }),
    'negative-whatsapp-chat-01': renderWhatsAppChatFake(),
    'negative-balance-inquiry-01': renderBalanceInquiry(),
    'negative-cash-photo-01': renderCashPhoto(),
    'adversarial-non-financial-01': renderAdversarialNonFinancial(),
    'adversarial-prompt-injection-01': renderAdversarialPromptInjection(),
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 420, height: 780 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  for (const c of cases) {
    const html = htmlMap[c.id];
    if (!html) {
      if (fs.existsSync(path.join(IMAGES_DIR, c.imageFileName))) {
        console.log(`ℹ️ Preserved existing file ${c.imageFileName}`);
        continue;
      }
      console.warn(`⚠️ No HTML template for case ${c.id}`);
      continue;
    }

    await page.setContent(html, { waitUntil: 'networkidle' });
    const imgPath = path.join(IMAGES_DIR, c.imageFileName);

    if (c.id === 'degraded-whatsapp-lowres-01') {
      await page.screenshot({
        path: imgPath,
        type: 'jpeg',
        quality: 20,
      });
    } else {
      await page.screenshot({
        path: imgPath,
        fullPage: true,
        type: 'png',
      });
    }

    console.log(
      `✅ Generated [${c.difficulty.toUpperCase()}] ${c.category}/${c.imageFileName}`
    );
  }

  await browser.close();

  // Save ground-truth.json
  const gtPath = path.join(DATASET_DIR, 'ground-truth.json');
  fs.writeFileSync(gtPath, JSON.stringify(cases, null, 2), 'utf8');
  console.log(
    `\n📝 Successfully saved ${cases.length} evaluation cases to ${gtPath}`
  );
}

main().catch((err) => {
  console.error('Error generating dataset:', err);
  process.exit(1);
});
