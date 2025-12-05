# Plan de Implementación: Promedios Mensuales y Corrección de Temperature

## 📋 Resumen Ejecutivo

Este documento detalla el plan para resolver dos problemas críticos:
1. **Error de Temperature**: GPT-5-nano solo soporta `temperature=1`, pero el código usa `0.3`
2. **Funcionalidad faltante**: Implementar consulta de promedios mensuales de ingresos y gastos

---

## 🔍 Análisis del Problema

### Problema 1: Error de Temperature

**Error observado:**
```
400 Unsupported value: 'temperature' does not support 0.3 with this model. 
Only the default (1) value is supported.
```

**Causa raíz:**
- El modelo `gpt-5-nano` tiene `temperature` fijo en `1` por diseño de OpenAI
- El código actual usa `AI_TEMPERATURE = 0.3` en múltiples archivos
- Los modelos GPT-5 no permiten personalización de temperature

**Archivos afectados:**
- `lib/ai/config.ts` (definición)
- `lib/ai/agent/core/response-generator.ts`
- `lib/ai/advisor.ts`
- `lib/ai/anomaly-detection.ts`
- `lib/ai/budget-optimizer.ts`
- `lib/ai/categorization.ts`
- `lib/ai/predictions.ts`
- `lib/ai/memory/short-term-memory.ts`
- `lib/ai/memory/memory-extractor.ts`

### Problema 2: Promedios Mensuales

**Requisito del usuario:**
- Consultar promedio mensual de ingresos
- Consultar promedio mensual de gastos

**Estado actual:**
- Existe código para calcular `monthlyIncome` y `monthlyExpenses` en dashboards
- No existe herramienta del Agent para consultar promedios históricos
- El Agent no puede responder consultas como "dime mi promedio mensual de ingresos"

---

## 🎯 Objetivos

1. **Corregir error de temperature** sin romper compatibilidad con otros modelos
2. **Implementar herramienta `get_monthly_averages`** para el Agent
3. **Asegurar que el Agent pueda responder** consultas sobre promedios mensuales
4. **Mantener código limpio, optimizado y escalable**

---

## 🛠️ Solución Técnica

### Solución 1: Fix de Temperature

**Estrategia:** Crear función helper que retorne configuración condicional según el modelo.

**Implementación:**

```typescript
// lib/ai/config.ts
export const AI_MODEL = 'gpt-5-nano';
export const AI_TEMPERATURE = 0.3; // Mantener para referencia/compatibilidad

/**
 * Retorna configuración de temperature según el modelo
 * GPT-5 models solo soportan temperature=1 (default)
 */
export function getTemperatureConfig(): { temperature?: number } {
  const model = AI_MODEL.toLowerCase();
  
  // GPT-5 models no soportan temperature personalizado
  if (model.includes('gpt-5')) {
    return {}; // Omitir temperature, usar default (1)
  }
  
  // Otros modelos pueden usar temperature personalizado
  return { temperature: AI_TEMPERATURE };
}
```

**Uso en archivos:**

Reemplazar:
```typescript
temperature: AI_TEMPERATURE,
```

Por:
```typescript
...getTemperatureConfig(),
```

**Archivos a modificar:**
1. `lib/ai/agent/core/response-generator.ts` (línea 108)
2. `lib/ai/advisor.ts` (línea 128)
3. `lib/ai/anomaly-detection.ts` (línea 115)
4. `lib/ai/budget-optimizer.ts` (línea 100)
5. `lib/ai/categorization.ts` (línea 77)
6. `lib/ai/predictions.ts` (línea 83)
7. `lib/ai/memory/short-term-memory.ts` (línea 113)
8. `lib/ai/memory/memory-extractor.ts` (línea 102)

### Solución 2: Herramienta get_monthly_averages

**Estrategia:** Crear nueva herramienta que use el repositorio para calcular promedios eficientemente.

**Paso 1: Agregar herramienta en `lib/ai/action-tools.ts`**

```typescript
{
  type: 'function',
  function: {
    name: 'get_monthly_averages',
    description: 'Calcula el promedio mensual de ingresos y gastos basándose en datos históricos. USA ESTO cuando el usuario pregunte por promedios mensuales, promedio de ingresos, promedio de gastos, o promedios históricos. Ejecuta automáticamente sin preguntar.',
    parameters: {
      type: 'object',
      properties: {
        months: {
          type: 'number',
          description: 'Número de meses a considerar para el cálculo (default: 6)',
          default: 6,
          minimum: 1,
          maximum: 24,
        },
        currency: {
          type: 'string',
          enum: ['USD', 'VES', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN', 'BRL'],
          description: 'Moneda para el análisis (opcional, si no se especifica se usa la moneda base)',
        },
      },
      required: [],
    },
  },
},
```

**Paso 2: Implementar handler en `lib/ai/action-executor.ts`**

Buscar el mapeo de herramientas y agregar:

```typescript
// En el switch/case o mapeo de herramientas
case 'get_monthly_averages': {
  return await handleGetMonthlyAverages(userId, params, context);
}
```

**Paso 3: Crear función handler**

Crear nuevo archivo `lib/ai/handlers/monthly-averages-handler.ts`:

```typescript
import { logger } from '@/lib/utils/logger';
import { getRepositoryProvider } from '@/providers/repository-provider';
import { fromMinorUnits } from '@/lib/money';

export interface MonthlyAveragesResult {
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  monthsAnalyzed: number;
  period: string;
  currency?: string;
}

export async function handleGetMonthlyAverages(
  userId: string,
  params: { months?: number; currency?: string },
  context: WalletContext
): Promise<{ success: boolean; data?: MonthlyAveragesResult; message: string; error?: string }> {
  try {
    const months = params.months || 6;
    const currency = params.currency;
    
    logger.info(`[handleGetMonthlyAverages] Calculating averages for ${months} months`);
    
    const repository = getRepositoryProvider().getTransactionsRepository();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Obtener datos de los últimos N meses
    const monthlyData: Array<{ income: number; expense: number }> = [];
    
    for (let i = 0; i < months; i++) {
      const targetMonth = currentMonth - i;
      let year = currentYear;
      let month = targetMonth;
      
      if (targetMonth <= 0) {
        month = 12 + targetMonth;
        year = currentYear - 1;
      }
      
      const totals = await repository.getMonthlyTotals(year);
      const monthData = totals.find(t => t.month === month);
      
      if (monthData) {
        // Convertir de minor units a major units
        monthlyData.push({
          income: fromMinorUnits(monthData.income, currency || 'USD'),
          expense: fromMinorUnits(monthData.expense, currency || 'USD'),
        });
      }
    }
    
    if (monthlyData.length === 0) {
      return {
        success: false,
        message: 'No hay datos suficientes para calcular promedios mensuales.',
        error: 'INSUFFICIENT_DATA',
      };
    }
    
    // Calcular promedios
    const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
    const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expense, 0);
    const averageIncome = totalIncome / monthlyData.length;
    const averageExpenses = totalExpenses / monthlyData.length;
    
    const result: MonthlyAveragesResult = {
      averageMonthlyIncome: averageIncome,
      averageMonthlyExpenses: averageExpenses,
      monthsAnalyzed: monthlyData.length,
      period: `Últimos ${monthlyData.length} meses`,
      currency: currency,
    };
    
    return {
      success: true,
      data: result,
      message: `Promedios calculados para ${monthlyData.length} meses`,
    };
  } catch (error: any) {
    logger.error('[handleGetMonthlyAverages] Error:', error);
    return {
      success: false,
      message: `Error al calcular promedios: ${error.message}`,
      error: error.message,
    };
  }
}
```

**Paso 4: Integrar en action-executor.ts**

Agregar import y caso en el switch:

```typescript
import { handleGetMonthlyAverages } from '../handlers/monthly-averages-handler';

// En el mapeo de herramientas
'get_monthly_averages': async (userId, params, context) => {
  return await handleGetMonthlyAverages(userId, params, context);
},
```

**Paso 5: Verificar formato en response-generator.ts**

El archivo `lib/ai/agent/core/response-generator.ts` ya tiene formato para promedios (líneas 46-51), solo necesita que los datos lleguen correctamente en `result.data`.

---

## 📝 Plan de Implementación Detallado

### Fase 1: Corrección de Temperature (Prioridad Alta)

**Tarea 1.1:** Crear función helper
- [ ] Modificar `lib/ai/config.ts`
- [ ] Agregar `getTemperatureConfig()`
- [ ] Exportar función

**Tarea 1.2:** Actualizar archivos que usan temperature
- [ ] `lib/ai/agent/core/response-generator.ts`
- [ ] `lib/ai/advisor.ts`
- [ ] `lib/ai/anomaly-detection.ts`
- [ ] `lib/ai/budget-optimizer.ts`
- [ ] `lib/ai/categorization.ts`
- [ ] `lib/ai/predictions.ts`
- [ ] `lib/ai/memory/short-term-memory.ts`
- [ ] `lib/ai/memory/memory-extractor.ts`

**Tarea 1.3:** Validación
- [ ] Ejecutar `npm run build`
- [ ] Verificar que no hay errores de compilación
- [ ] Probar que el chat funciona sin error de temperature

### Fase 2: Implementación de get_monthly_averages (Prioridad Alta)

**Tarea 2.1:** Crear herramienta
- [ ] Agregar herramienta en `lib/ai/action-tools.ts`
- [ ] Verificar que la descripción sea clara para el modelo

**Tarea 2.2:** Crear handler
- [ ] Crear `lib/ai/handlers/monthly-averages-handler.ts`
- [ ] Implementar lógica de cálculo
- [ ] Manejar casos edge (sin datos, un solo mes, etc.)

**Tarea 2.3:** Integrar en executor
- [ ] Agregar import en `lib/ai/action-executor.ts`
- [ ] Agregar caso en mapeo de herramientas
- [ ] Verificar que el tipo de retorno sea correcto

**Tarea 2.4:** Verificar formato de respuesta
- [ ] Verificar que `response-generator.ts` formatea correctamente
- [ ] Probar que los datos se muestran al usuario

**Tarea 2.5:** Validación
- [ ] Ejecutar `npm run build`
- [ ] Probar consulta: "dime mi promedio mensual de ingresos"
- [ ] Probar consulta: "dime mi promedio mensual de gastos"
- [ ] Verificar que los cálculos son correctos

### Fase 3: Testing y Optimización

**Tarea 3.1:** Testing manual
- [ ] Probar con diferentes números de meses
- [ ] Probar con diferentes monedas
- [ ] Probar con usuarios sin datos
- [ ] Probar con usuarios con pocos datos

**Tarea 3.2:** Optimización
- [ ] Verificar que `getMonthlyTotals` es eficiente
- [ ] Considerar caché si es necesario
- [ ] Optimizar consultas a base de datos

**Tarea 3.3:** Documentación
- [ ] Agregar comentarios JSDoc
- [ ] Documentar casos edge
- [ ] Actualizar memoria del proyecto

---

## 🔧 Herramientas MCP Utilizadas

### Serena MCP
- ✅ `get_symbols_overview` - Explorar estructura de archivos
- ✅ `find_symbol` - Localizar símbolos específicos
- ✅ `find_referencing_symbols` - Encontrar referencias
- ✅ `search_for_pattern` - Buscar patrones en código
- ✅ `read_memory` - Leer memorias del proyecto
- ✅ `write_memory` - Guardar plan en memoria

### Context7 MCP
- ✅ `resolve-library-id` - Resolver ID de OpenAI
- ✅ `get-library-docs` - Documentación de OpenAI Node SDK

### Sequential Thinking MCP
- ✅ 25 pensamientos estructurados para análisis completo

### Web Search
- ✅ Búsqueda sobre soporte de temperature en GPT-5

---

## 📊 Métricas de Éxito

1. **Error de temperature resuelto:**
   - ✅ No más errores 400 relacionados con temperature
   - ✅ Chat funciona correctamente

2. **Funcionalidad de promedios implementada:**
   - ✅ Usuario puede consultar promedio de ingresos
   - ✅ Usuario puede consultar promedio de gastos
   - ✅ Cálculos son precisos

3. **Calidad de código:**
   - ✅ Build sin errores
   - ✅ Código bien comentado
   - ✅ Optimizado y escalable

---

## 🚨 Consideraciones y Riesgos

### Riesgos Identificados

1. **Modelos futuros:** Si OpenAI cambia el soporte de temperature, la función helper debe actualizarse
2. **Performance:** Cálculo de promedios puede ser lento con muchos meses de datos
3. **Datos insuficientes:** Usuarios nuevos pueden no tener datos históricos

### Mitigaciones

1. **Modelos futuros:** La función helper es fácil de actualizar
2. **Performance:** Usar `getMonthlyTotals` del repositorio (más eficiente)
3. **Datos insuficientes:** Manejar casos edge con mensajes claros

---

## 📚 Referencias

- [OpenAI Node SDK Documentation](https://github.com/openai/openai-node)
- [GPT-5 Temperature Support](https://www.agentx.so/mcp/blog/gpt-5-is-now-available)
- Código base del proyecto FinTec
- Memorias del proyecto: `project_overview`, `codebase_structure`

---

## ✅ Checklist Final

Antes de considerar completado:

- [ ] Error de temperature corregido y probado
- [ ] Herramienta `get_monthly_averages` implementada
- [ ] Handler creado y funcionando
- [ ] Integración en executor completa
- [ ] Build exitoso sin errores
- [ ] Testing manual completado
- [ ] Documentación actualizada
- [ ] Memoria del proyecto actualizada

---

**Fecha de creación:** 2025-01-26  
**Última actualización:** 2025-01-26  
**Estado:** Listo para implementación
