# Mem0 MCP Server - Instalación y Configuración

## ¿Qué es Mem0 MCP?

**mem0-mcp-server** es un servidor que implementa el Model Context Protocol (MCP) y proporciona memoria persistente para aplicaciones de IA. Permite que asistentes de IA como Claude Desktop, Cursor u otros clientes MCP puedan:

- 🧠 **Almacenar y recuperar memorias a largo plazo**
- 🔍 **Buscar semánticamente información almacenada**
- ✏️ **Actualizar y eliminar memorias**
- 👤 **Organizar memorias por usuario, agente, app o sesión**

## ✅ Estado de la Instalación

- ✅ **Python 3.13.11** instalado
- ✅ **uv 0.9.18** instalado
- ✅ **mem0-mcp-server** instalado correctamente

## 📋 Pasos Pendientes para Configuración

### 1. Obtener API Key de Mem0

1. Visita [app.mem0.ai](https://app.mem0.ai)
2. Crea una cuenta o inicia sesión
3. Genera una API Key (formato: `m0-...`)

### 2. Configurar Variables de Entorno

Agrega las siguientes variables de entorno a tu sistema o archivo `.env`:

```bash
# API Key de Mem0 (REQUERIDO)
MEM0_API_KEY=m0-tu-api-key-aqui

# ID de usuario por defecto (OPCIONAL, default: mem0-mcp)
MEM0_DEFAULT_USER_ID=fintec-user

# Habilitar memorias de grafo (OPCIONAL, default: false)
MEM0_ENABLE_GRAPH_DEFAULT=false

# Modelo LLM para el agente de ejemplo (OPCIONAL, default: openai:gpt-4o-mini)
MEM0_MCP_AGENT_MODEL=openai:gpt-4o-mini
```

### 3. Configurar Cliente MCP

#### Para Claude Desktop

Edita el archivo de configuración de Claude Desktop (ubicación típica en Windows):
`%APPDATA%\Claude\claude_desktop_config.json`

Agrega esta configuración:

```json
{
  "mcpServers": {
    "mem0": {
      "command": "uvx",
      "args": ["mem0-mcp-server"],
      "env": {
        "MEM0_API_KEY": "m0-tu-api-key-aqui",
        "MEM0_DEFAULT_USER_ID": "fintec-user"
      }
    }
  }
}
```

#### Para Cursor (Gemini)

Si estás usando este servidor con Gemini/Cursor, puedes configurarlo en el archivo de configuración MCP de Gemini.

### 4. Verificar la Instalación

Ejecuta este comando para verificar que el servidor funciona:

```bash
uvx mem0-mcp-server --help
```

## 🛠️ Herramientas Disponibles

Una vez configurado, mem0 MCP proporciona las siguientes herramientas:

| Herramienta | Descripción |
|------------|-------------|
| `add_memory` | Guardar texto o historial de conversación |
| `search_memories` | Búsqueda semántica de memorias |
| `get_memories` | Recuperar memorias con filtros estructurados |
| `get_memory` | Obtener una memoria específica por ID |
| `update_memory` | Modificar memorias existentes |
| `delete_memory` | Eliminar una memoria específica |
| `delete_all_memories` | Eliminar todas las memorias |
| `delete_entities` | Eliminar entidades y sus memorias |
| `list_entities` | Listar usuarios, agentes, apps o runs |

## 🔧 Configuración Avanzada

### Uso con Docker

Si prefieres usar Docker:

```bash
docker run -e MEM0_API_KEY=m0-tu-key mem0-mcp-server
```

### Desarrollo Local

Para desarrollo con el agente de ejemplo de Python:

```bash
# Instalar el paquete
uv pip install mem0-mcp-server --system

# Configurar variables de entorno
set MEM0_API_KEY=m0-tu-key
set OPENAI_API_KEY=sk-openai-tu-key

# Clonar repositorio y probar
git clone https://github.com/mem0ai/mem0-mcp.git
cd mem0-mcp-server
python example/pydantic_ai_repl.py
```

## 📚 Recursos

- [Repositorio oficial mem0-mcp](https://github.com/mem0ai/mem0-mcp)
- [Documentación de Mem0](https://docs.mem0.ai/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Mem0 Platform](https://app.mem0.ai)

## ⚠️ Notas Importantes

> [!WARNING]
> La API Key de Mem0 (`MEM0_API_KEY`) es **OBLIGATORIA** para que el servidor funcione. Sin ella, todas las invocaciones de herramientas fallarán.

> [!TIP]
> Usa `MEM0_DEFAULT_USER_ID` para organizar memorias específicas de tu aplicación FinTec y diferenciarlas de otras aplicaciones.

> [!IMPORTANT]
> El servidor necesita salida estándar limpia. Otras bibliotecas escribiendo en stdout pueden interferir con el protocolo MCP.

## 🚀 Próximos Pasos

1. **Obtener tu API Key de Mem0** de [app.mem0.ai](https://app.mem0.ai)
2. **Configurar variables de entorno** según se indicó arriba
3. **Configurar tu cliente MCP** (Claude Desktop, Cursor, etc.)
4. **Probar el servidor** con las herramientas disponibles
5. **Integrar en tu flujo de trabajo** de FinTec

---

**Instalado el:** 2026-01-09  
**Versión de Python:** 3.13.11  
**Versión de uv:** 0.9.18  
**Estado:** ✅ Instalado, pendiente de configuración
