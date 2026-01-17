# Script para actualizar la API Key de mem0 en la configuración MCP de Antigravity

$mcpConfigPath = Join-Path $env:USERPROFILE ".gemini\antigravity\mcp_config.json"
$apiKey = "m0-Ho63wqGUvcIUN7JuRrM9aXGiZCpQhMTyKE8WKHgx"

Write-Host "=== Actualizando API Key de mem0-mcp-server ===" -ForegroundColor Cyan
Write-Host ""

# Verificar si el archivo existe
if (-not (Test-Path $mcpConfigPath)) {
    Write-Host "Error: No se encontro el archivo de configuracion MCP" -ForegroundColor Red
    Write-Host "   Ruta esperada: $mcpConfigPath" -ForegroundColor Yellow
    exit 1
}

Write-Host "Archivo de configuracion encontrado" -ForegroundColor Green
Write-Host "   Ruta: $mcpConfigPath" -ForegroundColor Gray
Write-Host ""

# Crear backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "$mcpConfigPath.backup.$timestamp"
Copy-Item $mcpConfigPath $backupPath
Write-Host "Backup creado: $backupPath" -ForegroundColor Green
Write-Host ""

# Leer el archivo JSON
try {
    $config = Get-Content $mcpConfigPath -Raw | ConvertFrom-Json
}
catch {
    Write-Host "Error al leer el archivo de configuracion: $_" -ForegroundColor Red
    exit 1
}

# Verificar si mem0 existe en la configuración
if (-not ($config.mcpServers.PSObject.Properties.Name -contains "mem0")) {
    Write-Host "Error: mem0 no esta configurado en mcp_config.json" -ForegroundColor Red
    Write-Host "   Ejecuta primero: .\scripts\add-mem0-to-antigravity.ps1" -ForegroundColor Yellow
    exit 1
}

# Actualizar la API Key
$config.mcpServers.mem0.env.MEM0_API_KEY = $apiKey
Write-Host "API Key actualizada" -ForegroundColor Green

# Guardar la configuración actualizada
try {
    $config | ConvertTo-Json -Depth 10 | Set-Content $mcpConfigPath -Encoding UTF8
    Write-Host "Configuracion guardada exitosamente" -ForegroundColor Green
}
catch {
    Write-Host "Error al guardar la configuracion: $_" -ForegroundColor Red
    Write-Host "   Restaurando backup..." -ForegroundColor Yellow
    Copy-Item $backupPath $mcpConfigPath -Force
    exit 1
}

Write-Host ""
Write-Host "=== Configuracion actualizada ===" -ForegroundColor Cyan
Write-Host "Servidor MCP: mem0" -ForegroundColor Gray
Write-Host "API Key: m0-Ho63wqG..." -ForegroundColor Gray
Write-Host "User ID: fintec-user" -ForegroundColor Gray
Write-Host ""
Write-Host "mem0-mcp-server configurado completamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Reinicia Antigravity para que los cambios surtan efecto" -ForegroundColor Yellow
Write-Host "  2. Verifica que mem0 aparezca activo en la lista de servidores MCP" -ForegroundColor Yellow
Write-Host "  3. Prueba las herramientas de memoria en tus conversaciones" -ForegroundColor Yellow
Write-Host ""
Write-Host "=== Listo para usar! ===" -ForegroundColor Green
