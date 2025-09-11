const { binanceHistoryService } = require('./lib/services/binance-history-service');

async function debugBinanceHistory() {
  try {
    console.log('Fetching recent Binance rates...');
    const rates = await binanceHistoryService.getHistoricalRates(5);
    console.log('Recent rates:', JSON.stringify(rates, null, 2));
    
    if (rates.length > 0) {
      console.log('\nFirst rate structure:');
      console.log('- ID:', rates[0].id);
      console.log('- Date:', rates[0].date);
      console.log('- USD:', rates[0].usd, '(type:', typeof rates[0].usd, ')');
      console.log('- Timestamp:', rates[0].timestamp);
      console.log('- Source:', rates[0].source);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

debugBinanceHistory();