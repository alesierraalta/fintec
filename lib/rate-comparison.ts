/**
 * Rate Comparison Utilities
 * Functions to calculate and format percentage differences between BCV and Binance rates
 */

export interface RateComparison {
  bcvRate: number;
  binanceRate: number;
  percentageDifference: number;
  absoluteDifference: number;
  isBCVHigher: boolean;
  comparisonText: string;
}

/**
 * Calculate percentage difference between BCV and Binance rates
 * @param bcvRate - BCV official rate
 * @param binanceRate - Binance average rate
 * @returns RateComparison object with detailed comparison data
 */
export function calculateRateDifference(bcvRate: number, binanceRate: number): RateComparison {
  const absoluteDifference = Math.abs(bcvRate - binanceRate);
  const percentageDifference = ((absoluteDifference / Math.min(bcvRate, binanceRate)) * 100);
  const isBCVHigher = bcvRate > binanceRate;
  
  let comparisonText = '';
  if (isBCVHigher) {
    comparisonText = `BCV es ${percentageDifference.toFixed(1)}% más alto que Binance`;
  } else {
    comparisonText = `Binance es ${percentageDifference.toFixed(1)}% más alto que BCV`;
  }
  
  return {
    bcvRate,
    binanceRate,
    percentageDifference,
    absoluteDifference,
    isBCVHigher,
    comparisonText
  };
}

/**
 * Calculate percentage difference using Binance average rate
 * @param bcvRate - BCV official rate
 * @param binanceSellRate - Binance sell rate
 * @param binanceBuyRate - Binance buy rate
 * @returns RateComparison object
 */
/**
 * Calculate percentage difference using Binance average rate
 * @param bcvRate - BCV official rate
 * @param binanceSellRate - Binance sell rate
 * @param binanceBuyRate - Binance buy rate
 * @returns RateComparison object
 */
export function calculateAverageRateDifference(
  bcvRate: number, 
  binanceSellRate: number, 
  binanceBuyRate: number
): RateComparison {
  const binanceAverageRate = (binanceSellRate + binanceBuyRate) / 2;
  return calculateRateDifference(bcvRate, binanceAverageRate);
}

/**
 * Calculate percentage difference for EUR/VES vs USD/VES comparison
 * @param bcvEurRate - BCV EUR rate
 * @param binanceSellRate - Binance USD sell rate
 * @param binanceBuyRate - Binance USD buy rate
 * @returns RateComparison object with EUR context
 */
export function calculateEurUsdRateDifference(
  bcvEurRate: number, 
  binanceSellRate: number, 
  binanceBuyRate: number
): RateComparison {
  const binanceAverageRate = (binanceSellRate + binanceBuyRate) / 2;
  const comparison = calculateRateDifference(bcvEurRate, binanceAverageRate);
  
  // Update comparison text to reflect EUR vs USD comparison
  comparison.comparisonText = comparison.isBCVHigher 
    ? `BCV EUR es ${comparison.percentageDifference.toFixed(1)}% más alto que Binance USD`
    : `Binance USD es ${comparison.percentageDifference.toFixed(1)}% más alto que BCV EUR`;
    
  return comparison;
}

/**
 * Format percentage difference for display
 * @param percentage - Percentage difference
 * @param isBCVHigher - Whether BCV rate is higher
 * @returns Formatted string with color indicators
 */
export function formatPercentageDifference(percentage: number, isBCVHigher: boolean): string {
  const sign = isBCVHigher ? '+' : '-';
  return `${sign}${percentage.toFixed(1)}%`;
}

/**
 * Get color class for percentage difference display
 * @param isBCVHigher - Whether BCV rate is higher
 * @returns Tailwind CSS color class
 */
export function getPercentageColorClass(isBCVHigher: boolean): string {
  if (isBCVHigher) {
    return 'text-success-600 bg-success-500/10 border-success-500/20';
  } else {
    return 'text-warning-600 bg-warning-500/10 border-warning-500/20';
  }
}

/**
 * Get icon for percentage difference display
 * @param isBCVHigher - Whether BCV rate is higher
 * @returns Icon name for Lucide React
 */
export function getPercentageIcon(isBCVHigher: boolean): string {
  return isBCVHigher ? 'TrendingUp' : 'TrendingDown';
}