// Test script to verify hook data processing
const testData = {
  "success": true,
  "data": {
    "usd_ves": 268.73,
    "usdt_ves": 268.73,
    "sell_rate": 266.24,
    "buy_rate": 271.22,
    "sell_min": 262.5,
    "sell_avg": 266.24,
    "sell_max": 270.2,
    "buy_min": 269,
    "buy_avg": 271.22,
    "buy_max": 273.94,
    "spread_min": 11.44,
    "spread_avg": 4.98,
    "spread_max": 1.2,
    "spread": 4.98,
    "sell_prices_used": 399,
    "buy_prices_used": 379,
    "prices_used": 778,
    "price_range": {
      "sell_min": 262.5,
      "sell_max": 270.2,
      "buy_min": 269,
      "buy_max": 273.94,
      "min": 262.5,
      "max": 273.94
    },
    "lastUpdated": "2025-09-18T14:34:42.820084",
    "source": "Binance P2P (Improved)",
    "quality_score": 98.9
  }
};

// Simulate the hook logic
function processData(data) {
  if (data.success && data.data) {
    const sellRate = data.data.sell_rate;
    const buyRate = data.data.buy_rate;
    
    const processedData = {
      usd_ves: data.data.usd_ves || 228.25,
      usdt_ves: data.data.usdt_ves || 228.25,
      sell_rate: typeof sellRate === 'object' ? sellRate : {
        min: data.data.sell_min || sellRate || 228.50,
        avg: sellRate || 228.50,
        max: data.data.sell_max || sellRate || 228.50
      },
      buy_rate: typeof buyRate === 'object' ? buyRate : {
        min: data.data.buy_min || buyRate || 228.00,
        avg: buyRate || 228.00,
        max: data.data.buy_max || buyRate || 228.00
      },
      spread: data.data.spread || 0.50,
      sell_prices_used: data.data.sell_prices_used || 0,
      buy_prices_used: data.data.buy_prices_used || 0,
      prices_used: data.data.prices_used || 0,
      price_range: data.data.price_range || {
        sell_min: 228.50, sell_max: 228.50,
        buy_min: 228.00, buy_max: 228.00,
        min: 228.00, max: 228.50
      },
      lastUpdated: data.data.lastUpdated || new Date().toISOString()
    };
    
    return processedData;
  }
  return null;
}

const result = processData(testData);
console.log('Processed data:');
console.log(JSON.stringify(result, null, 2));

console.log('\nKey values:');
console.log('USD/VES:', result.usd_ves);
console.log('Sell Rate Avg:', result.sell_rate.avg);
console.log('Buy Rate Avg:', result.buy_rate.avg);
console.log('Sell Rate Min:', result.sell_rate.min);
console.log('Buy Rate Min:', result.buy_rate.min);