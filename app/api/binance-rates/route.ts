import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { logger } from '@/lib/utils/logger';

// Cache optimizado para datos de Binance - ANTI RATE LIMITING
let pythonAvailable: boolean | null = null;
let pythonCommand: string | null = null;
let lastFallbackTime = 0;
let lastSuccessfulData: any = null;
let lastSuccessfulTime = 0;
let consecutiveFailures = 0; // Track failures for exponential backoff
let lastRequestTime = 0; // Track last request to enforce minimum delay

// INCREASED CACHE DURATIONS TO AVOID RATE LIMITING
const FALLBACK_CACHE_DURATION = 60 * 1000; // 1 minuto (evitar spam)
const SUCCESS_CACHE_DURATION = 180 * 1000; // 3 minutos (reducir peticiones)
const SCRAPER_TIMEOUT = 120 * 1000; // 2 minutos para production scraper
const BACKGROUND_REFRESH_INTERVAL = 180 * 1000; // 3 minutos para background refresh
const MIN_REQUEST_INTERVAL = 30 * 1000; // Mínimo 30 segundos entre peticiones
const MAX_CONSECUTIVE_FAILURES = 3; // Después de 3 fallos, esperar más tiempo

// Force reset all cache variables on module load
logger.info('🔄 Binance API module loaded - all cache variables reset');
logger.info('🐍 Python command priority: py (Windows Python Launcher)');

export async function GET() {
  try {
    const now = Date.now();
    
    // 1. ALWAYS return cached data if available and recent (ANTI RATE LIMITING)
    if (lastSuccessfulData && (now - lastSuccessfulTime) < SUCCESS_CACHE_DURATION) {
      // Trigger background refresh only if cache is aging
      const cacheAge = now - lastSuccessfulTime;
      if (cacheAge > BACKGROUND_REFRESH_INTERVAL) {
        triggerBackgroundRefresh();
      }
      return NextResponse.json({
        ...lastSuccessfulData,
        cached: true,
        cacheAge: Math.round(cacheAge / 1000)
      });
    }
    
    // 2. Enforce minimum interval between requests (ANTI RATE LIMITING)
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      logger.info(`Rate limiting protection: ${timeSinceLastRequest}ms since last request`);
      if (lastSuccessfulData) {
        return NextResponse.json({
          ...lastSuccessfulData,
          cached: true,
          rateLimited: true,
          cacheAge: Math.round((now - lastSuccessfulTime) / 1000)
        });
      }
      return NextResponse.json(getFallbackData('Too many requests - rate limiting protection'));
    }
    
    // 3. Si tenemos muchos fallos consecutivos, usar exponential backoff
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      const backoffTime = Math.min(consecutiveFailures * 60 * 1000, 300 * 1000); // Max 5 minutos
      if ((now - lastFallbackTime) < backoffTime) {
        logger.info(`Exponential backoff: waiting ${backoffTime}ms after ${consecutiveFailures} failures`);
        if (lastSuccessfulData) {
          return NextResponse.json({
            ...lastSuccessfulData,
            cached: true,
            backoff: true,
            cacheAge: Math.round((now - lastSuccessfulTime) / 1000)
          });
        }
        return NextResponse.json(getFallbackData('Multiple failures - exponential backoff'));
      }
    }
    
    // 4. Intentar ejecutar el scraper con protecciones
    lastRequestTime = now;
    const result = await runPythonScraperWithTimeout();
    
    if (result.success) {
      pythonAvailable = true;
      lastSuccessfulData = result;
      lastSuccessfulTime = now;
      consecutiveFailures = 0; // Reset failure counter
      return NextResponse.json(result);
    } else {
      // Incrementar contador de fallos
      consecutiveFailures++;
      lastFallbackTime = now;
      
      // Detectar rate limiting específicamente
      const isRateLimited = result.error && (
        result.error.includes('429') || 
        result.error.includes('Too Many Requests') ||
        result.error.includes('Could not get valid P2P prices')
      );
      
      if (isRateLimited) {
        logger.warn(`Rate limiting detected! Consecutive failures: ${consecutiveFailures}`);
      }
      
      // Si tenemos datos exitosos antiguos, usarlos como fallback mejorado
      if (lastSuccessfulData) {
        return NextResponse.json({
          ...lastSuccessfulData,
          fallback: true,
          fallbackReason: result.error || 'Binance scraper failed',
          rateLimited: isRateLimited,
          dataAge: Math.round((now - lastSuccessfulTime) / 1000),
          consecutiveFailures
        });
      }
      
      return NextResponse.json(getFallbackData(result.error || 'Binance scraper failed'));
    }
  } catch (error) {
    consecutiveFailures++;
    lastFallbackTime = Date.now();
    
    // Si tenemos datos exitosos antiguos, usarlos
    if (lastSuccessfulData) {
      return NextResponse.json({
        ...lastSuccessfulData,
        fallback: true,
        fallbackReason: 'Failed to run Binance scraper',
        dataAge: Math.round((Date.now() - lastSuccessfulTime) / 1000)
      });
    }
    
    return NextResponse.json(getFallbackData('Failed to run Binance scraper'));
  }
}

function getFallbackData(reason: string) {
  return {
    success: false,
    error: reason,
    data: {
      usd_ves: 300.00,
      usdt_ves: 300.00,
      sell_rate: 302.00,
      buy_rate: 298.00,
      sell_min: 300.00,
      sell_avg: 302.00,
      sell_max: 304.00,
      buy_min: 296.00,
      buy_avg: 298.00,
      buy_max: 300.00,
      overall_min: 296.00,
      overall_max: 304.00,
      spread: 4.00,
      sell_prices_used: 0,
      buy_prices_used: 0,
      prices_used: 0,
      price_range: {
        sell_min: 300.00,
        sell_max: 304.00,
        buy_min: 296.00,
        buy_max: 300.00,
        min: 296.00,
        max: 304.00
      },
      lastUpdated: new Date().toISOString(),
      source: 'Binance P2P (fallback - rate limiting protection)'
    },
    fallback: true,
    consecutiveFailures
  };
}

function triggerBackgroundRefresh() {
  // Solo hacer background refresh si no hay uno en progreso
  if (!backgroundRefreshPromise && lastSuccessfulData) {
    const cacheAge = Date.now() - lastSuccessfulTime;
    // Solo hacer background refresh si el cache tiene más de 20 segundos
    if (cacheAge > BACKGROUND_REFRESH_INTERVAL) {
      backgroundRefreshPromise = runPythonScraperWithTimeout()
        .then((result) => {
          if (result.success) {
            lastSuccessfulData = result;
            lastSuccessfulTime = Date.now();
          }
          backgroundRefreshPromise = null;
        })
        .catch(() => {
          backgroundRefreshPromise = null;
        });
    }
  }
}

// Add backgroundRefreshPromise variable declaration
let backgroundRefreshPromise: Promise<any> | null = null;

function runPythonScraperWithTimeout(): Promise<any> {
  return Promise.race([
    runPythonScraper(),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Scraper timeout - using fallback'));
      }, SCRAPER_TIMEOUT);
    })
  ]);
}

function runPythonScraper(): Promise<any> {
  return new Promise((resolve, reject) => {
    // Using production scraper with delays to avoid rate limiting
    const scriptPath = path.join(process.cwd(), 'scripts', 'binance_scraper_production.py');
    
    // Si ya conocemos el comando Python que funciona, usarlo directamente
    if (pythonCommand) {
      executePythonCommand(pythonCommand, scriptPath, resolve, reject);
      return;
    }
    
    // Probar comandos en orden de probabilidad (Python312 detectado como instalado)
    const pythonCommands = [
      'py', // Windows Python Launcher - most reliable
      'C:\\Users\\alesierraalta\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
      'python'
    ];
    
    let currentCommand = 0;
    
    function tryNextCommand() {
      if (currentCommand >= pythonCommands.length) {
        reject(new Error('No Python interpreter found'));
        return;
      }
      
      const currentPythonCmd = pythonCommands[currentCommand];
      
      executePythonCommand(currentPythonCmd, scriptPath, 
        (result) => {
          // Guardar el comando que funcionó para futuros usos
          pythonCommand = currentPythonCmd;
          resolve(result);
        },
        (error) => {
          currentCommand++;
          tryNextCommand();
        }
      );
    }
    
    tryNextCommand();
  });
}

function executePythonCommand(cmd: string, scriptPath: string, onSuccess: (result: any) => void, onError: (error: Error) => void) {
  logger.info(`🐍 Attempting Python command: ${cmd}`);
  
  const python = spawn(cmd, [scriptPath, '--silent'], {
    timeout: SCRAPER_TIMEOUT, // Timeout de 45 segundos para Ultra-Fast (optimizado para velocidad)
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' } // Force UTF-8 encoding
  });
  
  let output = '';
  let errorOutput = '';
  
  python.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  python.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });
  
  python.on('close', (code) => {
    logger.info(`Python process closed with code: ${code}`);
    
    if (code === 0) {
      try {
        // Clean the output to extract only JSON
        const cleanOutput = output.trim();
        
        // Try to find JSON in the output (in case there's mixed content)
        let jsonOutput = cleanOutput;
        
        // Look for JSON object start
        const jsonStart = cleanOutput.indexOf('{');
        if (jsonStart !== -1) {
          jsonOutput = cleanOutput.substring(jsonStart);
        }
        
        // Look for JSON object end
        const jsonEnd = jsonOutput.lastIndexOf('}');
        if (jsonEnd !== -1) {
          jsonOutput = jsonOutput.substring(0, jsonEnd + 1);
        }
        
        const result = JSON.parse(jsonOutput);
        logger.info(`✅ Python command successful: ${cmd}`);
        logger.info(`📊 Scraped data: ${result.data?.prices_used || 0} prices, sell: ${result.data?.sell_avg || 0}, buy: ${result.data?.buy_avg || 0}`);
        onSuccess(result);
      } catch (parseError) {
        logger.error('❌ Parse error:', parseError);
        logger.error('Raw output (first 500 chars):', output.substring(0, 500));
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        onError(new Error(`Failed to parse Binance scraper output: ${errorMessage}. Raw output: ${output.substring(0, 200)}...`));
      }
    } else {
      logger.info(`❌ Python command failed: ${cmd} (code: ${code})`);
      if (errorOutput) logger.error('stderr:', errorOutput);
      onError(new Error(`Python command failed with code ${code}. stderr: ${errorOutput}`));
    }
  });
  
  python.on('error', (error) => {
    logger.info(`❌ Python spawn error for ${cmd}:`, error);
    onError(error);
  });
  
  // Timeout adicional por si acaso
  setTimeout(() => {
    if (!python.killed) {
      python.kill();
      onError(new Error('Binance scraper timeout'));
    }
  }, SCRAPER_TIMEOUT);
}

// Alternative endpoint for CORS-enabled requests
export async function POST() {
  return GET();
}