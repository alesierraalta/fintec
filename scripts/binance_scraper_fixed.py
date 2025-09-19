#!/usr/bin/env python3
"""
Binance Scraper - Get real USD/VES rates from Binance P2P
Shows both BUY and SELL rates
Improved version with async/await, retry mechanism, and better error handling
"""

import asyncio
import aiohttp
import json
import logging
import time
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
        logging.FileHandler('binance_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ScraperConfig:
    """Scraper configuration"""
    max_pages: int = 20
    rows_per_page: int = 20
    max_retries: int = 3
    retry_delay: float = 1.0
    request_timeout: int = 15
    rate_limit_delay: float = 0.5
    price_range_min: float = 200.0
    price_range_max: float = 400.0
    cache_duration: int = 60  # seconds
    user_agent: str = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

@dataclass
class PriceData:
    """Structure for price data"""
    price: float
    trade_type: str
    timestamp: datetime
    source: str = "Binance P2P"

class BinanceScraper:
    """Improved scraper for Binance P2P with async/await and better error handling"""
    
    def __init__(self, config: ScraperConfig = None):
        self.config = config or ScraperConfig()
        self.p2p_url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
        self.cache = {}
        self.session = None
        
    async def __aenter__(self):
        """Async context manager entry"""
        connector = aiohttp.TCPConnector(limit=10, limit_per_host=5)
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
    
    async def _get_offers_for_type(self, trade_type: str, silent: bool = False) -> List[PriceData]:
        """Get offers for a specific trade type"""
        all_prices = []
        total_offers_found = 0
        
        if not silent:
            logger.info(f"Starting search for {trade_type} offers")
        
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
                                    timestamp=datetime.now()
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
                if page % 5 == 0:
                    await asyncio.sleep(self.config.rate_limit_delay)
            else:
                if not silent:
                    logger.info(f"No data on page {page}")
                break
        
        if not silent:
            logger.info(f"Total {trade_type} offers: {total_offers_found}, valid: {len(all_prices)}")
        
        return all_prices
    
    def _validate_and_filter_prices(self, prices: List[PriceData]) -> List[PriceData]:
        """Validate and filter prices to remove outliers"""
        if not prices:
            return prices
        
        # Convert to price list for calculations
        price_values = [p.price for p in prices]
        
        # Calculate statistics
        mean_price = sum(price_values) / len(price_values)
        variance = sum((x - mean_price) ** 2 for x in price_values) / len(price_values)
        std_dev = variance ** 0.5
        
        # Filter outliers (prices more than 2 standard deviations from mean)
        filtered_prices = []
        for price_data in prices:
            if abs(price_data.price - mean_price) <= 2 * std_dev:
                filtered_prices.append(price_data)
        
        logger.info(f"Filtered: {len(prices)} -> {len(filtered_prices)} prices (removed {len(prices) - len(filtered_prices)} outliers)")
        
        return filtered_prices
    
    async def scrape_rates(self, silent: bool = False) -> Dict:
        """Main method to get exchange rates"""
        try:
            async with self:
                # Get SELL and BUY prices in parallel
                sell_task = self._get_offers_for_type("SELL", silent)
                buy_task = self._get_offers_for_type("BUY", silent)
                
                sell_prices, buy_prices = await asyncio.gather(sell_task, buy_task)
                
                # Validate and filter prices
                sell_prices = self._validate_and_filter_prices(sell_prices)
                buy_prices = self._validate_and_filter_prices(buy_prices)
                
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
                
                return {
                    'success': True,
                    'data': {
                        'usd_ves': round(general_avg, 2),
                        'usdt_ves': round(general_avg, 2),
                        # Main values (for compatibility)
                        'sell_rate': sell_avg,
                        'buy_rate': buy_avg,
                        # New values: min, avg, max for SELL
                        'sell_min': sell_min,
                        'sell_avg': sell_avg,
                        'sell_max': sell_max,
                        # New values: min, avg, max for BUY
                        'buy_min': buy_min,
                        'buy_avg': buy_avg,
                        'buy_max': buy_max,
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
                            'min': round(min(sell_values + buy_values), 2) if sell_values and buy_values else (sell_min if sell_values else buy_min),
                            'max': round(max(sell_values + buy_values), 2) if sell_values and buy_values else (sell_max if sell_values else buy_max)
                        },
                        'lastUpdated': datetime.now().isoformat(),
                        'source': 'Binance P2P (Improved)',
                        'quality_score': self._calculate_quality_score(sell_prices, buy_prices)
                    }
                }
                
        except Exception as e:
            logger.error(f"Error in scraper: {e}")
            return self._get_fallback_data(str(e))
    
    def _calculate_quality_score(self, sell_prices: List[PriceData], buy_prices: List[PriceData]) -> float:
        """Calculate quality score based on data quantity and consistency"""
        total_prices = len(sell_prices) + len(buy_prices)
        
        # Score based on data quantity (0-50 points)
        quantity_score = min(50, total_prices * 2)
        
        # Score based on consistency (0-50 points)
        all_prices = [p.price for p in sell_prices + buy_prices]
        if len(all_prices) > 1:
            mean_price = sum(all_prices) / len(all_prices)
            variance = sum((x - mean_price) ** 2 for x in all_prices) / len(all_prices)
            std_dev = variance ** 0.5
            consistency_score = max(0, 50 - (std_dev / mean_price) * 100)
        else:
            consistency_score = 25
        
        return round(quantity_score + consistency_score, 1)
    
    def _get_fallback_data(self, error: str) -> Dict:
        """Fallback data in case of error"""
        return {
            'success': False,
            'error': error,
            'data': {
                'usd_ves': 228.25,
                'usdt_ves': 228.25,
                # Main values (for compatibility)
                'sell_rate': 228.50,
                'buy_rate': 228.00,
                # New values: min, avg, max for SELL
                'sell_min': 228.50,
                'sell_avg': 228.50,
                'sell_max': 228.50,
                # New values: min, avg, max for BUY
                'buy_min': 228.00,
                'buy_avg': 228.00,
                'buy_max': 228.00,
                # Spreads
                'spread_min': 0.00,
                'spread_avg': 0.50,
                'spread_max': 0.50,
                # Compatibility with previous spread
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
                'source': 'Binance P2P (fallback)',
                'quality_score': 0.0
            }
        }

async def scrape_binance_rates_async(silent: bool = False) -> Dict:
    """Main async function for compatibility"""
    config = ScraperConfig()
    scraper = BinanceScraper(config)
    return await scraper.scrape_rates(silent)

def scrape_binance_rates(silent: bool = False) -> Dict:
    """Sync function for compatibility with existing code"""
    try:
        return asyncio.run(scrape_binance_rates_async(silent))
    except Exception as e:
        logger.error(f"Error executing async scraper: {e}")
        # Fallback to sync implementation if async fails
        return _scrape_binance_rates_sync(silent)

def _scrape_binance_rates_sync(silent: bool = False) -> Dict:
    """Sync fallback implementation using requests"""
    import requests
    
    try:
        p2p_url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        def get_offers_sync(trade_type: str, max_pages: int = 10) -> List[float]:
            all_prices = []
            for page in range(1, max_pages + 1):
                payload = {
                    "proMerchantAds": False,
                    "page": page,
                    "rows": 20,
                    "payTypes": [],
                    "countries": [],
                    "publisherType": None,
                    "asset": "USDT",
                    "fiat": "VES",
                    "tradeType": trade_type
                }
                
                try:
                    response = requests.post(p2p_url, json=payload, headers=headers, timeout=15)
                    if response.status_code == 200:
                        data = response.json()
                        if 'data' in data and data['data']:
                            for ad in data['data']:
                                if 'adv' in ad and 'price' in ad['adv']:
                                    try:
                                        price = float(ad['adv']['price'])
                                        if 200 <= price <= 400:
                                            all_prices.append(price)
                                    except (ValueError, TypeError):
                                        continue
                            if len(data['data']) < 20:
                                break
                        else:
                            break
                    else:
                        break
                except Exception:
                    break
                
                time.sleep(0.5)  # Rate limiting
            
            return all_prices
        
        sell_prices = get_offers_sync("SELL")
        buy_prices = get_offers_sync("BUY")
        
        if not sell_prices and not buy_prices:
            raise Exception("Could not get valid P2P prices")
        
        # Calculate min, avg, max for SELL
        sell_min = round(min(sell_prices), 2) if sell_prices else 228.50
        sell_avg = round(sum(sell_prices) / len(sell_prices), 2) if sell_prices else 228.50
        sell_max = round(max(sell_prices), 2) if sell_prices else 228.50
        
        # Calculate min, avg, max for BUY
        buy_min = round(min(buy_prices), 2) if buy_prices else 228.00
        buy_avg = round(sum(buy_prices) / len(buy_prices), 2) if buy_prices else 228.00
        buy_max = round(max(buy_prices), 2) if buy_prices else 228.00
        
        general_avg = (sell_avg + buy_avg) / 2 if sell_prices and buy_prices else (sell_avg if sell_prices else buy_avg)
        
        return {
            'success': True,
            'data': {
                'usd_ves': round(general_avg, 2),
                'usdt_ves': round(general_avg, 2),
                # Main values (for compatibility)
                'sell_rate': sell_avg,
                'buy_rate': buy_avg,
                # New values: min, avg, max for SELL
                'sell_min': sell_min,
                'sell_avg': sell_avg,
                'sell_max': sell_max,
                # New values: min, avg, max for BUY
                'buy_min': buy_min,
                'buy_avg': buy_avg,
                'buy_max': buy_max,
                # Spreads
                'spread_min': round(abs(sell_min - buy_max), 2) if sell_prices and buy_prices else 0,
                'spread_avg': round(abs(sell_avg - buy_avg), 2) if sell_prices and buy_prices else 0,
                'spread_max': round(abs(sell_max - buy_min), 2) if sell_prices and buy_prices else 0,
                # Compatibility with previous spread
                'spread': round(abs(sell_avg - buy_avg), 2) if sell_prices and buy_prices else 0,
                'sell_prices_used': len(sell_prices),
                'buy_prices_used': len(buy_prices),
                'prices_used': len(sell_prices) + len(buy_prices),
                'price_range': {
                    'sell_min': sell_min,
                    'sell_max': sell_max,
                    'buy_min': buy_min,
                    'buy_max': buy_max,
                    'min': round(min(sell_prices + buy_prices), 2) if sell_prices and buy_prices else (sell_min if sell_prices else buy_min),
                    'max': round(max(sell_prices + buy_prices), 2) if sell_prices and buy_prices else (sell_max if sell_prices else buy_max)
                },
                'lastUpdated': datetime.now().isoformat(),
                'source': 'Binance P2P (Sync Fallback)',
                'quality_score': 50.0
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'data': {
                'usd_ves': 228.25,
                'usdt_ves': 228.25,
                # Main values (for compatibility)
                'sell_rate': 228.50,
                'buy_rate': 228.00,
                # New values: min, avg, max for SELL
                'sell_min': 228.50,
                'sell_avg': 228.50,
                'sell_max': 228.50,
                # New values: min, avg, max for BUY
                'buy_min': 228.00,
                'buy_avg': 228.00,
                'buy_max': 228.00,
                # Spreads
                'spread_min': 0.00,
                'spread_avg': 0.50,
                'spread_max': 0.50,
                # Compatibility with previous spread
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
                'source': 'Binance P2P (fallback)',
                'quality_score': 0.0
            }
        }

if __name__ == '__main__':
    import sys
    silent = '--silent' in sys.argv
    result = scrape_binance_rates(silent=silent)
    print(json.dumps(result, indent=2))