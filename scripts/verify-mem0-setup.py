#!/usr/bin/env python3
"""
Script de verificación para mem0-mcp-server
Verifica que todas las dependencias y configuraciones estén correctamente instaladas.
"""

import sys
import subprocess
import os
from typing import Tuple, List

def check_command(command: str, args: List[str] = ["--version"]) -> Tuple[bool, str]:
    """Verifica si un comando está disponible."""
    try:
        result = subprocess.run(
            [command] + args,
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            return True, result.stdout.strip()
        return False, result.stderr.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired) as e:
        return False, str(e)

def check_env_var(var_name: str) -> Tuple[bool, str]:
    """Verifica si una variable de entorno está configurada."""
    value = os.getenv(var_name)
    if value:
        # Ocultar el valor real por seguridad
        masked = f"{value[:5]}...{value[-4:]}" if len(value) > 9 else "***"
        return True, masked
    return False, "No configurada"

def print_status(check_name: str, success: bool, message: str):
    """Imprime el estado de una verificación."""
    symbol = "✅" if success else "❌"
    print(f"{symbol} {check_name}: {message}")

def main():
    print("=" * 60)
    print("🔍 Verificación de mem0-mcp-server")
    print("=" * 60)
    print()

    # Verificar Python
    print("📦 Verificando dependencias del sistema:")
    success, version = check_command("python", ["--version"])
    print_status("Python", success, version)

    # Verificar uv
    success, version = check_command("uv", ["--version"])
    print_status("uv", success, version)

    print()

    # Verificar mem0-mcp-server
    print("🧠 Verificando mem0-mcp-server:")
    success, message = check_command("uvx", ["mem0-mcp-server", "--help"])
    print_status("mem0-mcp-server instalado", success, 
                "Instalado correctamente" if success else "No instalado o error")

    print()

    # Verificar variables de entorno
    print("🔑 Verificando configuración:")
    success, value = check_env_var("MEM0_API_KEY")
    print_status("MEM0_API_KEY", success, value)

    success, value = check_env_var("MEM0_DEFAULT_USER_ID")
    print_status("MEM0_DEFAULT_USER_ID (opcional)", success, 
                value if success else "No configurada (usará 'mem0-mcp' por defecto)")

    success, value = check_env_var("MEM0_ENABLE_GRAPH_DEFAULT")
    print_status("MEM0_ENABLE_GRAPH_DEFAULT (opcional)", success,
                value if success else "No configurada (usará 'false' por defecto)")

    print()
    print("=" * 60)

    # Verificar si hay configuración de Claude Desktop
    claude_config_paths = [
        os.path.expandvars(r"%APPDATA%\Claude\claude_desktop_config.json"),
        os.path.expanduser("~/Library/Application Support/Claude/claude_desktop_config.json"),
        os.path.expanduser("~/.config/claude/claude_desktop_config.json")
    ]

    print("📋 Verificando configuración de Claude Desktop:")
    found_config = False
    for config_path in claude_config_paths:
        if os.path.exists(config_path):
            print(f"✅ Configuración encontrada: {config_path}")
            found_config = True
            break
    
    if not found_config:
        print("❌ No se encontró configuración de Claude Desktop")
        print("   📝 Ver docs/mem0-claude-config.example.json para ejemplo")

    print()
    print("=" * 60)
    print("📊 Resumen:")
    
    mem0_key_set = bool(os.getenv("MEM0_API_KEY"))
    
    if mem0_key_set:
        print("✅ mem0-mcp-server está instalado y configurado")
        print("🚀 Puedes empezar a usar mem0 MCP en tus clientes")
    else:
        print("⚠️  mem0-mcp-server está instalado pero MEM0_API_KEY no está configurada")
        print("📝 Pasos siguientes:")
        print("   1. Obtén tu API key de https://app.mem0.ai")
        print("   2. Configura la variable de entorno MEM0_API_KEY")
        print("   3. Configura tu cliente MCP (ver docs/mem0-mcp-setup.md)")

    print("=" * 60)

if __name__ == "__main__":
    main()
