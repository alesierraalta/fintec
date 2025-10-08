"""
Quick Test Script for Binance Scraper
Tests Python execution and scraper functionality
Run with: py scripts/test_binance_direct.py
"""

import sys
import json
import time
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from binance_scraper_production import scrape_binance_rates_production_sync
    print("[OK] Successfully imported binance_scraper_production")
except ImportError as e:
    print(f"[ERROR] Failed to import scraper: {e}")
    sys.exit(1)

def test_scraper():
    """Test the Binance scraper"""
    print("\n" + "="*60)
    print("Testing Binance Scraper (Production Mode)")
    print("="*60 + "\n")
    
    start_time = time.time()
    
    try:
        print("Scraping Binance P2P rates...")
        result = scrape_binance_rates_production_sync()
        
        execution_time = time.time() - start_time
        
        print(f"\nExecution time: {execution_time:.2f} seconds\n")
        
        if result.get('success'):
            data = result.get('data', {})
            print("[SUCCESS] Got real data from Binance!\n")
            print("Results:")
            print(f"   USD/VES:     Bs. {data.get('usd_ves', 0):.2f}")
            print(f"   USDT/VES:    Bs. {data.get('usdt_ves', 0):.2f}")
            print(f"\n   SELL Prices:")
            print(f"      Min:  Bs. {data.get('sell_min', 0):.2f}")
            print(f"      Avg:  Bs. {data.get('sell_avg', 0):.2f}")
            print(f"      Max:  Bs. {data.get('sell_max', 0):.2f}")
            print(f"\n   BUY Prices:")
            print(f"      Min:  Bs. {data.get('buy_min', 0):.2f}")
            print(f"      Avg:  Bs. {data.get('buy_avg', 0):.2f}")
            print(f"      Max:  Bs. {data.get('buy_max', 0):.2f}")
            print(f"\n   Spread:      Bs. {data.get('spread', 0):.2f}")
            print(f"   Prices used: {data.get('prices_used', 0)}")
            print(f"      - Sell:   {data.get('sell_prices_used', 0)}")
            print(f"      - Buy:    {data.get('buy_prices_used', 0)}")
            print(f"\n   Source:      {data.get('source', 'Unknown')}")
            
            if data.get('prices_used', 0) > 0:
                print("\n[OK] SCRAPER IS WORKING CORRECTLY!")
                print("   Real prices are being fetched from Binance P2P")
            else:
                print("\n[WARNING] No prices collected")
                print("   This might be fallback data")
                
        else:
            error = result.get('error', 'Unknown error')
            data = result.get('data', {})
            print(f"[FAILED] Using fallback data\n")
            print(f"   Error: {error}")
            print(f"\n   Fallback values:")
            print(f"      USD/VES:  Bs. {data.get('usd_ves', 0):.2f}")
            print(f"      SELL:     Bs. {data.get('sell_avg', 0):.2f}")
            print(f"      BUY:      Bs. {data.get('buy_avg', 0):.2f}")
            
        print("\n" + "="*60)
        print("Full JSON Response:")
        print("="*60)
        print(json.dumps(result, indent=2, default=str))
        
        return result.get('success', False)
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print(f"Python version: {sys.version}")
    print(f"Python executable: {sys.executable}\n")
    
    success = test_scraper()
    
    if success:
        print("\n[OK] TEST PASSED - Scraper is working!")
        sys.exit(0)
    else:
        print("\n[FAILED] TEST FAILED - Check errors above")
        sys.exit(1)

