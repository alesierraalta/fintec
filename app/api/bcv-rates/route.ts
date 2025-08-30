import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Cache optimizado para datos exitosos y errores
let pythonAvailable: boolean | null = null;
let pythonCommand: string | null = null; // Guardar el comando que funciona
let lastFallbackTime = 0;
let lastSuccessfulData: any = null;
let lastSuccessfulTime = 0;
const FALLBACK_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const SUCCESS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutos para datos exitosos

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
    
    // 3. Intentar ejecutar el scraper de Python
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
          fallbackReason: result.error || 'Python scraper failed',
          dataAge: Math.round((now - lastSuccessfulTime) / 1000)
        });
      }
      
      return NextResponse.json(getFallbackData(result.error || 'Python scraper failed'));
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
        fallbackReason: 'Failed to run BCV scraper',
        dataAge: Math.round((Date.now() - lastSuccessfulTime) / 1000)
      });
    }
    
    return NextResponse.json(getFallbackData('Failed to run BCV scraper'));
  }
}

function getFallbackData(reason: string) {
  return {
    success: false,
    error: reason,
    data: {
      usd: 139.00,
      eur: 162.53,
      lastUpdated: new Date().toISOString(),
      source: 'BCV (fallback - Python no disponible)'
    },
    fallback: true
  };
}

function runPythonScraper(): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'bcv_scraper.py');
    
    // Si ya conocemos el comando Python que funciona, usarlo directamente
    if (pythonCommand) {
      executePythonCommand(pythonCommand, scriptPath, resolve, reject);
      return;
    }
    
    // Si no, probar comandos en orden de probabilidad
    const pythonCommands = ['python', 'python3', 'py'];
    
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
  const python = spawn(cmd, [scriptPath], {
    timeout: 8000 // Timeout total de 8 segundos
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
    if (code === 0) {
      try {
        const result = JSON.parse(output);
        onSuccess(result);
      } catch (parseError) {
        onError(new Error('Failed to parse Python scraper output'));
      }
    } else {
      onError(new Error(`Python command failed with code ${code}`));
    }
  });
  
  python.on('error', (error) => {
    onError(error);
  });
  
  // Timeout adicional por si acaso
  setTimeout(() => {
    if (!python.killed) {
      python.kill();
      onError(new Error('Python command timeout'));
    }
  }, 8000);
}

// Alternative endpoint for CORS-enabled requests
export async function POST() {
  return GET();
}
