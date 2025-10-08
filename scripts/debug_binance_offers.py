"""
Debug Script for Binance P2P Offers
Investigates price discrepancy between scraper and UI
Shows detailed offer information to understand differences
"""

import asyncio
import aiohttp
import json
from datetime import datetime
from typing import List, Dict

class BinanceDebugger:
    def __init__(self):
        self.p2p_url = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search"
        self.session = None
        
    async def __aenter__(self):
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(
            timeout=timeout,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def fetch_offers(self, trade_type: str, page: int = 1, pro_merchant: bool = False) -> Dict:
        """Fetch offers from Binance P2P API"""
        payload = {
            "proMerchantAds": pro_merchant,
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
            async with self.session.post(self.p2p_url, json=payload) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    print(f"[ERROR] HTTP {response.status}")
                    return None
        except Exception as e:
            print(f"[ERROR] Request failed: {e}")
            return None
    
    def display_offer(self, offer: Dict, index: int):
        """Display detailed information about a single offer"""
        try:
            adv = offer.get('adv', {})
            advertiser = offer.get('advertiser', {})
            
            price = float(adv.get('price', 0))
            min_amount = float(adv.get('minSingleTransAmount', 0))
            max_amount = float(adv.get('dynamicMaxSingleTransAmount', 0))
            available = float(adv.get('surplusAmount', 0))
            
            nickname = advertiser.get('nickName', 'Unknown')
            trade_count = advertiser.get('monthFinishRate', 0)
            completion_rate = advertiser.get('monthOrderCount', 0)
            
            payment_methods = [tm.get('identifier', 'Unknown') for tm in adv.get('tradeMethods', [])]
            
            print(f"\n  Offer #{index + 1}:")
            print(f"    Price:        Bs. {price:.2f}")
            print(f"    Min/Max:      {min_amount:.2f} - {max_amount:.2f} USDT")
            print(f"    Available:    {available:.2f} USDT")
            print(f"    Advertiser:   {nickname}")
            print(f"    Trades:       {trade_count} (completion: {completion_rate}%)")
            print(f"    Payment:      {', '.join(payment_methods[:3])}")
            
            return price
            
        except Exception as e:
            print(f"    [ERROR] Failed to parse offer: {e}")
            return None
    
    async def compare_with_ui(self, trade_type: str, pages: int = 2):
        """Fetch and display offers for comparison with UI"""
        print("="*70)
        print(f"BINANCE P2P DEBUG - {trade_type} OFFERS")
        print("="*70)
        print(f"\nTimestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Trade Type: {trade_type}")
        print(f"Asset: USDT / Fiat: VES")
        print(f"\nNote: 'BUY' means YOU buy USDT (sellers offer their USDT)")
        print("      'SELL' means YOU sell USDT (buyers want your USDT)")
        
        all_prices = []
        
        for page in range(1, pages + 1):
            print(f"\n{'='*70}")
            print(f"PAGE {page} - Regular Ads")
            print("="*70)
            
            result = await self.fetch_offers(trade_type, page, pro_merchant=False)
            
            if result and result.get('data'):
                offers = result['data']
                print(f"\nFound {len(offers)} offers on page {page}")
                
                for i, offer in enumerate(offers[:10]):  # Show first 10
                    price = self.display_offer(offer, i)
                    if price:
                        all_prices.append(price)
                
                if len(offers) > 10:
                    print(f"\n  ... and {len(offers) - 10} more offers")
            else:
                print("[ERROR] No offers found or request failed")
                
            await asyncio.sleep(1)  # Delay between pages
        
        # Summary
        print(f"\n{'='*70}")
        print("SUMMARY")
        print("="*70)
        
        if all_prices:
            print(f"\nTotal offers analyzed: {len(all_prices)}")
            print(f"Price range: Bs. {min(all_prices):.2f} - Bs. {max(all_prices):.2f}")
            print(f"Minimum price: Bs. {min(all_prices):.2f}")
            print(f"Maximum price: Bs. {max(all_prices):.2f}")
            print(f"Average price: Bs. {sum(all_prices)/len(all_prices):.2f}")
            
            # Compare with UI
            print(f"\n{'='*70}")
            print("COMPARISON WITH UI")
            print("="*70)
            print(f"\nAPI shows minimum: Bs. {min(all_prices):.2f}")
            print(f"UI shows minimum:  Bs. 300.198 (your observation)")
            print(f"Difference:        Bs. {abs(min(all_prices) - 300.198):.2f}")
            
            if abs(min(all_prices) - 300.198) < 1.0:
                print("\n[OK] Difference is minimal (< 1 VES)")
                print("This is likely due to:")
                print("  - Timing: Offers change constantly")
                print("  - API vs UI sorting differences")
                print("  - Filtering in UI that API doesn't have")
            else:
                print("\n[WARNING] Significant difference detected")
                print("Possible reasons:")
                print("  - Different filters applied")
                print("  - Minimum amount requirements")
                print("  - Merchant verification filters")
        else:
            print("\n[ERROR] No prices collected")

async def main():
    """Main debug function"""
    print("\n" + "="*70)
    print("BINANCE P2P OFFERS DEBUGGER")
    print("="*70)
    print("\nThis script fetches live offers from Binance P2P API")
    print("to compare with what you see in the UI.\n")
    
    async with BinanceDebugger() as debugger:
        # Debug BUY offers (you buy USDT, others sell)
        await debugger.compare_with_ui("BUY", pages=2)
        
        print("\n\n")
        
        # Also check SELL offers for comparison
        await debugger.compare_with_ui("SELL", pages=1)
    
    print("\n" + "="*70)
    print("DEBUG COMPLETE")
    print("="*70)
    print("\nCheck the output above to understand the difference.")
    print("The API returns all available offers, while the UI might")
    print("apply additional filters based on your preferences.\n")

if __name__ == "__main__":
    asyncio.run(main())

