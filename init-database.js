// Script to initialize database with sample data
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function initializeDatabase() {
  console.log('Initializing database with sample data...');
  
  try {
    // Call the init-database API endpoint
    const powershellCommand = `powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://localhost:3002/api/init-database' -Method POST; $response | ConvertTo-Json -Compress } catch { Write-Output '{\"success\": false, \"error\": \"' + $_.Exception.Message + '\"}' }"`;
    
    const { stdout } = await execPromise(powershellCommand);
    const result = JSON.parse(stdout.trim());
    
    if (result.success) {
      console.log('✓ Database initialized successfully!');
      console.log('Message:', result.message);
    } else {
      console.error('✗ Failed to initialize database:', result.error);
    }
    
  } catch (error) {
    console.error('Error initializing database:', error.message);
  }
}

initializeDatabase();