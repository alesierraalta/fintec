// Test data processing logic
const testData = {
  "success": true,
  "data": {
    "usd_ves": 267.71,
    "usdt_ves": 267.71,
    "sell_rate": 264.84,
    "buy_rate": 270.59,
    "sell_min": 260,
    "sell_avg": 264.84,
    "sell_max": 270.04,
    "buy_min": 268.65,
    "buy_avg": 270.59,
    "buy_max": 273,
    "spread_min": 13,
    "spread_avg": 5.75,
    "spread_max": 1.39,
    "spread": 5.75,
    "sell_prices_used": 400,
    "buy_prices_used": 386,
    "prices_used": 786,
    "price_range": {
      "sell_min": 260,
      "sell_max": 270.04,
      "buy_min": 268.65,
      "buy_max": 273,
      "min": 260,
      "max": 273
    },
    "lastUpdated": "2025-09-18T15:40:34.708789",
    "source": "Binance P2P (Improved)",
    "quality_score": 98.7
  }
};

// Simulate the hook processing logic
function processHookData(data) {
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

const result = processHookData(testData);
console.log('=== HOOK DATA PROCESSING TEST ===');
console.log('Input data:');
console.log('- USD/VES:', testData.data.usd_ves);
console.log('- Sell Rate:', testData.data.sell_rate);
console.log('- Buy Rate:', testData.data.buy_rate);
console.log('- Sell Min:', testData.data.sell_min);
console.log('- Buy Min:', testData.data.buy_min);

console.log('\nProcessed data:');
console.log('- USD/VES:', result.usd_ves);
console.log('- Sell Rate Avg:', result.sell_rate.avg);
console.log('- Sell Rate Min:', result.sell_rate.min);
console.log('- Sell Rate Max:', result.sell_rate.max);
console.log('- Buy Rate Avg:', result.buy_rate.avg);
console.log('- Buy Rate Min:', result.buy_rate.min);
console.log('- Buy Rate Max:', result.buy_rate.max);
console.log('- Prices Used:', result.prices_used);

console.log('\n=== VERIFICATION ===');
console.log('✅ USD/VES should be ~267.71:', result.usd_ves === 267.71);
console.log('✅ Sell Rate Avg should be ~264.84:', result.sell_rate.avg === 264.84);
console.log('✅ Buy Rate Avg should be ~270.59:', result.buy_rate.avg === 270.59);
console.log('✅ Sell Rate Min should be 260:', result.sell_rate.min === 260);
console.log('✅ Buy Rate Min should be ~268.65:', result.buy_rate.min === 268.65);