/**
 * Manual test script to verify the date parameter fix
 * Run with: npx tsx scripts/test-history-dates.ts
 */

import { bcvHistoryService } from '../lib/services/bcv-history-service';
import { binanceHistoryService } from '../lib/services/binance-history-service';
import { formatCaracasDayKey } from '../lib/utils/date-key';

async function testHistoryDates() {
    console.log('🧪 Testing History Date Parameter Fix\n');

    try {
        // Test 1: Save rates for today (default behavior)
        console.log('Test 1: Saving rates for today (default)...');
        await bcvHistoryService.saveRates(50.5, 55.2, 'BCV');
        await binanceHistoryService.saveRates(49.8);
        console.log('✅ Today rates saved\n');

        // Test 2: Save rates for yesterday
        console.log('Test 2: Saving rates for yesterday...');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        await bcvHistoryService.saveRates(49.5, 54.2, 'BCV', yesterday);
        await binanceHistoryService.saveRates(48.8, yesterday);
        console.log('✅ Yesterday rates saved\n');

        // Test 3: Save rates for 7 days ago
        console.log('Test 3: Saving rates for 7 days ago...');
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        await bcvHistoryService.saveRates(45.5, 50.2, 'BCV', sevenDaysAgo);
        await binanceHistoryService.saveRates(44.8, sevenDaysAgo);
        console.log('✅ 7 days ago rates saved\n');

        // Test 4: Retrieve and verify the rates
        console.log('Test 4: Retrieving saved rates...\n');

        const todayKey = formatCaracasDayKey(new Date());
        const yesterdayKey = formatCaracasDayKey(yesterday);
        const sevenDaysAgoKey = formatCaracasDayKey(sevenDaysAgo);

        const bcvToday = await bcvHistoryService.getRatesForDate(todayKey);
        const bcvYesterday = await bcvHistoryService.getRatesForDate(yesterdayKey);
        const bcvSevenDaysAgo = await bcvHistoryService.getRatesForDate(sevenDaysAgoKey);

        const binanceToday = await binanceHistoryService.getRatesForDate(todayKey);
        const binanceYesterday = await binanceHistoryService.getRatesForDate(yesterdayKey);
        const binanceSevenDaysAgo = await binanceHistoryService.getRatesForDate(sevenDaysAgoKey);

        console.log('BCV Rates:');
        console.log(`  Today (${todayKey}):`, bcvToday ? `USD: ${bcvToday.usd}, EUR: ${bcvToday.eur}` : 'Not found');
        console.log(`  Yesterday (${yesterdayKey}):`, bcvYesterday ? `USD: ${bcvYesterday.usd}, EUR: ${bcvYesterday.eur}` : 'Not found');
        console.log(`  7 days ago (${sevenDaysAgoKey}):`, bcvSevenDaysAgo ? `USD: ${bcvSevenDaysAgo.usd}, EUR: ${bcvSevenDaysAgo.eur}` : 'Not found');
        console.log();

        console.log('Binance Rates:');
        console.log(`  Today (${todayKey}):`, binanceToday ? `USD: ${binanceToday.usd}` : 'Not found');
        console.log(`  Yesterday (${yesterdayKey}):`, binanceYesterday ? `USD: ${binanceYesterday.usd}` : 'Not found');
        console.log(`  7 days ago (${sevenDaysAgoKey}):`, binanceSevenDaysAgo ? `USD: ${binanceSevenDaysAgo.usd}` : 'Not found');
        console.log();

        // Test 5: Verify dates are different
        console.log('Test 5: Verifying dates are different...');
        const allDatesUnique =
            bcvToday?.date !== bcvYesterday?.date &&
            bcvYesterday?.date !== bcvSevenDaysAgo?.date &&
            bcvToday?.date !== bcvSevenDaysAgo?.date;

        if (allDatesUnique) {
            console.log('✅ All dates are unique!');
            console.log(`   Today: ${bcvToday?.date}`);
            console.log(`   Yesterday: ${bcvYesterday?.date}`);
            console.log(`   7 days ago: ${bcvSevenDaysAgo?.date}`);
        } else {
            console.log('❌ Dates are not unique - bug still exists!');
            console.log(`   Today: ${bcvToday?.date}`);
            console.log(`   Yesterday: ${bcvYesterday?.date}`);
            console.log(`   7 days ago: ${bcvSevenDaysAgo?.date}`);
        }

        console.log('\n✅ All tests completed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run tests
testHistoryDates().catch(console.error);
