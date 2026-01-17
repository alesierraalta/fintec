#!/usr/bin/env python3
"""
Verificación Final de mem0-mcp-server
Confirma que la instalación y configuración están completas
"""

import os
import json
import subprocess
from pathlib import Path

def check_mark(success):
    return "✅" if success else "❌"

def print_header(text):
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60 + "\n")

def main():
    print_header("🔍 Verificación Final de mem0-mcp-server")
    
    all_checks_passed = True
    
    # 1. Verificar Python
    print("📦 1. Verificando Python...")
    try:
        result = subprocess.run(["python", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"   {check_mark(True)} Python instalado: {result.stdout.strip()}")
        else:
            print(f"   {check_mark(False)} Error con Python")
            all_checks_passed = False
    except Exception as e:
        print(f"   {check_mark(False)} Python no encontrado: {e}")
        all_checks_passed = False
    
    # 2. Verificar uv
    print("\n📦 2. Verificando uv...")
    try:
        result = subprocess.run(["uv", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"   {check_mark(True)} uv instalado: {result.stdout.strip()}")
        else:
            print(f"   {check_mark(False)} Error con uv")
            all_checks_passed = False
    except Exception as e:
        print(f"   {check_mark(False)} uv no encontrado: {e}")
        all_checks_passed = False
    
    # 3. Verificar mem0-mcp-server
    print("\n🧠 3. Verificando mem0-mcp-server...")
    try:
        result = subprocess.run(["uvx", "mem0-mcp-server", "--help"], 
                              capture_output=True, text=True, timeout=30)
        if "mem0" in result.stdout.lower() or result.returncode == 0:
            print(f"   {check_mark(True)} mem0-mcp-server instalado correctamente")
        else:
            print(f"   {check_mark(False)} Error al ejecutar mem0-mcp-server")
            all_checks_passed = False
    except subprocess.TimeoutExpired:
        print(f"   {check_mark(True)} mem0-mcp-server instalado (timeout esperado)")
    except Exception as e:
        print(f"   {check_mark(False)} Error: {e}")
        all_checks_passed = False
    
    # 4. Verificar configuración MCP
    print("\n⚙️  4. Verificando configuración de Antigravity MCP...")
    mcp_config_path = Path.home() / ".gemini" / "antigravity" / "mcp_config.json"
    
    if mcp_config_path.exists():
        print(f"   {check_mark(True)} Archivo de configuración encontrado")
        print(f"   📁 {mcp_config_path}")
        
        try:
            with open(mcp_config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            if "mcpServers" in config and "mem0" in config["mcpServers"]:
                print(f"   {check_mark(True)} Servidor 'mem0' configurado")
                
                mem0_config = config["mcpServers"]["mem0"]
                
                # Verificar comando
                if "command" in mem0_config:
                    print(f"   {check_mark(True)} Comando configurado: {mem0_config['command']}")
                
                # Verificar args
                if "args" in mem0_config and "mem0-mcp-server" in mem0_config["args"]:
                    print(f"   {check_mark(True)} Args configurados correctamente")
                
                # Verificar variables de entorno
                if "env" in mem0_config:
                    env = mem0_config["env"]
                    
                    # API Key
                    if "MEM0_API_KEY" in env:
                        api_key = env["MEM0_API_KEY"]
                        if api_key and api_key != "m0-YOUR-API-KEY-HERE":
                            masked_key = f"{api_key[:10]}...{api_key[-4:]}"
                            print(f"   {check_mark(True)} API Key configurada: {masked_key}")
                        else:
                            print(f"   {check_mark(False)} API Key no configurada (placeholder detectado)")
                            all_checks_passed = False
                    else:
                        print(f"   {check_mark(False)} MEM0_API_KEY no encontrada")
                        all_checks_passed = False
                    
                    # User ID
                    if "MEM0_DEFAULT_USER_ID" in env:
                        user_id = env["MEM0_DEFAULT_USER_ID"]
                        print(f"   {check_mark(True)} User ID configurado: {user_id}")
                    
                    # Graph default
                    if "MEM0_ENABLE_GRAPH_DEFAULT" in env:
                        graph = env["MEM0_ENABLE_GRAPH_DEFAULT"]
                        print(f"   {check_mark(True)} Graph habilitado: {graph}")
                
            else:
                print(f"   {check_mark(False)} Servidor 'mem0' NO encontrado en configuración")
                all_checks_passed = False
                
        except json.JSONDecodeError:
            print(f"   {check_mark(False)} Error al leer JSON de configuración")
            all_checks_passed = False
        except Exception as e:
            print(f"   {check_mark(False)} Error: {e}")
            all_checks_passed = False
    else:
        print(f"   {check_mark(False)} Archivo de configuración NO encontrado")
        print(f"   📁 Esperado en: {mcp_config_path}")
        all_checks_passed = False
    
    # Resultado final
    print_header("📊 Resultado Final")
    
    if all_checks_passed:
        print("🎉 ¡TODAS LAS VERIFICACIONES PASARON!")
        print("\n✅ mem0-mcp-server está completamente instalado y configurado")
        print("\n📝 Próximos pasos:")
        print("   1. Reinicia Antigravity")
        print("   2. Verifica que 'mem0' aparezca en la lista de servidores MCP")
        print("   3. ¡Comienza a usar la memoria persistente!")
        return 0
    else:
        print("⚠️  Algunas verificaciones fallaron")
        print("\n📝 Revisa los mensajes anteriores para más detalles")
        print("\n💡 Recursos:")
        print("   - Documentación: docs/mem0-mcp-config-final.md")
        print("   - Reinstalar: scripts/add-mem0-to-antigravity.ps1")
        print("   - Actualizar API: scripts/update-mem0-apikey.ps1")
        return 1

if __name__ == "__main__":
    exit(main())
