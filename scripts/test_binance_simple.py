#!/usr/bin/env python3
"""
Simple Binance P2P Scraper Test
"""

import requests
import json
import sys

def test_binance_scraper():
    """Test the Binance P2P scraper with a simple approach"""
    try:
        p2p_url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        # Test SELL offers
        payload = {
            "proMerchantAds": False,
            "page": 1,
            "rows": 10,
            "payTypes": [],
            "countries": [],
            "publisherType": None,
            "asset": "USDT",
            "fiat": "VES",
            "tradeType": "SELL"
        }
        
        response = requests.post(p2p_url, json=payload, headers=headers, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            if 'data' in data and data['data']:
                prices = []
                for ad in data['data']:
                    if 'adv' in ad and 'price' in ad['adv']:
                        try:
                            price = float(ad['adv']['price'])
                            if 200 <= price <= 400:
                                prices.append(price)
                        except (ValueError, TypeError):
                            continue
                
                if prices:
                    avg_price = sum(prices) / len(prices)
                    result = {
                        'success': True,
                        'data': {
                            'usd_ves': round(avg_price, 2),
                            'usdt_ves': round(avg_price, 2),
                            'sell_rate': round(avg_price, 2),
                            'buy_rate': round(avg_price - 1, 2),  # Approximate
                            'spread': 1.0,
                            'prices_used': len(prices),
                            'price_range': {
                                'min': round(min(prices), 2),
                                'max': round(max(prices), 2)
                            },
                            'lastUpdated': '2025-09-18T12:00:00Z',
                            'source': 'Binance P2P (Simple Test)'
                        }
                    }
                    print(json.dumps(result, indent=2))
                    return
        
        # Fallback data
        result = {
            'success': False,
            'error': 'Could not fetch data',
            'data': {
                'usd_ves': 228.25,
                'usdt_ves': 228.25,
                'sell_rate': 228.50,
                'buy_rate': 228.00,
                'spread': 0.50,
                'prices_used': 0,
                'price_range': {'min': 228.00, 'max': 228.50},
                'lastUpdated': '2025-09-18T12:00:00Z',
                'source': 'Binance P2P (fallback)'
            }
        }
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        result = {
            'success': False,
            'error': str(e),
            'data': {
                'usd_ves': 228.25,
                'usdt_ves': 228.25,
                'sell_rate': 228.50,
                'buy_rate': 228.00,
                'spread': 0.50,
                'prices_used': 0,
                'price_range': {'min': 228.00, 'max': 228.50},
                'lastUpdated': '2025-09-18T12:00:00Z',
                'source': 'Binance P2P (error fallback)'
            }
        }
        print(json.dumps(result, indent=2))

if __name__ == '__main__':
    test_binance_scraper()