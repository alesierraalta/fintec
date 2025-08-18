import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function GET() {
  try {
    // Run the Python scraper
    const result = await runPythonScraper();
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      // Return fallback data if Python scraper fails
      return NextResponse.json({
        success: false,
        error: result.error || 'Python scraper failed',
        data: {
          usd: 36.50,
          eur: 39.80,
          lastUpdated: new Date().toISOString(),
          source: 'BCV (fallback - scraper failed)'
        },
        fallback: true
      });
    }
  } catch (error) {
    console.error('Error running BCV scraper:', error);
    
    // Return fallback data if everything fails
    return NextResponse.json({
      success: false,
      error: 'Failed to run BCV scraper',
      data: {
        usd: 36.50,
        eur: 39.80,
        lastUpdated: new Date().toISOString(),
        source: 'BCV (fallback - system error)'
      },
      fallback: true
    });
  }
}

function runPythonScraper(): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'bcv_scraper.py');
    
    // Try different Python commands
    const pythonCommands = ['python3', 'python', 'py'];
    
    let currentCommand = 0;
    
    function tryNextCommand() {
      if (currentCommand >= pythonCommands.length) {
        reject(new Error('No Python interpreter found'));
        return;
      }
      
      const python = spawn(pythonCommands[currentCommand], [scriptPath]);
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
            resolve(result);
          } catch (parseError) {
            console.error('Error parsing Python output:', parseError);
            console.error('Python output:', output);
            reject(new Error('Failed to parse Python scraper output'));
          }
        } else {
          console.error(`Python script failed with code ${code}`);
          console.error('Error output:', errorOutput);
          currentCommand++;
          tryNextCommand();
        }
      });
      
      python.on('error', (error) => {
        console.error(`Error spawning Python process:`, error);
        currentCommand++;
        tryNextCommand();
      });
    }
    
    tryNextCommand();
  });
}

// Alternative endpoint for CORS-enabled requests
export async function POST() {
  return GET();
}
