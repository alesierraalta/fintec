import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Cache optimizado para datos de Binance
let pythonAvailable: boolean | null = null;
let pythonCommand: string | null = null;
let lastFallbackTime = 0;
let lastSuccessfulData: any = null;
let lastSuccessfulTime = 0;
const FALLBACK_CACHE_DURATION = 30 * 1000; // 30 segundos (reducido para debugging)
const SUCCESS_CACHE_DURATION = 1 * 60 * 1000; // 1 minuto para datos exitosos (más frecuente que BCV)

export async function GET() {
  try {
    const now = Date.now();
    
    // 1. Si tenemos datos exitosos recientes, devolverlos inmediatamente
    if (lastSuccessfulData && (now - lastSuccessfulTime) < SUCCESS_CACHE_DURATION) {
      return NextResponse.json({
        ...lastSuccessfulData,
        cached: true,
        cacheAge: Math.round((now - lastSuccessfulTime) / 1000)
      });
    }
    
    // 2. Si sabemos que Python no está disponible y el cache de error es reciente, devolver fallback
    if (pythonAvailable === false && (now - lastFallbackTime) < FALLBACK_CACHE_DURATION) {
      return NextResponse.json(getFallbackData('Python no disponible (cached)'));
    }
    
    // 3. Intentar ejecutar el scraper de Python para Binance
    const result = await runPythonScraper();
    
    if (result.success) {
      pythonAvailable = true;
      lastSuccessfulData = result;
      lastSuccessfulTime = now;
      return NextResponse.json(result);
    } else {
      // Marcar Python como no disponible y usar fallback
      pythonAvailable = false;
      lastFallbackTime = now;
      
      // Si tenemos datos exitosos antiguos, usarlos como fallback mejorado
      if (lastSuccessfulData) {
        return NextResponse.json({
          ...lastSuccessfulData,
          fallback: true,
          fallbackReason: result.error || 'Binance scraper failed',
          dataAge: Math.round((now - lastSuccessfulTime) / 1000)
        });
      }
      
      return NextResponse.json(getFallbackData(result.error || 'Binance scraper failed'));
    }
  } catch (error) {
    // Marcar Python como no disponible
    pythonAvailable = false;
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
      usd_ves: 228.50,
      usdt_ves: 228.50,
      prices_used: 0,
      price_range: { min: 228.50, max: 228.50 },
      lastUpdated: new Date().toISOString(),
      source: 'Binance P2P (fallback - Python no disponible)'
    },
    fallback: true
  };
}

function runPythonScraper(): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'binance_scraper_fast.py');
    
    // Si ya conocemos el comando Python que funciona, usarlo directamente
    if (pythonCommand) {
      executePythonCommand(pythonCommand, scriptPath, resolve, reject);
      return;
    }
    
    // Si no, probar comandos en orden de probabilidad (incluyendo rutas completas)
    const pythonCommands = [
      'C:\\Users\\alesierraalta\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
      'C:\\Users\\alesierraalta\\AppData\\Local\\Programs\\Python\\Python310\\python.exe',
      'C:\\Users\\alesierraalta\\AppData\\Local\\Programs\\Python\\Python313\\python.exe',
      'python', 
      'python3', 
      'py'
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
  const python = spawn(cmd, [scriptPath, '--silent'], {
    timeout: 90000 // Timeout de 90 segundos para Binance Fast (optimizado para API)
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
    console.log(`Python process closed with code: ${code}`);
    console.log(`Python stdout: ${output}`);
    console.log(`Python stderr: ${errorOutput}`);
    
    if (code === 0) {
      try {
        const result = JSON.parse(output);
        onSuccess(result);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        onError(new Error(`Failed to parse Binance scraper output: ${errorMessage}`));
      }
    } else {
      onError(new Error(`Python command failed with code ${code}. stderr: ${errorOutput}`));
    }
  });
  
  python.on('error', (error) => {
    console.error('Python spawn error:', error);
    onError(error);
  });
  
  // Timeout adicional por si acaso
  setTimeout(() => {
    if (!python.killed) {
      python.kill();
      onError(new Error('Binance scraper timeout'));
    }
  }, 90000);
}

// Alternative endpoint for CORS-enabled requests
export async function POST() {
  return GET();
}