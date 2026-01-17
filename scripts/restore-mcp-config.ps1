# Script de restauración segura de mcp_config.json
# Este script restaura todos los MCPs incluyendo mem0

$mcpConfigPath = Join-Path $env:USERPROFILE ".gemini\antigravity\mcp_config.json"
$sourceConfigPath = "c:\Users\ismar\Documents\projects\fintec\mcp_config_fixed.json"

Write-Host "=== Restauracion de Configuracion MCP ===" -ForegroundColor Cyan
Write-Host ""

# Verificar que el archivo fuente existe
if (-not (Test-Path $sourceConfigPath)) {
    Write-Host "Error: Archivo de configuracion fuente no encontrado" -ForegroundColor Red
    Write-Host "   Ruta esperada: $sourceConfigPath" -ForegroundColor Yellow
    exit 1
}

Write-Host "Archivo fuente encontrado" -ForegroundColor Green
Write-Host "   Origen: $sourceConfigPath" -ForegroundColor Gray
Write-Host "   Destino: $mcpConfigPath" -ForegroundColor Gray
Write-Host ""

# Validar JSON antes de copiar
try {
    $testConfig = Get-Content $sourceConfigPath -Raw | ConvertFrom-Json
    Write-Host "JSON validado correctamente" -ForegroundColor Green
    
    # Mostrar servidores que serán configurados
    $servers = $testConfig.mcpServers.PSObject.Properties.Name
    Write-Host "Servidores a configurar ($($servers.Count)):" -ForegroundColor Cyan
    foreach ($server in $servers) {
        Write-Host "   - $server" -ForegroundColor Gray
    }
    Write-Host ""
}
catch {
    Write-Host "Error: El archivo JSON no es valido" -ForegroundColor Red
    Write-Host "   $_" -ForegroundColor Yellow
    exit 1
}

# Crear backup del archivo actual
if (Test-Path $mcpConfigPath) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupPath = "$mcpConfigPath.backup.$timestamp"
    Copy-Item $mcpConfigPath $backupPath
    Write-Host "Backup creado: $backupPath" -ForegroundColor Green
    Write-Host ""
}

# Copiar el archivo corregido
try {
    Copy-Item $sourceConfigPath $mcpConfigPath -Force
    Write-Host "Configuracion restaurada exitosamente" -ForegroundColor Green
}
catch {
    Write-Host "Error al copiar la configuracion: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Verificando configuracion ===" -ForegroundColor Cyan

# Verificar que el archivo destino es válido
try {
    $finalConfig = Get-Content $mcpConfigPath -Raw | ConvertFrom-Json
    $finalServers = $finalConfig.mcpServers.PSObject.Properties.Name
    
    Write-Host "Servidores MCP configurados ($($finalServers.Count)):" -ForegroundColor Green
    foreach ($server in $finalServers) {
        Write-Host "   OK - $server" -ForegroundColor Green
    }
}
catch {
    Write-Host "Error: La configuracion final no es valida" -ForegroundColor Red
    Write-Host "   $_" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=== Restauracion completa ===" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Reinicia Antigravity" -ForegroundColor Yellow
Write-Host "  2. Verifica que todos los MCPs aparezcan activos" -ForegroundColor Yellow
Write-Host "  3. Si hay problemas, restaura desde el backup" -ForegroundColor Yellow
Write-Host ""
