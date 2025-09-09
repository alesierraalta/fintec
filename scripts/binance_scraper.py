#!/usr/bin/env python3
"""
Binance Scraper - Obtener precio USD/VES real desde Binance P2P
"""

import requests
import json
from datetime import datetime
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def scrape_binance_rates():
    """Obtener precio USD/VES real desde Binance P2P"""
    try:
        # API P2P de Binance para obtener ofertas reales USDT -> VES
        p2p_url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
        
        # Buscar ofertas de venta de USDT por VES (precio más común)
        usdt_payload = {
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
        
        response = requests.post(p2p_url, 
                               json=usdt_payload,
                               headers={
                                   'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                   'Content-Type': 'application/json',
                                   'Accept': 'application/json'
                               }, 
                               timeout=10)
        
        if response.status_code != 200:
            raise Exception(f"Binance P2P API returned status code: {response.status_code} - Posible restricción geográfica")
        
        p2p_data = response.json()
        
        usdt_ves_prices = []
        if 'data' in p2p_data and p2p_data['data']:
            ads = p2p_data['data']
            for ad in ads[:10]:  # Tomar las primeras 10 ofertas
                if 'adv' in ad and 'price' in ad['adv']:
                    try:
                        price = float(ad['adv']['price'])
                        if 200 <= price <= 300:  # Rango real actual para VES (precios altos debido a inflación)
                            usdt_ves_prices.append(price)
                    except (ValueError, TypeError):
                        continue
        
        if not usdt_ves_prices:
            raise Exception("No se pudieron obtener precios P2P válidos - Sin ofertas en rango válido")
        
        # Calcular precio promedio
        avg_usdt_ves = sum(usdt_ves_prices) / len(usdt_ves_prices)
        
        # Como USDT ≈ 1 USD, el precio USDT/VES es aproximadamente USD/VES
        usd_ves_rate = round(avg_usdt_ves, 2)
        
        return {
            'success': True,
            'data': {
                'usd_ves': usd_ves_rate,
                'usdt_ves': round(avg_usdt_ves, 2),
                'prices_used': len(usdt_ves_prices),
                'price_range': {
                    'min': round(min(usdt_ves_prices), 2),
                    'max': round(max(usdt_ves_prices), 2)
                },
                'lastUpdated': datetime.now().isoformat(),
                'source': 'Binance P2P'
            }
        }
        
    except Exception as e:
        # Fallback con precio aproximado actual
        return {
            'success': False,
            'error': str(e),
            'data': {
                'usd_ves': 228.50,
                'usdt_ves': 228.50,
                'prices_used': 0,
                'price_range': {'min': 228.50, 'max': 228.50},
                'lastUpdated': datetime.now().isoformat(),
                'source': 'Binance P2P (fallback)'
            }
        }

if __name__ == '__main__':
    result = scrape_binance_rates()
    print(json.dumps(result, indent=2))