#!/usr/bin/env python3
"""
Test suite para el Binance Scraper mejorado
"""

import asyncio
import json
import unittest
from unittest.mock import Mock, patch, AsyncMock
import sys
import os

# Agregar el directorio padre al path para importar el scraper
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from binance_scraper import BinanceScraper, ScraperConfig, PriceData, scrape_binance_rates_async

class TestBinanceScraper(unittest.TestCase):
    """Test cases para BinanceScraper"""
    
    def setUp(self):
        """Setup para cada test"""
        self.config = ScraperConfig(
            max_pages=2,
            rows_per_page=5,
            max_retries=2,
            retry_delay=0.1,
            request_timeout=5
        )
        self.scraper = BinanceScraper(self.config)
    
    def test_scraper_config(self):
        """Test configuración del scraper"""
        self.assertEqual(self.config.max_pages, 2)
        self.assertEqual(self.config.rows_per_page, 5)
        self.assertEqual(self.config.max_retries, 2)
        self.assertIn("Mozilla", self.config.user_agent)
    
    def test_price_data_structure(self):
        """Test estructura de datos de precios"""
        price_data = PriceData(
            price=250.0,
            trade_type="SELL",
            timestamp=None
        )
        self.assertEqual(price_data.price, 250.0)
        self.assertEqual(price_data.trade_type, "SELL")
        self.assertEqual(price_data.source, "Binance P2P")
    
    def test_validate_and_filter_prices(self):
        """Test validación y filtrado de precios"""
        # Crear datos de prueba con outliers
        prices = [
            PriceData(price=250.0, trade_type="SELL", timestamp=None),
            PriceData(price=255.0, trade_type="SELL", timestamp=None),
            PriceData(price=260.0, trade_type="SELL", timestamp=None),
            PriceData(price=100.0, trade_type="SELL", timestamp=None),  # Outlier
            PriceData(price=500.0, trade_type="SELL", timestamp=None),  # Outlier
        ]
        
        filtered_prices = self.scraper._validate_and_filter_prices(prices)
        
        # Debería filtrar los outliers
        self.assertLess(len(filtered_prices), len(prices))
        self.assertGreater(len(filtered_prices), 0)
        
        # Verificar que los precios filtrados están en rango razonable
        for price_data in filtered_prices:
            self.assertGreater(price_data.price, 200)
            self.assertLess(price_data.price, 300)
    
    def test_calculate_quality_score(self):
        """Test cálculo de score de calidad"""
        sell_prices = [
            PriceData(price=250.0, trade_type="SELL", timestamp=None),
            PriceData(price=255.0, trade_type="SELL", timestamp=None),
        ]
        buy_prices = [
            PriceData(price=245.0, trade_type="BUY", timestamp=None),
            PriceData(price=248.0, trade_type="BUY", timestamp=None),
        ]
        
        score = self.scraper._calculate_quality_score(sell_prices, buy_prices)
        
        self.assertGreater(score, 0)
        self.assertLessEqual(score, 100)
    
    def test_get_fallback_data(self):
        """Test datos de fallback"""
        error_msg = "Test error"
        fallback_data = self.scraper._get_fallback_data(error_msg)
        
        self.assertFalse(fallback_data['success'])
        self.assertEqual(fallback_data['error'], error_msg)
        self.assertIn('data', fallback_data)
        self.assertIn('usd_ves', fallback_data['data'])
        self.assertIn('quality_score', fallback_data['data'])
    
    @patch('aiohttp.ClientSession.post')
    async def test_make_request_with_retry_success(self, mock_post):
        """Test request con retry exitoso"""
        # Mock response exitoso
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            'data': [
                {'adv': {'price': '250.0'}},
                {'adv': {'price': '255.0'}}
            ]
        })
        
        mock_post.return_value.__aenter__.return_value = mock_response
        
        # Crear session mock
        self.scraper.session = AsyncMock()
        self.scraper.session.post = mock_post
        
        payload = {"test": "data"}
        result = await self.scraper._make_request_with_retry(payload, "SELL", 1)
        
        self.assertIsNotNone(result)
        self.assertIn('data', result)
        self.assertEqual(len(result['data']), 2)
    
    @patch('aiohttp.ClientSession.post')
    async def test_make_request_with_retry_rate_limit(self, mock_post):
        """Test request con rate limit"""
        # Mock rate limit response
        mock_response = AsyncMock()
        mock_response.status = 429
        
        mock_post.return_value.__aenter__.return_value = mock_response
        
        self.scraper.session = AsyncMock()
        self.scraper.session.post = mock_post
        
        payload = {"test": "data"}
        result = await self.scraper._make_request_with_retry(payload, "SELL", 1)
        
        # Debería retornar None después de agotar reintentos
        self.assertIsNone(result)
    
    @patch('aiohttp.ClientSession.post')
    async def test_get_offers_for_type(self, mock_post):
        """Test obtención de ofertas por tipo"""
        # Mock response con datos válidos
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            'data': [
                {'adv': {'price': '250.0'}},
                {'adv': {'price': '255.0'}},
                {'adv': {'price': '260.0'}}
            ]
        })
        
        mock_post.return_value.__aenter__.return_value = mock_response
        
        self.scraper.session = AsyncMock()
        self.scraper.session.post = mock_post
        
        offers = await self.scraper._get_offers_for_type("SELL", silent=True)
        
        self.assertIsInstance(offers, list)
        self.assertGreater(len(offers), 0)
        
        for offer in offers:
            self.assertIsInstance(offer, PriceData)
            self.assertEqual(offer.trade_type, "SELL")
            self.assertGreater(offer.price, 200)
            self.assertLess(offer.price, 400)

class TestIntegration(unittest.TestCase):
    """Test de integración"""
    
    @patch('aiohttp.ClientSession.post')
    async def test_scrape_rates_integration(self, mock_post):
        """Test integración completa del scraper"""
        # Mock responses para SELL y BUY
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            'data': [
                {'adv': {'price': '250.0'}},
                {'adv': {'price': '255.0'}}
            ]
        })
        
        mock_post.return_value.__aenter__.return_value = mock_response
        
        config = ScraperConfig(max_pages=1, rows_per_page=5)
        scraper = BinanceScraper(config)
        scraper.session = AsyncMock()
        scraper.session.post = mock_post
        
        result = await scraper.scrape_rates(silent=True)
        
        self.assertTrue(result['success'])
        self.assertIn('data', result)
        self.assertIn('usd_ves', result['data'])
        self.assertIn('sell_rate', result['data'])
        self.assertIn('buy_rate', result['data'])
        self.assertIn('quality_score', result['data'])
        self.assertGreater(result['data']['prices_used'], 0)

class TestCompatibility(unittest.TestCase):
    """Test de compatibilidad con código existente"""
    
    def test_sync_function_exists(self):
        """Test que la función síncrona existe y es callable"""
        from binance_scraper import scrape_binance_rates
        self.assertTrue(callable(scrape_binance_rates))
    
    def test_async_function_exists(self):
        """Test que la función async existe y es callable"""
        from binance_scraper import scrape_binance_rates_async
        self.assertTrue(callable(scrape_binance_rates_async))

def run_async_test(test_func):
    """Helper para ejecutar tests async"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(test_func())
    finally:
        loop.close()

def main():
    """Ejecutar todos los tests"""
    print("🧪 Ejecutando tests del Binance Scraper mejorado...\n")
    
    # Tests síncronos
    unittest.main(argv=[''], exit=False, verbosity=2)
    
    # Tests async
    print("\n🔄 Ejecutando tests async...")
    
    async def run_async_tests():
        test_instance = TestBinanceScraper()
        test_instance.setUp()
        
        # Test async methods
        await test_instance.test_make_request_with_retry_success()
        await test_instance.test_make_request_with_retry_rate_limit()
        await test_instance.test_get_offers_for_type()
        
        # Integration test
        integration_test = TestIntegration()
        await integration_test.test_scrape_rates_integration()
        
        print("✅ Todos los tests async completados exitosamente")
    
    run_async_test(run_async_tests)
    
    print("\n🎉 Todos los tests completados!")

if __name__ == '__main__':
    main()

