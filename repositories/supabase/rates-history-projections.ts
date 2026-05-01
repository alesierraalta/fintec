/**
 * Rates History Repository Projections
 */

export const BCV_RATE_HISTORY_LIST_PROJECTION = `
  date,
  usd,
  eur,
  source,
  timestamp
`
  .trim()
  .replace(/\s+/g, '');

export const BINANCE_RATE_HISTORY_LIST_PROJECTION = `
  date,
  usd,
  source,
  timestamp
`
  .trim()
  .replace(/\s+/g, '');

export const EXCHANGE_RATE_SNAPSHOT_LIST_PROJECTION = `
  usd_ves,
  usdt_ves,
  sell_rate,
  buy_rate,
  last_updated,
  source
`
  .trim()
  .replace(/\s+/g, '');
