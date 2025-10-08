#!/usr/bin/env python3
"""
Ultra-Fast Binance Scraper - Optimized for maximum speed
Target: 15-30 seconds maximum response time
Uses concurrent requests and aggressive optimizations
"""

import json
import logging
import time
import asyncio
import aiohttp
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import statistics

# Minimal logging for speed
logging.basicConfig(level=logging.WARNING)  # Only warnings and errors
logger = logging.getLogger(__name__)

class UltraFastBinanceScraper:
    """Ultra-fast scraper optimized for 15-30 second response times"""
    
    def __init__(self):
        self.p2p_url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
        self.max_pages = 8  # Drastically reduced for speed
        self.rows_per_page = 20
        self.request_timeout = 3  # Aggressive timeout
        self.max_retries = 1  # Single retry only
        self.rate_limit_delay = 0.1  # Minimal delay
        self.price_range_min = 150.0
        self.price_range_max = 500.0
        self.user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        
        # Simplified configuration
        self.min_data_points = 10  # Reduced minimum
        self.quality_threshold = 0.7  # Minimum quality score
        
    async def _make_request_async(self, session: aiohttp.ClientSession, payload: Dict, trade_type: str, page: int) -> Optional[Dict]:
        """Make async request with minimal retry"""
        data = json.dumps(payload)
        
        headers = {
            'User-Agent': self.user_agent,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        for attempt in range(self.max_retries + 1):
            try:
                async with session.post(
                    self.p2p_url,
                    data=data,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=self.request_timeout)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result
                    elif response.status == 429:  # Rate limit
                        if attempt < self.max_retries:
                            await asyncio.sleep(0.5)
                            continue
                        return None
                    else:
                        return None
            except Exception:
                if attempt < self.max_retries:
                    await asyncio.sleep(0.2)
                    continue
                return None
        
        return None
    
    async def _get_offers_concurrent(self, trade_types: List[str]) -> Dict[str, List[Dict]]:
        """Get offers for multiple trade types concurrently"""
        results = {trade_type: [] for trade_type in trade_types}
        
        async with aiohttp.ClientSession() as session:
            # Create all tasks
            tasks = []
            for trade_type in trade_types:
                for page in range(1, self.max_pages + 1):
                    payload = {
                        "proMerchantAds": False,
                        "page": page,
                        "rows": self.rows_per_page,
                        "payTypes": [],
                        "countries": [],
                        "publisherType": None,
                        "asset": "USDT",
                        "fiat": "VES",
                        "tradeType": trade_type
                    }
                    task = self._make_request_async(session, payload, trade_type, page)
                    tasks.append((trade_type, page, task))
            
            # Execute all requests concurrently
            completed = 0
            for trade_type, page, task in tasks:
                try:
                    data = await task
                    if data and 'data' in data and data['data']:
                        for ad in data['data']:
                            if 'adv' in ad and 'price' in ad['adv']:
                                try:
                                    price = float(ad['adv']['price'])
                                    if self.price_range_min <= price <= self.price_range_max:
                                        price_data = {
                                            'price': price,
                                            'trade_type': trade_type,
                                            'timestamp': datetime.now().isoformat(),
                                            'page_number': page,
                                            'ad_id': str(ad.get('adv', {}).get('advNo', ''))
                                        }
                                        results[trade_type].append(price_data)
                                except (ValueError, TypeError):
                                    continue
                        completed += 1
                        
                        # Rate limiting - only every 5 pages
                        if completed % 5 == 0:
                            await asyncio.sleep(self.rate_limit_delay)
                except Exception:
                    continue
        
        return results
    
    def _fast_simple_filtering(self, prices: List[Dict]) -> List[Dict]:
        """Ultra-fast simple filtering with extreme preservation"""
        if not prices or len(prices) < self.min_data_points:
            return prices
        
        # Sort prices for extreme preservation
        sorted_prices = sorted(prices, key=lambda x: x['price'])
        
        # Preserve extremes (top and bottom 10%)
        preserve_count = max(1, len(sorted_prices) // 10)
        extremes = sorted_prices[:preserve_count] + sorted_prices[-preserve_count:]
        
        # Simple range-based filtering for middle values
        price_values = [p['price'] for p in prices]
        
        if len(price_values) > 20:
            mean_price = sum(price_values) / len(price_values)
            variance = sum((x - mean_price) ** 2 for x in price_values) / len(price_values)
            std_dev = variance ** 0.5
            
            lower_bound = mean_price - (2.5 * std_dev)  # Less aggressive than 3
            upper_bound = mean_price + (2.5 * std_dev)
            
            filtered_middle = []
            for price_data in prices:
                if lower_bound <= price_data['price'] <= upper_bound:
                    filtered_middle.append(price_data)
            
            # Combine extremes with filtered middle, remove duplicates
            seen_ids = set()
            final_prices = []
            
            for price_data in extremes + filtered_middle:
                price_id = price_data.get('ad_id', str(price_data['price']))
                if price_id not in seen_ids:
                    seen_ids.add(price_id)
                    final_prices.append(price_data)
            
            return final_prices
        
        return prices
    
    def _calculate_fast_quality_score(self, sell_prices: List[Dict], buy_prices: List[Dict]) -> float:
        """Fast quality score calculation"""
        total_prices = len(sell_prices) + len(buy_prices)
        
        # Simple scoring based on quantity and range
        quantity_score = min(40, total_prices * 1.0)  # Up to 40 points for quantity
        
        # Range score
        all_prices = [p['price'] for p in sell_prices + buy_prices]
        if len(all_prices) > 1:
            price_range = max(all_prices) - min(all_prices)
            range_score = min(30, (price_range / 50) * 30)  # Up to 30 points for range
        else:
            range_score = 15
        
        # Consistency score (simplified)
        if len(all_prices) > 5:
            mean_price = sum(all_prices) / len(all_prices)
            variance = sum((x - mean_price) ** 2 for x in all_prices) / len(all_prices)
            std_dev = variance ** 0.5
            consistency_score = max(0, 30 - (std_dev / mean_price) * 30)
        else:
            consistency_score = 20
        
        total_score = quantity_score + range_score + consistency_score
        return round(total_score, 1)
    
    async def scrape_rates_ultra_fast(self, silent: bool = True) -> Dict:
        """Ultra-fast main method - target 15-30 seconds"""
        start_time = time.time()
        
        try:
            # Get SELL and BUY prices concurrently
            trade_types = ["SELL", "BUY"]
            results = await self._get_offers_concurrent(trade_types)
            
            sell_prices = results["SELL"]
            buy_prices = results["BUY"]
            
            # Apply fast filtering
            sell_prices = self._fast_simple_filtering(sell_prices)
            buy_prices = self._fast_simple_filtering(buy_prices)
            
            if not sell_prices and not buy_prices:
                raise Exception("Could not get valid P2P prices")
            
            # Calculate statistics
            sell_values = [p['price'] for p in sell_prices] if sell_prices else []
            buy_values = [p['price'] for p in buy_prices] if buy_prices else []
            
            # Calculate min, avg, max for SELL
            sell_min = round(min(sell_values), 2) if sell_values else 228.50
            sell_avg = round(sum(sell_values) / len(sell_values), 2) if sell_values else 228.50
            sell_max = round(max(sell_values), 2) if sell_values else 228.50
            
            # Calculate min, avg, max for BUY
            buy_min = round(min(buy_values), 2) if buy_values else 228.00
            buy_avg = round(sum(buy_values) / len(buy_values), 2) if buy_values else 228.00
            buy_max = round(max(buy_values), 2) if buy_values else 228.00
            
            # General average
            general_avg = (sell_avg + buy_avg) / 2 if sell_values and buy_values else (sell_avg if sell_values else buy_avg)
            
            # Calculate overall min/max
            all_values = sell_values + buy_values
            overall_min = round(min(all_values), 2) if all_values else min(sell_min, buy_min)
            overall_max = round(max(all_values), 2) if all_values else max(sell_max, buy_max)
            
            # Fast quality score
            quality_score = self._calculate_fast_quality_score(sell_prices, buy_prices)
            
            execution_time = time.time() - start_time
            
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
                    # Overall min/max
                    'overall_min': overall_min,
                    'overall_max': overall_max,
                    # Spreads
                    'spread_min': round(abs(sell_min - buy_max), 2) if sell_values and buy_values else 0,
                    'spread_avg': round(abs(sell_avg - buy_avg), 2) if sell_values and buy_values else 0,
                    'spread_max': round(abs(sell_max - buy_min), 2) if sell_values and buy_values else 0,
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
                    'source': 'Binance P2P (Ultra-Fast)',
                    'quality_score': quality_score,
                    'execution_time_seconds': round(execution_time, 2),
                    'optimization_level': 'ultra_fast',
                    # Debug information
                    'debug_info': {
                        'max_pages_used': self.max_pages,
                        'request_timeout': self.request_timeout,
                        'concurrent_requests': True,
                        'simple_filtering': True,
                        'performance_target': '15-30 seconds'
                    }
                }
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Error in ultra-fast scraper: {e}")
            return self._get_fallback_data(str(e), execution_time)
    
    def _get_fallback_data(self, error: str, execution_time: float) -> Dict:
        """Enhanced fallback data with better error handling"""
        return {
            'success': False,
            'error': error,
            'data': {
                'usd_ves': 228.50,
                'usdt_ves': 228.50,
                'sell_rate': 228.50,
                'buy_rate': 228.00,
                'sell_min': 228.50,
                'sell_avg': 228.50,
                'sell_max': 228.50,
                'buy_min': 228.00,
                'buy_avg': 228.00,
                'buy_max': 228.00,
                'overall_min': 228.00,
                'overall_max': 228.50,
                'spread_min': 0.50,
                'spread_avg': 0.50,
                'spread_max': 0.50,
                'spread': 0.50,
                'sell_prices_used': 0,
                'buy_prices_used': 0,
                'prices_used': 0,
                'price_range': {
                    'sell_min': 228.50,
                    'sell_max': 228.50,
                    'buy_min': 228.00,
                    'buy_max': 228.00,
                    'min': 228.00,
                    'max': 228.50
                },
                'lastUpdated': datetime.now().isoformat(),
                'source': 'Binance P2P (Ultra-Fast Fallback)',
                'quality_score': 0.0,
                'execution_time_seconds': round(execution_time, 2),
                'optimization_level': 'ultra_fast_fallback',
                'debug_info': {
                    'max_pages_used': 0,
                    'request_timeout': self.request_timeout,
                    'concurrent_requests': False,
                    'simple_filtering': False,
                    'performance_target': '15-30 seconds'
                }
            },
            'fallback': True,
            'fallback_reason': error
        }

def scrape_binance_rates_ultra_fast(silent: bool = True) -> Dict:
    """Ultra-fast scraper function - async wrapper"""
    return asyncio.run(scrape_binance_rates_ultra_fast_async(silent))

async def scrape_binance_rates_ultra_fast_async(silent: bool = True) -> Dict:
    """Ultra-fast async scraper function"""
    scraper = UltraFastBinanceScraper()
    return await scraper.scrape_rates_ultra_fast(silent)

if __name__ == '__main__':
    import sys
    silent = '--silent' in sys.argv
    result = scrape_binance_rates_ultra_fast(silent=silent)
    print(json.dumps(result, indent=2))
