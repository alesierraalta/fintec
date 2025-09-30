"""
Production Binance Scraper - Optimized for reliability and performance
Combines ultra-fast performance with enhanced error handling and extreme price capture
Target: 15-30 seconds maximum response time with improved data quality
"""

import json
import logging
import time
import asyncio
import aiohttp
import argparse
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import statistics
from dataclasses import dataclass

# Production logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('binance_scraper_production.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ProductionConfig:
    """Production scraper configuration optimized for high price detection (310+)"""
    max_pages: int = 30  # Ultra-comprehensive search across maximum pages
    rows_per_page: int = 20
    max_retries: int = 3  # More retries for reliability
    retry_delay: float = 1.0  # Faster retries
    request_timeout: int = 15  # Longer timeout for comprehensive search
    rate_limit_delay: float = 0.3  # Much faster search
    price_range_min: float = 100.0  # Lower minimum to catch any price
    price_range_max: float = 2000.0  # Much higher maximum to catch very high prices
    user_agent: str = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

    # Ultra-aggressive filtering for high price capture
    preserve_extremes_percent: float = 15.0  # Even more aggressive preservation
    iqr_multiplier: float = 6.0  # Extremely lenient to preserve high prices
    min_data_points: int = 1  # Accept any data
    quality_threshold: float = 0.20  # Very low threshold to include high prices

@dataclass
class ExhaustiveConfig:
    """Exhaustive scraper configuration for comprehensive high price detection"""
    max_pages: int = 25  # Extensive search across many pages
    rows_per_page: int = 20
    max_retries: int = 3
    retry_delay: float = 1.5  # Balanced delays for exhaustive search
    request_timeout: int = 12  # Longer timeout for comprehensive search
    rate_limit_delay: float = 0.8  # Optimized delay for exhaustive search
    price_range_min: float = 150.0
    price_range_max: float = 800.0  # Extended range for very high prices
    user_agent: str = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    
    # Exhaustive filtering for maximum high price capture
    preserve_extremes_percent: float = 8.0  # More aggressive preservation
    iqr_multiplier: float = 3.0  # Very lenient for high prices
    min_data_points: int = 3  # Very low threshold to capture any data
    quality_threshold: float = 0.50  # Very low threshold for comprehensive capture
    
    # Exhaustive search settings
    search_regular_ads: bool = True
    search_pro_merchant: bool = True
    search_different_paytypes: bool = True
    search_different_countries: bool = False  # Focus on VES market
    batch_size: int = 3  # Small batches for exhaustive search
    high_price_threshold: float = 310.0  # Target high prices
    very_high_price_threshold: float = 350.0  # Target very high prices

@dataclass
class PriceData:
    """Structure for price data with metadata"""
    price: float
    trade_type: str
    timestamp: datetime
    source: str = "Binance P2P"
    page_number: int = 0
    ad_id: str = ""

class ProductionBinanceScraper:
    """Production scraper optimized for speed, reliability, and data quality"""
    
    def __init__(self, config: ProductionConfig = None):
        self.config = config or ProductionConfig()
        self.p2p_url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
        self.session = None
        
    async def __aenter__(self):
        """Async context manager entry"""
        connector = aiohttp.TCPConnector(
            limit=20, 
            limit_per_host=10,
            ttl_dns_cache=300,
            use_dns_cache=True
        )
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
        """Make request with optimized retry mechanism"""
        for attempt in range(self.config.max_retries + 1):
            try:
                async with self.session.post(self.p2p_url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data
                    elif response.status == 429:
                        wait_time = self.config.retry_delay * (2 ** attempt)
                        logger.warning(f"Rate limit on page {page}, waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        logger.error(f"HTTP Error {response.status} on page {page}")
                        if attempt < self.config.max_retries:
                            await asyncio.sleep(self.config.retry_delay)
                            continue
                        return None
            except asyncio.TimeoutError:
                logger.error(f"Timeout on page {page}, attempt {attempt + 1}")
                if attempt < self.config.max_retries:
                    await asyncio.sleep(self.config.retry_delay)
                    continue
                return None
            except Exception as e:
                logger.error(f"Error on page {page}: {e}")
                if attempt < self.config.max_retries:
                    await asyncio.sleep(self.config.retry_delay)
                    continue
                return None
        
        return None
    
    async def _get_offers_concurrent(self, trade_type: str) -> List[PriceData]:
        """Get offers using sequential strategy to avoid rate limits and capture high prices"""
        all_prices = []
        
        # Process pages sequentially to avoid rate limits
        for page in range(1, self.config.max_pages + 1):
            try:
                # Try both regular and proMerchant ads to capture more high prices
                configs = [
                    {"proMerchantAds": False, "source": "Regular"},
                    {"proMerchantAds": True, "source": "ProMerchant"}
                ]
                
                for config in configs:
                    result = await self._make_request_with_retry({
                        "proMerchantAds": config["proMerchantAds"],
                        "page": page,
                        "rows": self.config.rows_per_page,
                        "payTypes": [],
                        "countries": [],
                        "publisherType": None,
                        "asset": "USDT",
                        "fiat": "VES",
                        "tradeType": trade_type
                    }, trade_type, page)
                    
                    if result and 'data' in result and result['data']:
                        for offer in result['data']:
                            try:
                                price = float(offer['adv']['price'])
                                if self.config.price_range_min <= price <= self.config.price_range_max:
                                    price_data = PriceData(
                                        price=price,
                                        trade_type=trade_type,
                                        timestamp=datetime.now(),
                                        page_number=page,
                                        ad_id=offer['adv'].get('advNo', ''),
                                        source=f"Binance P2P ({config['source']})"
                                    )
                                    all_prices.append(price_data)
                                    
                                    # Log high prices immediately
                                    if price >= 310:
                                        logger.info(f"HIGH PRICE FOUND: {price} VES ({config['source']}, page {page})")
                                        
                            except (KeyError, ValueError, TypeError) as e:
                                logger.debug(f"Error parsing offer: {e}")
                                continue
                    
                    # Small delay between ad types
                    await asyncio.sleep(0.2)
                
                # Delay between pages to respect rate limits
                await asyncio.sleep(self.config.rate_limit_delay)
                
            except Exception as e:
                logger.error(f"Error on page {page}: {e}")
                continue
        
        # Enhanced logging for high price detection
        if all_prices:
            prices_list = [p.price for p in all_prices]
            min_price = min(prices_list)
            max_price = max(prices_list)
            high_prices = [p for p in all_prices if p.price >= 310]
            very_high_prices = [p for p in all_prices if p.price >= 350]
            
            logger.info(f"Collected {len(all_prices)} {trade_type} prices from {self.config.max_pages} pages")
            logger.info(f"Price range: {min_price:.2f} - {max_price:.2f}")
            logger.info(f"High prices (310+): {len(high_prices)}")
            logger.info(f"Very high prices (350+): {len(very_high_prices)}")
            
            if high_prices:
                high_prices_list = [p.price for p in high_prices]
                logger.info(f"High prices found: {sorted(high_prices_list, reverse=True)[:10]}")  # Top 10 high prices
        else:
            logger.warning(f"No prices collected for {trade_type}")
        
        return all_prices
    
    def _enhanced_filtering_with_extreme_preservation(self, prices: List[PriceData]) -> List[PriceData]:
        """Enhanced filtering optimized for high price capture while removing outliers"""
        if len(prices) < self.config.min_data_points:
            logger.info(f"Insufficient data points ({len(prices)}), returning all prices")
            return prices
        
        original_count = len(prices)
        sorted_prices = sorted(prices, key=lambda x: x.price)
        
        # Preserve top and bottom extremes - more aggressive for high prices
        preserve_count = max(2, int(len(prices) * self.config.preserve_extremes_percent / 100))
        preserved_low = sorted_prices[:preserve_count]
        preserved_high = sorted_prices[-preserve_count:]
        
        # Get middle prices for IQR filtering
        middle_prices = sorted_prices[preserve_count:-preserve_count] if len(sorted_prices) > 2 * preserve_count else []
        
        if not middle_prices:
            return prices
        
        # IQR-based outlier detection with special handling for high prices
        middle_values = [p.price for p in middle_prices]
        q1 = statistics.quantiles(middle_values, n=4)[0]
        q3 = statistics.quantiles(middle_values, n=4)[2]
        iqr = q3 - q1
        
        lower_bound = q1 - (self.config.iqr_multiplier * iqr)
        upper_bound = q3 + (self.config.iqr_multiplier * iqr)
        
        # Special handling for high prices - be more inclusive
        high_price_threshold = 310.0  # Consider prices above 310 as potentially legitimate high prices
        filtered_middle = []
        for price_data in middle_prices:
            # Always include high prices above threshold
            if price_data.price >= high_price_threshold:
                filtered_middle.append(price_data)
            # Apply normal IQR filtering for other prices
            elif lower_bound <= price_data.price <= upper_bound:
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
        high_prices_count = len([p for p in unique_prices if p.price >= high_price_threshold])
        logger.info(f"Enhanced filtering: {original_count} -> {filtered_count} prices (high prices: {high_prices_count})")
        
        return unique_prices
    
    def _calculate_quality_score(self, sell_prices: List[PriceData], buy_prices: List[PriceData]) -> float:
        """Calculate quality score based on data quantity and consistency"""
        total_prices = len(sell_prices) + len(buy_prices)
        
        # Score based on data quantity (0-40 points)
        quantity_score = min(40, total_prices * 0.8)
        
        # Score based on consistency (0-40 points)
        all_prices = [p.price for p in sell_prices + buy_prices]
        if len(all_prices) > 1:
            mean_price = sum(all_prices) / len(all_prices)
            variance = sum((x - mean_price) ** 2 for x in all_prices) / len(all_prices)
            std_dev = variance ** 0.5
            consistency_score = max(0, 40 - (std_dev / mean_price) * 60)
        else:
            consistency_score = 20
        
        # Score based on spread reasonableness (0-20 points)
        if sell_prices and buy_prices:
            sell_avg = sum(p.price for p in sell_prices) / len(sell_prices)
            buy_avg = sum(p.price for p in buy_prices) / len(buy_prices)
            spread_percent = abs(sell_avg - buy_avg) / ((sell_avg + buy_avg) / 2) * 100
            spread_score = max(0, 20 - spread_percent)  # Lower spread = higher score
        else:
            spread_score = 10
        
        total_score = quantity_score + consistency_score + spread_score
        return round(total_score, 1)
    
    async def scrape_rates_production(self) -> Dict:
        """Main production scraping method optimized for speed and reliability"""
        start_time = time.time()
        
        try:
            async with self:
                # Get SELL and BUY prices concurrently
                sell_task = self._get_offers_concurrent("SELL")
                buy_task = self._get_offers_concurrent("BUY")
                
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
                
                # General average
                general_avg = (sell_avg + buy_avg) / 2 if sell_values and buy_values else (sell_avg if sell_values else buy_avg)
                
                # Calculate overall min/max
                all_values = sell_values + buy_values
                overall_min = round(min(all_values), 2) if all_values else min(sell_min, buy_min)
                overall_max = round(max(all_values), 2) if all_values else max(sell_max, buy_max)
                
                # Calculate quality score
                quality_score = self._calculate_quality_score(sell_prices, buy_prices)
                
                execution_time = round(time.time() - start_time, 2)
                
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
                        # Compatibility
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
                        'source': 'Binance P2P (Production)',
                        'quality_score': quality_score,
                        'execution_time': execution_time,
                        'optimization_level': 'production',
                        'debug': {
                            'pages_scraped': self.config.max_pages,
                            'timeout_used': self.config.request_timeout,
                            'extreme_preservation_percent': self.config.preserve_extremes_percent
                        }
                    }
                }
                
        except Exception as e:
            execution_time = round(time.time() - start_time, 2)
            logger.error(f"Error in production scraper: {e}")
            return self._get_fallback_data(str(e), execution_time)
    
    def _get_fallback_data(self, error: str, execution_time: float) -> Dict:
        """Production fallback data with error information"""
        return {
            'success': False,
            'error': error,
            'data': {
                'usd_ves': 228.25,
                'usdt_ves': 228.25,
                'sell_rate': 228.50,
                'buy_rate': 228.00,
                'sell_min': 228.00,
                'sell_avg': 228.50,
                'sell_max': 229.00,
                'buy_min': 227.50,
                'buy_avg': 228.00,
                'buy_max': 228.50,
                'overall_min': 227.50,
                'overall_max': 229.00,
                'spread': 0.50,
                'spread_min': 0.00,
                'spread_avg': 0.50,
                'spread_max': 1.00,
                'sell_prices_used': 0,
                'buy_prices_used': 0,
                'prices_used': 0,
                'price_range': {
                    'sell_min': 228.00,
                    'sell_max': 229.00,
                    'buy_min': 227.50,
                    'buy_max': 228.50,
                    'min': 227.50,
                    'max': 229.00
                },
                'lastUpdated': datetime.now().isoformat(),
                'source': 'Fallback Data (Production)',
                'quality_score': 0.0,
                'execution_time': execution_time,
                'optimization_level': 'fallback'
            }
        }

class ExhaustiveBinanceScraper:
    """Exhaustive scraper for comprehensive high price detection across all available pages"""
    
    def __init__(self, config: ExhaustiveConfig = None):
        self.config = config or ExhaustiveConfig()
        self.p2p_url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
        self.session = None
        self.search_stats = {
            'total_pages_searched': 0,
            'total_requests_made': 0,
            'high_prices_found': 0,
            'very_high_prices_found': 0,
            'search_configurations_used': 0,
            'errors_encountered': 0
        }
        
    async def __aenter__(self):
        """Async context manager entry"""
        connector = aiohttp.TCPConnector(
            limit=30, 
            limit_per_host=15,
            ttl_dns_cache=300,
            use_dns_cache=True
        )
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
        """Make request with optimized retry mechanism for exhaustive search"""
        for attempt in range(self.config.max_retries + 1):
            try:
                async with self.session.post(self.p2p_url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data
                    elif response.status == 429:
                        wait_time = self.config.retry_delay * (2 ** attempt)
                        logger.warning(f"Rate limit on page {page}, waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        logger.error(f"HTTP Error {response.status} on page {page}")
                        if attempt < self.config.max_retries:
                            await asyncio.sleep(self.config.retry_delay)
                            continue
                        return None
            except asyncio.TimeoutError:
                logger.error(f"Timeout on page {page}, attempt {attempt + 1}")
                if attempt < self.config.max_retries:
                    await asyncio.sleep(self.config.retry_delay)
                    continue
                return None
            except Exception as e:
                logger.error(f"Error on page {page}: {e}")
                if attempt < self.config.max_retries:
                    await asyncio.sleep(self.config.retry_delay)
                    continue
                return None
        
        return None
    
    def _enhanced_filtering_with_extreme_preservation(self, prices: List[PriceData]) -> List[PriceData]:
        """Enhanced filtering optimized for high price capture while removing outliers"""
        if len(prices) < self.config.min_data_points:
            logger.info(f"Insufficient data points ({len(prices)}), returning all prices")
            return prices
        
        original_count = len(prices)
        sorted_prices = sorted(prices, key=lambda x: x.price)
        
        # Preserve top and bottom extremes - more aggressive for high prices
        preserve_count = max(2, int(len(prices) * self.config.preserve_extremes_percent / 100))
        preserved_low = sorted_prices[:preserve_count]
        preserved_high = sorted_prices[-preserve_count:]
        
        # Get middle prices for IQR filtering
        middle_prices = sorted_prices[preserve_count:-preserve_count] if len(sorted_prices) > 2 * preserve_count else []
        
        if not middle_prices:
            return prices
        
        # IQR-based outlier detection with special handling for high prices
        middle_values = [p.price for p in middle_prices]
        q1 = statistics.quantiles(middle_values, n=4)[0]
        q3 = statistics.quantiles(middle_values, n=4)[2]
        iqr = q3 - q1
        
        lower_bound = q1 - (self.config.iqr_multiplier * iqr)
        upper_bound = q3 + (self.config.iqr_multiplier * iqr)
        
        # Special handling for high prices - be more inclusive
        high_price_threshold = self.config.high_price_threshold
        filtered_middle = []
        for price_data in middle_prices:
            # Always include high prices above threshold
            if price_data.price >= high_price_threshold:
                filtered_middle.append(price_data)
            # Apply normal IQR filtering for other prices
            elif lower_bound <= price_data.price <= upper_bound:
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
        high_prices_count = len([p for p in unique_prices if p.price >= high_price_threshold])
        logger.info(f"Enhanced filtering: {original_count} -> {filtered_count} prices (high prices: {high_prices_count})")
        
        return unique_prices
    
    async def _exhaustive_search_single_config(self, trade_type: str, search_config: dict, config_name: str) -> List[PriceData]:
        """Search using a single configuration across all pages"""
        all_prices = []
        
        logger.info(f"Starting exhaustive search with {config_name} for {trade_type}")
        
        # Process pages in batches for exhaustive search
        for batch_start in range(1, self.config.max_pages + 1, self.config.batch_size):
            batch_end = min(batch_start + self.config.batch_size, self.config.max_pages + 1)
            
            # Create tasks for this batch
            tasks = []
            for page in range(batch_start, batch_end):
                payload = search_config.copy()
                payload['page'] = page
                
                task = self._make_request_with_retry(payload, trade_type, page)
                tasks.append((task, page))
                self.search_stats['total_requests_made'] += 1
            
            # Execute batch requests
            try:
                results = await asyncio.gather(*[task for task, _ in tasks], return_exceptions=True)
                
                # Process results
                for (_, page), result in zip(tasks, results):
                    self.search_stats['total_pages_searched'] += 1
                    
                    if isinstance(result, Exception):
                        logger.error(f"Exception on page {page} ({config_name}): {result}")
                        self.search_stats['errors_encountered'] += 1
                        continue
                    
                    if result and 'data' in result and result['data']:
                        for offer in result['data']:
                            try:
                                price = float(offer['adv']['price'])
                                if self.config.price_range_min <= price <= self.config.price_range_max:
                                    price_data = PriceData(
                                        price=price,
                                        trade_type=trade_type,
                                        timestamp=datetime.now(),
                                        page_number=page,
                                        ad_id=offer['adv'].get('advNo', ''),
                                        source=f"Binance P2P ({config_name})"
                                    )
                                    all_prices.append(price_data)
                                    
                                    # Track high prices
                                    if price >= self.config.high_price_threshold:
                                        self.search_stats['high_prices_found'] += 1
                                        logger.info(f"HIGH PRICE FOUND: {price} VES ({config_name}, page {page})")
                                    
                                    if price >= self.config.very_high_price_threshold:
                                        self.search_stats['very_high_prices_found'] += 1
                                        logger.info(f"VERY HIGH PRICE FOUND: {price} VES ({config_name}, page {page})")
                                        
                            except (KeyError, ValueError, TypeError) as e:
                                logger.debug(f"Error parsing offer: {e}")
                                continue
                
                # Delay between batches
                if batch_end <= self.config.max_pages:
                    await asyncio.sleep(self.config.rate_limit_delay)
                    
            except Exception as e:
                logger.error(f"Batch error ({config_name}): {e}")
                self.search_stats['errors_encountered'] += 1
        
        logger.info(f"{config_name} search completed: {len(all_prices)} prices found")
        return all_prices
    
    async def _get_exhaustive_offers(self, trade_type: str) -> List[PriceData]:
        """Get offers using exhaustive multi-configuration search"""
        all_prices = []
        
        # Define search configurations
        search_configs = []
        
        # Regular ads configuration
        if self.config.search_regular_ads:
            search_configs.append({
                'config': {
                    "proMerchantAds": False,
                    "rows": self.config.rows_per_page,
                    "payTypes": [],
                    "countries": [],
                    "publisherType": None,
                    "asset": "USDT",
                    "fiat": "VES",
                    "tradeType": trade_type
                },
                'name': 'Regular Ads'
            })
        
        # ProMerchant ads configuration
        if self.config.search_pro_merchant:
            search_configs.append({
                'config': {
                    "proMerchantAds": True,
                    "rows": self.config.rows_per_page,
                    "payTypes": [],
                    "countries": [],
                    "publisherType": None,
                    "asset": "USDT",
                    "fiat": "VES",
                    "tradeType": trade_type
                },
                'name': 'ProMerchant Ads'
            })
        
        # Different payment types if enabled
        if self.config.search_different_paytypes:
            pay_types = [
                [],  # All payment types
                ["BANK_TRANSFER"],  # Bank transfer only
                ["CASH"],  # Cash only
                ["CREDIT_CARD"]  # Credit card only
            ]
            
            for pay_type in pay_types:
                search_configs.append({
                    'config': {
                        "proMerchantAds": False,
                        "rows": self.config.rows_per_page,
                        "payTypes": pay_type,
                        "countries": [],
                        "publisherType": None,
                        "asset": "USDT",
                        "fiat": "VES",
                        "tradeType": trade_type
                    },
                    'name': f'Payment Type: {pay_type if pay_type else "All"}'
                })
        
        # Execute all search configurations
        for search_config in search_configs:
            try:
                self.search_stats['search_configurations_used'] += 1
                config_prices = await self._exhaustive_search_single_config(
                    trade_type, 
                    search_config['config'], 
                    search_config['name']
                )
                all_prices.extend(config_prices)
                
                # Delay between configurations
                await asyncio.sleep(self.config.rate_limit_delay * 2)
                
            except Exception as e:
                logger.error(f"Error in search configuration {search_config['name']}: {e}")
                self.search_stats['errors_encountered'] += 1
                continue
        
        # Remove duplicates while preserving order
        seen_prices = set()
        unique_prices = []
        for price_data in all_prices:
            price_key = (price_data.price, price_data.ad_id, price_data.source)
            if price_key not in seen_prices:
                seen_prices.add(price_key)
                unique_prices.append(price_data)
        
        # Enhanced logging for exhaustive search
        if unique_prices:
            prices_list = [p.price for p in unique_prices]
            min_price = min(prices_list)
            max_price = max(prices_list)
            high_prices = [p for p in unique_prices if p.price >= self.config.high_price_threshold]
            very_high_prices = [p for p in unique_prices if p.price >= self.config.very_high_price_threshold]
            
            logger.info(f"EXHAUSTIVE SEARCH RESULTS for {trade_type}:")
            logger.info(f"   Total prices collected: {len(unique_prices)}")
            logger.info(f"   Price range: {min_price:.2f} - {max_price:.2f}")
            logger.info(f"   High prices (310+): {len(high_prices)}")
            logger.info(f"   Very high prices (350+): {len(very_high_prices)}")
            logger.info(f"   Pages searched: {self.search_stats['total_pages_searched']}")
            logger.info(f"   Configurations used: {self.search_stats['search_configurations_used']}")
            
            if high_prices:
                high_prices_list = [p.price for p in high_prices]
                logger.info(f"   High prices found: {sorted(high_prices_list, reverse=True)[:15]}")  # Top 15 high prices
        else:
            logger.warning(f"No prices collected for {trade_type} in exhaustive search")
        
        return unique_prices
    
    async def scrape_rates_exhaustive(self) -> Dict:
        """Main exhaustive scraping method for comprehensive high price detection"""
        start_time = time.time()
        
        logger.info("Starting EXHAUSTIVE Binance P2P search for high prices...")
        logger.info(f"Search parameters: {self.config.max_pages} pages, multiple configurations")
        
        try:
            async with self:
                # Get SELL and BUY prices using exhaustive search
                sell_task = self._get_exhaustive_offers("SELL")
                buy_task = self._get_exhaustive_offers("BUY")
                
                sell_prices, buy_prices = await asyncio.gather(sell_task, buy_task)
                
                # Apply enhanced filtering
                sell_prices = self._enhanced_filtering_with_extreme_preservation(sell_prices)
                buy_prices = self._enhanced_filtering_with_extreme_preservation(buy_prices)
                
                if not sell_prices and not buy_prices:
                    raise Exception("Could not get valid P2P prices in exhaustive search")
                
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
                
                # General average
                general_avg = (sell_avg + buy_avg) / 2 if sell_values and buy_values else (sell_avg if sell_values else buy_avg)
                
                # Calculate overall min/max
                all_values = sell_values + buy_values
                overall_min = round(min(all_values), 2) if all_values else min(sell_min, buy_min)
                overall_max = round(max(all_values), 2) if all_values else max(sell_max, buy_max)
                
                # Calculate quality score
                quality_score = self._calculate_quality_score(sell_prices, buy_prices)
                
                execution_time = round(time.time() - start_time, 2)
                
                # Generate comprehensive report
                logger.info("EXHAUSTIVE SEARCH COMPLETE!")
                logger.info(f"   Total execution time: {execution_time:.2f} seconds")
                logger.info(f"   Total pages searched: {self.search_stats['total_pages_searched']}")
                logger.info(f"   Total configurations used: {self.search_stats['search_configurations_used']}")
                logger.info(f"   High prices found: {self.search_stats['high_prices_found']}")
                logger.info(f"   Very high prices found: {self.search_stats['very_high_prices_found']}")
                logger.info(f"   Errors encountered: {self.search_stats['errors_encountered']}")
                
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
                        # Compatibility
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
                        'source': 'Binance P2P (Exhaustive Search)',
                        'quality_score': quality_score,
                        'execution_time': execution_time,
                        'optimization_level': 'exhaustive',
                        'search_statistics': self.search_stats,
                        'debug': {
                            'pages_scraped': self.config.max_pages,
                            'timeout_used': self.config.request_timeout,
                            'extreme_preservation_percent': self.config.preserve_extremes_percent,
                            'search_configurations': self.search_stats['search_configurations_used'],
                            'high_prices_detected': self.search_stats['high_prices_found'],
                            'very_high_prices_detected': self.search_stats['very_high_prices_found']
                        }
                    }
                }
                
        except Exception as e:
            execution_time = round(time.time() - start_time, 2)
            logger.error(f"Error in exhaustive scraper: {e}")
            return self._get_fallback_data(str(e), execution_time)
    
    def _get_fallback_data(self, error: str, execution_time: float) -> Dict:
        """Exhaustive fallback data with error information"""
        return {
            'success': False,
            'error': error,
            'data': {
                'usd_ves': 228.25,
                'usdt_ves': 228.25,
                'sell_rate': 228.50,
                'buy_rate': 228.00,
                'sell_min': 228.00,
                'sell_avg': 228.50,
                'sell_max': 229.00,
                'buy_min': 227.50,
                'buy_avg': 228.00,
                'buy_max': 228.50,
                'overall_min': 227.50,
                'overall_max': 229.00,
                'spread': 0.50,
                'spread_min': 0.00,
                'spread_avg': 0.50,
                'spread_max': 1.00,
                'sell_prices_used': 0,
                'buy_prices_used': 0,
                'prices_used': 0,
                'price_range': {
                    'sell_min': 228.00,
                    'sell_max': 229.00,
                    'buy_min': 227.50,
                    'buy_max': 228.50,
                    'min': 227.50,
                    'max': 229.00
                },
                'lastUpdated': datetime.now().isoformat(),
                'source': 'Fallback Data (Exhaustive Search)',
                'quality_score': 0.0,
                'execution_time': execution_time,
                'optimization_level': 'exhaustive_fallback',
                'search_statistics': self.search_stats
            }
        }
    
    def _calculate_quality_score(self, sell_prices: List[PriceData], buy_prices: List[PriceData]) -> float:
        """Calculate quality score based on data quantity and consistency"""
        total_prices = len(sell_prices) + len(buy_prices)
        
        # Score based on data quantity (0-40 points)
        quantity_score = min(40, total_prices * 0.8)
        
        # Score based on consistency (0-40 points)
        all_prices = [p.price for p in sell_prices + buy_prices]
        if len(all_prices) > 1:
            mean_price = sum(all_prices) / len(all_prices)
            variance = sum((x - mean_price) ** 2 for x in all_prices) / len(all_prices)
            std_dev = variance ** 0.5
            consistency_score = max(0, 40 - (std_dev / mean_price) * 60)
        else:
            consistency_score = 20
        
        # Score based on spread reasonableness (0-20 points)
        if sell_prices and buy_prices:
            sell_avg = sum(p.price for p in sell_prices) / len(sell_prices)
            buy_avg = sum(p.price for p in buy_prices) / len(buy_prices)
            spread_percent = abs(sell_avg - buy_avg) / ((sell_avg + buy_avg) / 2) * 100
            spread_score = max(0, 20 - spread_percent)  # Lower spread = higher score
        else:
            spread_score = 10
        
        total_score = quantity_score + consistency_score + spread_score
        return round(total_score, 1)

# Entry point functions for compatibility
async def scrape_binance_rates_production() -> Dict:
    """Async entry point for production scraper"""
    scraper = ProductionBinanceScraper()
    return await scraper.scrape_rates_production()

def scrape_binance_rates_production_sync() -> Dict:
    """Sync entry point for production scraper"""
    return asyncio.run(scrape_binance_rates_production())

# Exhaustive search entry points
async def scrape_binance_rates_exhaustive() -> Dict:
    """Async entry point for exhaustive scraper"""
    scraper = ExhaustiveBinanceScraper()
    return await scraper.scrape_rates_exhaustive()

def scrape_binance_rates_exhaustive_sync() -> Dict:
    """Sync entry point for exhaustive scraper"""
    return asyncio.run(scrape_binance_rates_exhaustive())

# Main execution for testing
if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Binance P2P Scraper - Production & Exhaustive')
    parser.add_argument('--silent', action='store_true', help='Output only JSON (for API use)')
    parser.add_argument('--exhaustive', action='store_true', help='Use exhaustive search mode (25+ pages, multiple configs)')
    parser.add_argument('--max-pages', type=int, default=25, help='Maximum pages to search (exhaustive mode)')
    args = parser.parse_args()
    
    # Only output debug info if not silent
    if not args.silent:
        if args.exhaustive:
            print("Starting EXHAUSTIVE Binance P2P search for high prices...", file=sys.stderr)
            print(f"Search parameters: {args.max_pages} pages, multiple configurations", file=sys.stderr)
        else:
            print("Testing Production Binance Scraper...", file=sys.stderr)
    start_time = time.time()
    
    # Choose scraper based on mode
    if args.exhaustive:
        # Configure exhaustive search
        config = ExhaustiveConfig()
        config.max_pages = args.max_pages
        scraper = ExhaustiveBinanceScraper(config)
        result = asyncio.run(scraper.scrape_rates_exhaustive())
    else:
        result = scrape_binance_rates_production_sync()
    
    if not args.silent:
        execution_time = time.time() - start_time
        print(f"Total execution time: {execution_time:.2f} seconds", file=sys.stderr)
        print(f"Result: {json.dumps(result, indent=2)}")
    else:
        # Silent mode: only output JSON to stdout
        print(json.dumps(result))