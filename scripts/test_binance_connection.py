#!/usr/bin/env python3
"""
Test script to diagnose Binance P2P API connection
"""

import asyncio
import aiohttp
import json
from datetime import datetime

async def test_binance_p2p():
    """Test connection to Binance P2P API"""
    
    url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
    
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
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    print("Testing Binance P2P API connection...")
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        timeout = aiohttp.ClientTimeout(total=10)
        async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
            print("\nSending request...")
            async with session.post(url, json=payload) as response:
                print(f"Response status: {response.status}")
                print(f"Response headers: {dict(response.headers)}")
                
                if response.status == 200:
                    data = await response.json()
                    print(f"\nResponse data received")
                    print(f"   - Total ads: {len(data.get('data', []))}")
                    
                    if data.get('data'):
                        print(f"\nFirst 3 ads:")
                        for i, ad in enumerate(data['data'][:3], 1):
                            if 'adv' in ad:
                                price = ad['adv'].get('price', 'N/A')
                                print(f"   {i}. Price: {price} VES")
                    
                    return True
                else:
                    text = await response.text()
                    print(f"Error response: {text[:500]}")
                    return False
                    
    except asyncio.TimeoutError:
        print("Connection timeout - possible network/firewall issue")
        return False
    except aiohttp.ClientError as e:
        print(f"Client error: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = asyncio.run(test_binance_p2p())
    
    if success:
        print("\nBinance P2P API is accessible and working")
    else:
        print("\nCannot connect to Binance P2P API")
        print("\nPossible causes:")
        print("1. Network/firewall blocking the connection")
        print("2. VPN or proxy interfering")
        print("3. Binance P2P API is down")
        print("4. Rate limiting from Binance")

