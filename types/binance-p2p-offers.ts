export const BINANCE_P2P_SIDES = ['BUY', 'SELL'] as const;

export type BinanceP2PSide = (typeof BINANCE_P2P_SIDES)[number];

export const BINANCE_P2P_AMOUNT_UNITS = ['VES', 'USDT'] as const;

export type BinanceP2PAmountUnit = (typeof BINANCE_P2P_AMOUNT_UNITS)[number];

export const BINANCE_P2P_PAYMENT_IDENTIFIERS = [
  'ALL',
  'PagoMovil',
  'BANK',
  'BancoDeVenezuela',
  'Banesco',
  'Mercantil',
  'Provincial',
  'Bancamiga',
  'Bancaribe',
  'BancoActivo',
  'BancoDelTesoro',
  'BBVABank',
  'BNCBancoNacional',
] as const;

export type BinanceP2PPaymentIdentifier =
  (typeof BINANCE_P2P_PAYMENT_IDENTIFIERS)[number];

export const BINANCE_P2P_PAYMENT_LABELS: Record<
  BinanceP2PPaymentIdentifier,
  string
> = {
  ALL: 'Todos los métodos',
  PagoMovil: 'Pago Móvil',
  BANK: 'Transferencia bancaria',
  BancoDeVenezuela: 'Banco de Venezuela',
  Banesco: 'Banesco',
  Mercantil: 'Mercantil',
  Provincial: 'BBVA Provincial',
  Bancamiga: 'Bancamiga',
  Bancaribe: 'Bancaribe',
  BancoActivo: 'Banco Activo',
  BancoDelTesoro: 'Banco del Tesoro',
  BBVABank: 'BBVA',
  BNCBancoNacional: 'BNC Banco Nacional',
};

export const BINANCE_P2P_MIN_AMOUNT_MINOR = 100;
export const BINANCE_P2P_MAX_AMOUNT_MINOR = 100_000_000_000;
export const BINANCE_P2P_MARKET_URL =
  'https://p2p.binance.com/en/trade/all-payments/USDT?fiat=VES';

/** Direct link to one exact advertisement; `advNo` is used only as its code. */
export function buildBinanceP2PTradeUrl(advNo: string): string {
  return `https://c2c.binance.com/en/adv?code=${encodeURIComponent(advNo)}`;
}

/** Direct link to a seller profile; `userNo` is never treated as an ad number. */
export function buildBinanceP2PSellerProfileUrl(userNo: string): string {
  return `https://c2c.binance.com/en/advertiserDetail?advertiserNo=${encodeURIComponent(userNo)}`;
}

export interface BinanceP2POffersQuery {
  side: BinanceP2PSide;
  amountMinor: number;
  amountUnit?: BinanceP2PAmountUnit;
  paymentMethod: BinanceP2PPaymentIdentifier;
  minCompletionRateBps?: number;
  minOrderCount?: number;
}

export interface BinanceP2PExactQuantity {
  value: string;
  scale: number;
}

export interface BinanceP2PPaymentMethod {
  identifier: string;
  name: string;
}

export interface BinanceP2PMerchant {
  nickname: string;
  userNo: string;
  monthOrderCount: number;
  monthCompletionRateBps: number | null;
  positiveRateBps: number | null;
}

export interface BinanceP2POffer {
  id: string;
  advertiserSide: BinanceP2PSide;
  priceMinor: number;
  availableQuantity: BinanceP2PExactQuantity;
  minFiatMinor: number;
  maxFiatMinor: number;
  paymentMethods: BinanceP2PPaymentMethod[];
  payTimeLimitMinutes: number | null;
  merchant: BinanceP2PMerchant;
}

export type BinanceP2POffersStatus = 'live' | 'empty' | 'stale' | 'unavailable';

export interface BinanceP2POffersResult {
  status: BinanceP2POffersStatus;
  query: BinanceP2POffersQuery;
  offers: BinanceP2POffer[];
  fetchedAt: string | null;
}
