import { buildBinanceAppDeepLink } from './binance-market-link';

describe('buildBinanceAppDeepLink', () => {
  it('wraps the HTTPS market URL in Binance’s mobile webview link', () => {
    const webUrl =
      'https://p2p.binance.com/en/trade/all-payments/USDT?fiat=VES';

    expect(buildBinanceAppDeepLink(webUrl)).toBe(
      `bnc://app.binance.com/webview/webview?type=default&url=${encodeURIComponent(window.btoa(webUrl))}`
    );
  });
});
