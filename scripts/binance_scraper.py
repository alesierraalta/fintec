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

def scrape_binance_rates(silent=False):
    """Obtener precios USD/VES real desde Binance P2P - Compra y Venta"""
    try:
        p2p_url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
        
        # Función para obtener múltiples páginas
        def get_all_offers(trade_type, max_pages=50):  # Aumentar a 50 páginas para capturar todas
            all_prices = []
            total_offers_found = 0
            
            if not silent:
                print(f"\n=== Iniciando búsqueda de ofertas {trade_type} ===\n")
            
            for page in range(1, max_pages + 1):
                if not silent:
                    print(f"\n--- Procesando página {page} ---")
                payload = {
                    "proMerchantAds": False,
                    "page": page,
                    "rows": 20,  # 20 por página
                    "payTypes": [],
                    "countries": [],
                    "publisherType": None,
                    "asset": "USDT",
                    "fiat": "VES",
                    "tradeType": trade_type
                }
                
                try:
                    response = requests.post(p2p_url, json=payload, headers=headers, timeout=15)
                    if not silent:
                        print(f"Página {page}: Status {response.status_code}")
                    
                    if response.status_code == 200:
                        data = response.json()
                        if not silent:
                            print(f"Página {page}: Respuesta recibida, verificando datos...")
                        
                        if 'data' in data and data['data']:
                            page_offers = len(data['data'])
                            total_offers_found += page_offers
                            if not silent:
                                print(f"Página {page}: {page_offers} ofertas encontradas")
                            
                            # Verificar si hay información de total
                            if 'total' in data:
                                 if not silent:
                                     print(f"Total disponible según API: {data['total']}")
                            
                            for ad in data['data']:
                                if 'adv' in ad and 'price' in ad['adv']:
                                    try:
                                        price = float(ad['adv']['price'])
                                        if 200 <= price <= 400:  # Rango aún más amplio
                                            all_prices.append(price)
                                    except (ValueError, TypeError):
                                        continue
                            
                            # Continuar hasta que no haya más datos
                            if page_offers == 0:
                                if not silent:
                                    print(f"Página {page}: Sin ofertas, terminando")
                                break
                            elif page_offers < 20:
                                 if not silent:
                                     print(f"Página {page}: {page_offers} ofertas (posible última página)")
                                # Continuar para verificar si hay más páginas
                            
                            # Agregar pequeña pausa para evitar rate limiting
                            if page % 5 == 0:  # Cada 5 páginas
                                import time
                                time.sleep(1)
                                if not silent:
                                     print(f"Pausa después de {page} páginas...")
                            
                        else:
                            if not silent:
                                print(f"Página {page}: Sin datos en respuesta")
                                print(f"Estructura de respuesta: {list(data.keys()) if data else 'No data'}")
                            break  # No más datos, salir del loop
                    else:
                        if not silent:
                            print(f"Error API en página {page}: {response.status_code}")
                            if response.status_code == 429:
                                print("Rate limit alcanzado, esperando...")
                            import time
                            time.sleep(2)
                            continue
                        break  # Error en la API, salir del loop
                except Exception as e:
                    if not silent:
                        print(f"Error conexión en página {page}: {e}")
                    import traceback
                    traceback.print_exc()
                    break  # Error de conexión, salir del loop
            
            if not silent:
                print(f"Total ofertas encontradas para {trade_type}: {total_offers_found}")
                print(f"Ofertas válidas (precio 200-400): {len(all_prices)}")
            return all_prices
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        # Obtener precios de VENTA y COMPRA usando múltiples páginas
        sell_prices = get_all_offers("SELL", max_pages=20)  # Aumentar para obtener más ofertas
        buy_prices = get_all_offers("BUY", max_pages=20)   # Aumentar para obtener más ofertas
        
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
    import sys
    silent = '--silent' in sys.argv
    result = scrape_binance_rates(silent=silent)
    print(json.dumps(result, indent=2))