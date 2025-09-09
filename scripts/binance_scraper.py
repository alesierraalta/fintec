#!/usr/bin/env python3
"""
Binance Scraper - Obtener precios USD/VES real desde Binance P2P
Muestra tanto tasas de COMPRA como de VENTA
"""

import requests
import json
from datetime import datetime
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def scrape_binance_rates():
    """Obtener precios USD/VES real desde Binance P2P - Compra y Venta"""
    try:
        p2p_url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
        
        # 1. Obtener precios de VENTA (SELL) - La gente vende USDT por VES
        sell_payload = {
            "proMerchantAds": False,
            "page": 1,
            "rows": 10,
            "payTypes": [],
            "countries": [],
            "publisherType": None,
            "asset": "USDT",
            "fiat": "VES",
            "tradeType": "SELL"  # Vendedores de USDT por VES
        }
        
        # 2. Obtener precios de COMPRA (BUY) - La gente compra USDT con VES  
        buy_payload = {
            "proMerchantAds": False,
            "page": 1,
            "rows": 10,
            "payTypes": [],
            "countries": [],
            "publisherType": None,
            "asset": "USDT",
            "fiat": "VES",
            "tradeType": "BUY"   # Compradores de USDT con VES
        }
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        # Obtener datos de VENTA
        sell_response = requests.post(p2p_url, json=sell_payload, headers=headers, timeout=10)
        if sell_response.status_code != 200:
            raise Exception(f"Error SELL API: {sell_response.status_code}")
        
        # Obtener datos de COMPRA
        buy_response = requests.post(p2p_url, json=buy_payload, headers=headers, timeout=10)
        if buy_response.status_code != 200:
            raise Exception(f"Error BUY API: {buy_response.status_code}")
        
        sell_data = sell_response.json()
        buy_data = buy_response.json()
        
        # Procesar precios de VENTA
        sell_prices = []
        if 'data' in sell_data and sell_data['data']:
            for ad in sell_data['data'][:10]:
                if 'adv' in ad and 'price' in ad['adv']:
                    try:
                        price = float(ad['adv']['price'])
                        if 200 <= price <= 300:
                            sell_prices.append(price)
                    except (ValueError, TypeError):
                        continue
        
        # Procesar precios de COMPRA
        buy_prices = []
        if 'data' in buy_data and buy_data['data']:
            for ad in buy_data['data'][:10]:
                if 'adv' in ad and 'price' in ad['adv']:
                    try:
                        price = float(ad['adv']['price'])
                        if 200 <= price <= 300:
                            buy_prices.append(price)
                    except (ValueError, TypeError):
                        continue
        
        if not sell_prices and not buy_prices:
            raise Exception("No se pudieron obtener precios P2P válidos")
        
        # Calcular promedios
        sell_avg = sum(sell_prices) / len(sell_prices) if sell_prices else 228.50
        buy_avg = sum(buy_prices) / len(buy_prices) if buy_prices else 228.00
        
        # Promedio general (para compatibilidad)
        general_avg = (sell_avg + buy_avg) / 2 if sell_prices and buy_prices else (sell_avg if sell_prices else buy_avg)
        
        return {
            'success': True,
            'data': {
                'usd_ves': round(general_avg, 2),  # Promedio general
                'usdt_ves': round(general_avg, 2), # Para compatibilidad
                'sell_rate': round(sell_avg, 2),   # Tasa de VENTA (más alta)
                'buy_rate': round(buy_avg, 2),     # Tasa de COMPRA (más baja)
                'spread': round(abs(sell_avg - buy_avg), 2) if sell_prices and buy_prices else 0,
                'sell_prices_used': len(sell_prices),
                'buy_prices_used': len(buy_prices),
                'prices_used': len(sell_prices) + len(buy_prices),
                'price_range': {
                    'sell_min': round(min(sell_prices), 2) if sell_prices else 228.50,
                    'sell_max': round(max(sell_prices), 2) if sell_prices else 228.50,
                    'buy_min': round(min(buy_prices), 2) if buy_prices else 228.00,
                    'buy_max': round(max(buy_prices), 2) if buy_prices else 228.00,
                    'min': round(min((sell_prices + buy_prices) if (sell_prices and buy_prices) else (sell_prices or buy_prices)), 2),
                    'max': round(max((sell_prices + buy_prices) if (sell_prices and buy_prices) else (sell_prices or buy_prices)), 2)
                },
                'lastUpdated': datetime.now().isoformat(),
                'source': 'Binance P2P'
            }
        }
        
    except Exception as e:
        # Fallback con precios aproximados
        return {
            'success': False,
            'error': str(e),
            'data': {
                'usd_ves': 228.25,
                'usdt_ves': 228.25,
                'sell_rate': 228.50,  # Venta más alta
                'buy_rate': 228.00,   # Compra más baja
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
                'source': 'Binance P2P (fallback)'
            }
        }

if __name__ == '__main__':
    result = scrape_binance_rates()
    print(json.dumps(result, indent=2))