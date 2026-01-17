# Script para agregar mem0-mcp-server a la configuración MCP de Antigravity
# Este script actualiza el archivo mcp_config.json de Antigravity

$mcpConfigPath = Join-Path $env:USERPROFILE ".gemini\antigravity\mcp_config.json"

Write-Host "=== Configurando mem0-mcp-server en Antigravity ===" -ForegroundColor Cyan
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

# Leer el archivo JSON
try {
    $config = Get-Content $mcpConfigPath -Raw | ConvertFrom-Json
}
catch {
    Write-Host "Error al leer el archivo de configuracion: $_" -ForegroundColor Red
    exit 1
}

# Verificar si mem0 ya está configurado
if ($config.mcpServers.PSObject.Properties.Name -contains "mem0") {
    Write-Host "mem0 ya esta configurado en mcp_config.json" -ForegroundColor Yellow
    Write-Host ""
    $overwrite = Read-Host "Deseas sobrescribir la configuracion existente? (s/n)"
    if ($overwrite -ne "s") {
        Write-Host "Operacion cancelada" -ForegroundColor Red
        exit 0
    }
}

# Solicitar API Key
Write-Host "Configuracion de mem0-mcp-server:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para obtener tu API Key:" -ForegroundColor Yellow
Write-Host "  1. Visita https://app.mem0.ai" -ForegroundColor Gray
Write-Host "  2. Crea una cuenta o inicia sesion" -ForegroundColor Gray
Write-Host "  3. Genera una API Key" -ForegroundColor Gray
Write-Host ""

$apiKey = Read-Host "Ingresa tu MEM0_API_KEY (o presiona Enter para configurar despues)"
if ([string]::IsNullOrWhiteSpace($apiKey)) {
    $apiKey = "m0-YOUR-API-KEY-HERE"
    Write-Host "Se usara un placeholder. Deberas actualizar la API Key despues." -ForegroundColor Yellow
}

$userId = Read-Host "Ingresa el USER_ID por defecto (presiona Enter para usar 'fintec-user')"
if ([string]::IsNullOrWhiteSpace($userId)) {
    $userId = "fintec-user"
}

# Crear la configuración de mem0
$uvxPath = Join-Path $env:USERPROFILE ".local\bin\uvx.exe"
$mem0Config = @{
    command = $uvxPath
    args    = @("mem0-mcp-server")
    env     = @{
        MEM0_API_KEY              = $apiKey
        MEM0_DEFAULT_USER_ID      = $userId
        MEM0_ENABLE_GRAPH_DEFAULT = "false"
    }
}

# Agregar o actualizar la configuración
$config.mcpServers | Add-Member -MemberType NoteProperty -Name "mem0" -Value $mem0Config -Force

# Crear backup del archivo original
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "$mcpConfigPath.backup.$timestamp"
Copy-Item $mcpConfigPath $backupPath
Write-Host ""
Write-Host "Backup creado: $backupPath" -ForegroundColor Green

# Guardar la configuración actualizada
try {
    $config | ConvertTo-Json -Depth 10 | Set-Content $mcpConfigPath -Encoding UTF8
    Write-Host "Configuracion actualizada exitosamente" -ForegroundColor Green
}
catch {
    Write-Host "Error al guardar la configuracion: $_" -ForegroundColor Red
    Write-Host "   Restaurando backup..." -ForegroundColor Yellow
    Copy-Item $backupPath $mcpConfigPath -Force
    exit 1
}

Write-Host ""
Write-Host "=== Resumen de configuracion ===" -ForegroundColor Cyan
Write-Host "Servidor MCP: mem0" -ForegroundColor Gray
Write-Host "Comando: $uvxPath" -ForegroundColor Gray
Write-Host "Args: mem0-mcp-server" -ForegroundColor Gray
$maskedKey = if ($apiKey.Length -gt 10) { $apiKey.Substring(0, 10) + "..." } else { "***" }
Write-Host "API Key: $maskedKey" -ForegroundColor Gray
Write-Host "User ID: $userId" -ForegroundColor Gray
Write-Host ""
Write-Host "mem0-mcp-server configurado correctamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Reinicia Antigravity para que los cambios surtan efecto" -ForegroundColor Yellow
Write-Host "  2. Verifica que mem0 aparezca en la lista de servidores MCP" -ForegroundColor Yellow
if ($apiKey -eq "m0-YOUR-API-KEY-HERE") {
    Write-Host "  3. Actualiza la API Key en $mcpConfigPath" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "=== Configuracion completa ===" -ForegroundColor Green
