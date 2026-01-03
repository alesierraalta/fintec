const { spawn } = require('child_process');

// Configuración
const command = 'npx';
const args = ['-y', '@allpepper/memory-bank-mcp'];

const child = spawn(command, args, {
    stdio: ['inherit', 'pipe', 'inherit'], // Interceptamos stdout
    shell: true,
    env: process.env
});

child.stdout.on('data', (data) => {
    const output = data.toString();
    // El servidor imprime esta línea al inicio que rompe el protocolo MCP (JSON)
    // "Memory Bank MCP server running on stdio"
    // Filtramos esa línea específica o cualquier texto que empiece con "Memory Bank" para evitar el error "invalid character 'M'"
    if (output.trim().startsWith('Memory Bank') || output.includes('running on stdio')) {
        // Opcional: escribirlo en stderr para depuración si se desea
        // process.stderr.write('[Filtered]: ' + output);
        return;
    }
    // Pasar el resto (JSON válido) tal cual
    process.stdout.write(data);
});

child.on('close', (code) => {
    process.exit(code);
});
