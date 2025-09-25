#!/usr/bin/env python3
"""
Enhanced Binance Scraper - Improved version with better extreme price capture
Fixes the issue where min/max prices are not accurately captured due to aggressive filtering
"""

import asyncio
import aiohttp
import json
import logging
import time
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('binance_scraper_enhanced.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ScraperConfig:
    """Enhanced scraper configuration"""
    max_pages: int = 30  # Increased from 20 to capture more data
    rows_per_page: int = 20
    max_retries: int = 3
    retry_delay: float = 1.0
    request_timeout: int = 15
    rate_limit_delay: float = 0.3  # Reduced delay for faster sampling
    price_range_min: float = 150.0  # Expanded range to capture more extremes
    price_range_max: float = 500.0  # Expanded range to capture more extremes
    cache_duration: int = 60
    user_agent: str = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    
    # Enhanced filtering configuration
    preserve_extremes_percent: float = 5.0  # Preserve top/bottom 5% of prices
    iqr_multiplier: float = 2.5  # IQR-based outlier detection (less aggressive than 2-sigma)
    min_data_points: int = 50  # Minimum data points before filtering
    multiple_sampling_runs: int = 3  # Multiple sampling runs to capture extremes

@dataclass
class PriceData:
    """Structure for price data with enhanced metadata"""
    price: float
    trade_type: str
    timestamp: datetime
    source: str = "Binance P2P"
    page_number: int = 0
    ad_id: str = ""

class EnhancedBinanceScraper:
    """Enhanced scraper with better extreme price capture"""
    
    def __init__(self, config: ScraperConfig = None):
        self.config = config or ScraperConfig()
        self.p2p_url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
        self.cache = {}
        self.session = None
        
    async def __aenter__(self):
        """Async context manager entry"""
        connector = aiohttp.TCPConnector(limit=15, limit_per_host=8)  # Increased limits
        timeout = aiohttp.ClientTimeout(total=self.config.request_timeout)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={
                'User-Agent': self.config.user_agent,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def _make_request_with_retry(self, payload: Dict, trade_type: str, page: int) -> Optional[Dict]:
        """Make request with retry mechanism and exponential backoff"""
        for attempt in range(self.config.max_retries):
            try:
                async with self.session.post(self.p2p_url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        logger.info(f"Page {page} ({trade_type}): {response.status} - {len(data.get('data', []))} offers")
                        return data
                    elif response.status == 429:
                        wait_time = self.config.retry_delay * (2 ** attempt)
                        logger.warning(f"Rate limit on page {page}, waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        logger.error(f"HTTP Error {response.status} on page {page}")
                        if attempt < self.config.max_retries - 1:
                            await asyncio.sleep(self.config.retry_delay * (2 ** attempt))
                            continue
                        return None
            except asyncio.TimeoutError:
                logger.error(f"Timeout on page {page}, attempt {attempt + 1}")
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(self.config.retry_delay * (2 ** attempt))
                    continue
                return None
            except Exception as e:
                logger.error(f"Error on page {page}: {e}")
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(self.config.retry_delay * (2 ** attempt))
                    continue
                return None
        
        return None
    
    async def _get_offers_for_type_enhanced(self, trade_type: str, run_number: int = 1, silent: bool = False) -> List[PriceData]:
        """Enhanced method to get offers with better data capture"""
        all_prices = []
        total_offers_found = 0
        
        if not silent:
            logger.info(f"Starting enhanced search for {trade_type} offers (run {run_number})")
        
        for page in range(1, self.config.max_pages + 1):
            payload = {
                "proMerchantAds": False,
                "page": page,
                "rows": self.config.rows_per_page,
                "payTypes": [],
                "countries": [],
                "publisherType": None,
                "asset": "USDT",
                "fiat": "VES",
                "tradeType": trade_type
            }
            
            data = await self._make_request_with_retry(payload, trade_type, page)
            if not data:
                break
            
            if 'data' in data and data['data']:
                page_offers = len(data['data'])
                total_offers_found += page_offers
                
                for ad in data['data']:
                    if 'adv' in ad and 'price' in ad['adv']:
                        try:
                            price = float(ad['adv']['price'])
                            if self.config.price_range_min <= price <= self.config.price_range_max:
                                price_data = PriceData(
                                    price=price,
                                    trade_type=trade_type,
                                    timestamp=datetime.now(),
                                    page_number=page,
                                    ad_id=str(ad.get('adv', {}).get('advNo', ''))
                                )
                                all_prices.append(price_data)
                        except (ValueError, TypeError):
                            continue
                
                # If no offers or less than expected, probably last page
                if page_offers == 0 or page_offers < self.config.rows_per_page:
                    if not silent:
                        logger.info(f"Last page detected on page {page}")
                    break
                
                # Rate limiting
                if page % 3 == 0:  # More frequent rate limiting
                    await asyncio.sleep(self.config.rate_limit_delay)
            else:
                if not silent:
                    logger.info(f"No data on page {page}")
                break
        
        if not silent:
            logger.info(f"Run {run_number} - Total {trade_type} offers: {total_offers_found}, valid: {len(all_prices)}")
        
        return all_prices
    
    def _enhanced_filtering_with_extreme_preservation(self, prices: List[PriceData]) -> List[PriceData]:
        """Enhanced filtering that preserves legitimate extreme prices"""
        if not prices or len(prices) < self.config.min_data_points:
            logger.info(f"Not enough data points ({len(prices)}) for filtering, returning all prices")
            return prices
        
        # Convert to price list for calculations
        price_values = [p.price for p in prices]
        original_count = len(prices)
        
        # Sort prices to identify extremes
        sorted_prices = sorted(prices, key=lambda x: x.price)
        
        # Preserve top and bottom extremes (configurable percentage)
        preserve_count = max(1, int(len(prices) * self.config.preserve_extremes_percent / 100))
        preserved_low = sorted_prices[:preserve_count]
        preserved_high = sorted_prices[-preserve_count:]
        
        # Get middle prices for IQR filtering
        middle_prices = sorted_prices[preserve_count:-preserve_count] if len(sorted_prices) > 2 * preserve_count else []
        
        if not middle_prices:
            logger.info("All prices are extremes, returning all")
            return prices
        
        # IQR-based outlier detection (less aggressive than 2-sigma)
        middle_values = [p.price for p in middle_prices]
        q1 = statistics.quantiles(middle_values, n=4)[0]
        q3 = statistics.quantiles(middle_values, n=4)[2]
        iqr = q3 - q1
        
        lower_bound = q1 - (self.config.iqr_multiplier * iqr)
        upper_bound = q3 + (self.config.iqr_multiplier * iqr)
        
        # Filter middle prices using IQR
        filtered_middle = []
        for price_data in middle_prices:
            if lower_bound <= price_data.price <= upper_bound:
                filtered_middle.append(price_data)
        
        # Combine preserved extremes with filtered middle
        final_prices = preserved_low + filtered_middle + preserved_high
        
        # Remove duplicates while preserving order
        seen_prices = set()
        unique_prices = []
        for price_data in final_prices:
            price_key = (price_data.price, price_data.ad_id)
            if price_key not in seen_prices:
                seen_prices.add(price_key)
                unique_prices.append(price_data)
        
        filtered_count = len(unique_prices)
        logger.info(f"Enhanced filtering: {original_count} -> {filtered_count} prices")
        logger.info(f"Preserved {len(preserved_low)} low extremes, {len(preserved_high)} high extremes")
        logger.info(f"Filtered middle prices: {len(middle_prices)} -> {len(filtered_middle)}")
        
        # Log extreme values for debugging
        if unique_prices:
            min_price = min(p.price for p in unique_prices)
            max_price = max(p.price for p in unique_prices)
            logger.info(f"Price range after filtering: {min_price:.2f} - {max_price:.2f}")
        
        return unique_prices
    
    async def _multiple_sampling_runs(self, trade_type: str, silent: bool = False) -> List[PriceData]:
        """Perform multiple sampling runs to capture price extremes"""
        all_prices = []
        
        for run in range(1, self.config.multiple_sampling_runs + 1):
            if not silent:
                logger.info(f"Starting sampling run {run}/{self.config.multiple_sampling_runs} for {trade_type}")
            
            run_prices = await self._get_offers_for_type_enhanced(trade_type, run, silent)
            all_prices.extend(run_prices)
            
            # Small delay between runs to avoid rate limiting
            if run < self.config.multiple_sampling_runs:
                await asyncio.sleep(1.0)
        
        # Remove duplicates based on price and ad_id
        seen_prices = set()
        unique_prices = []
        for price_data in all_prices:
            price_key = (price_data.price, price_data.ad_id)
            if price_key not in seen_prices:
                seen_prices.add(price_key)
                unique_prices.append(price_data)
        
        logger.info(f"Multiple sampling for {trade_type}: {len(all_prices)} total -> {len(unique_prices)} unique prices")
        return unique_prices
    
    async def scrape_rates_enhanced(self, silent: bool = False) -> Dict:
        """Enhanced main method with better extreme price capture"""
        try:
            async with self:
                # Get SELL and BUY prices with multiple sampling runs
                sell_task = self._multiple_sampling_runs("SELL", silent)
                buy_task = self._multiple_sampling_runs("BUY", silent)
                
                sell_prices, buy_prices = await asyncio.gather(sell_task, buy_task)
                
                # Apply enhanced filtering
                sell_prices = self._enhanced_filtering_with_extreme_preservation(sell_prices)
                buy_prices = self._enhanced_filtering_with_extreme_preservation(buy_prices)
                
                if not sell_prices and not buy_prices:
                    raise Exception("Could not get valid P2P prices")
                
                # Calculate statistics
                sell_values = [p.price for p in sell_prices] if sell_prices else []
                buy_values = [p.price for p in buy_prices] if buy_prices else []
                
                # Calculate min, avg, max for SELL
                sell_min = round(min(sell_values), 2) if sell_values else 228.50
                sell_avg = round(sum(sell_values) / len(sell_values), 2) if sell_values else 228.50
                sell_max = round(max(sell_values), 2) if sell_values else 228.50
                
                # Calculate min, avg, max for BUY
                buy_min = round(min(buy_values), 2) if buy_values else 228.00
                buy_avg = round(sum(buy_values) / len(buy_values), 2) if buy_values else 228.00
                buy_max = round(max(buy_values), 2) if buy_values else 228.00
                
                # General average (using averages)
                general_avg = (sell_avg + buy_avg) / 2 if sell_values and buy_values else (sell_avg if sell_values else buy_avg)
                
                # Calculate overall min/max across both types
                all_values = sell_values + buy_values
                overall_min = round(min(all_values), 2) if all_values else min(sell_min, buy_min)
                overall_max = round(max(all_values), 2) if all_values else max(sell_max, buy_max)
                
                # Enhanced quality score
                quality_score = self._calculate_enhanced_quality_score(sell_prices, buy_prices, sell_min, sell_max, buy_min, buy_max)
                
                return {
                    'success': True,
                    'data': {
                        'usd_ves': round(general_avg, 2),
                        'usdt_ves': round(general_avg, 2),
                        # Main values (for compatibility)
                        'sell_rate': sell_avg,
                        'buy_rate': buy_avg,
                        # Enhanced min, avg, max for SELL
                        'sell_min': sell_min,
                        'sell_avg': sell_avg,
                        'sell_max': sell_max,
                        # Enhanced min, avg, max for BUY
                        'buy_min': buy_min,
                        'buy_avg': buy_avg,
                        'buy_max': buy_max,
                        # Overall min/max across all prices
                        'overall_min': overall_min,
                        'overall_max': overall_max,
                        # Spreads
                        'spread_min': round(abs(sell_min - buy_max), 2) if sell_values and buy_values else 0,
                        'spread_avg': round(abs(sell_avg - buy_avg), 2) if sell_values and buy_values else 0,
                        'spread_max': round(abs(sell_max - buy_min), 2) if sell_values and buy_values else 0,
                        # Compatibility with previous spread
                        'spread': round(abs(sell_avg - buy_avg), 2) if sell_values and buy_values else 0,
                        'sell_prices_used': len(sell_prices),
                        'buy_prices_used': len(buy_prices),
                        'prices_used': len(sell_prices) + len(buy_prices),
                        'price_range': {
                            'sell_min': sell_min,
                            'sell_max': sell_max,
                            'buy_min': buy_min,
                            'buy_max': buy_max,
                            'min': overall_min,
                            'max': overall_max
                        },
                        'lastUpdated': datetime.now().isoformat(),
                        'source': 'Binance P2P (Enhanced)',
                        'quality_score': quality_score,
                        'sampling_runs': self.config.multiple_sampling_runs,
                        'extreme_preservation_percent': self.config.preserve_extremes_percent
                    }
                }
                
        except Exception as e:
            logger.error(f"Error in enhanced scraper: {e}")
            return self._get_fallback_data(str(e))
    
    def _calculate_enhanced_quality_score(self, sell_prices: List[PriceData], buy_prices: List[PriceData], 
                                        sell_min: float, sell_max: float, buy_min: float, buy_max: float) -> float:
        """Calculate enhanced quality score based on data quantity, consistency, and extreme capture"""
        total_prices = len(sell_prices) + len(buy_prices)
        
        # Score based on data quantity (0-30 points)
        quantity_score = min(30, total_prices * 0.5)
        
        # Score based on consistency (0-30 points)
        all_prices = [p.price for p in sell_prices + buy_prices]
        if len(all_prices) > 1:
            mean_price = sum(all_prices) / len(all_prices)
            variance = sum((x - mean_price) ** 2 for x in all_prices) / len(all_prices)
            std_dev = variance ** 0.5
            consistency_score = max(0, 30 - (std_dev / mean_price) * 50)
        else:
            consistency_score = 15
        
        # Score based on extreme price capture (0-40 points)
        price_range = max(sell_max, buy_max) - min(sell_min, buy_min)
        expected_range = 50.0  # Expected range in volatile market
        range_coverage = min(40, (price_range / expected_range) * 40)
        
        total_score = quantity_score + consistency_score + range_coverage
        return round(total_score, 1)
    
    def _get_fallback_data(self, error: str) -> Dict:
        """Enhanced fallback data"""
        return {
            'success': False,
            'error': error,
            'data': {
                'usd_ves': 228.25,
                'usdt_ves': 228.25,
                # Main values (for compatibility)
                'sell_rate': 228.50,
                'buy_rate': 228.00,
                # Enhanced values
                'sell_min': 228.50,
                'sell_avg': 228.50,
                'sell_max': 228.50,
                'buy_min': 228.00,
                'buy_avg': 228.00,
                'buy_max': 228.00,
                'overall_min': 228.00,
                'overall_max': 228.50,
                # Spreads
                'spread_min': 0.00,
                'spread_avg': 0.50,
                'spread_max': 0.50,
                'spread': 0.50,
                'sell_prices_used': 0,
                'buy_prices_used': 0,
                'prices_used': 0,
                'price_range': {
                    'sell_min': 228.50, 'sell_max': 228.50,
                    'buy_min': 228.00, 'buy_max': 228.00,
                    'min': 228.00, 'max': 228.50
                },
                'lastUpdated': datetime.now().isoformat(),
                'source': 'Binance P2P (Enhanced Fallback)',
                'quality_score': 0.0,
                'sampling_runs': 0,
                'extreme_preservation_percent': 0.0
            }
        }

async def scrape_binance_rates_enhanced_async(silent: bool = False) -> Dict:
    """Enhanced async function"""
    config = ScraperConfig()
    scraper = EnhancedBinanceScraper(config)
    return await scraper.scrape_rates_enhanced(silent)

def scrape_binance_rates_enhanced(silent: bool = False) -> Dict:
    """Enhanced sync function for compatibility"""
    try:
        return asyncio.run(scrape_binance_rates_enhanced_async(silent))
    except Exception as e:
        logger.error(f"Error executing enhanced async scraper: {e}")
        # Return fallback data
        return EnhancedBinanceScraper()._get_fallback_data(str(e))

if __name__ == '__main__':
    import sys
    silent = '--silent' in sys.argv
    result = scrape_binance_rates_enhanced(silent=silent)
    print(json.dumps(result, indent=2))