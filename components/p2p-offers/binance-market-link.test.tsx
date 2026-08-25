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
  it('targets the chosen seller via advertiserNo', () => {
    expect(buildBinanceP2PTradeUrl('s-abc-123')).toBe(
      'https://c2c.binance.com/en/adv?code=s-abc-123'
    );
  });
});
