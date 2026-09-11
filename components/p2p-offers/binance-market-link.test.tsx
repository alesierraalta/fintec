import { buildBinanceAppDeepLink } from './binance-market-link';
import { buildBinanceP2PTradeUrl } from '@/types/binance-p2p-offers';

describe('buildBinanceAppDeepLink', () => {
  it('wraps the HTTPS market URL in Binance’s mobile webview link', () => {
    const webUrl =
      'https://p2p.binance.com/en/trade/all-payments/USDT?fiat=VES';

    expect(buildBinanceAppDeepLink(webUrl)).toBe(
      `bnc://app.binance.com/webview/webview?type=default&url=${encodeURIComponent(window.btoa(webUrl))}`
    );
  });
});

describe('buildBinanceP2PTradeUrl', () => {
  it('targets the exact advertisement via advNo', () => {
    expect(buildBinanceP2PTradeUrl('adv/seller with spaces')).toBe(
      'https://c2c.binance.com/en/adv?code=adv%2Fseller%20with%20spaces'
    );
  });
});

describe('buildBinanceP2PSellerProfileUrl', () => {
  it('uses userNo in the seller profile route and encodes it', async () => {
    const { buildBinanceP2PSellerProfileUrl } = await import(
      '@/types/binance-p2p-offers'
    );
    expect(buildBinanceP2PSellerProfileUrl('seller/with spaces')).toBe(
      'https://c2c.binance.com/en/advertiserDetail?advertiserNo=seller%2Fwith%20spaces'
    );
  });
});
