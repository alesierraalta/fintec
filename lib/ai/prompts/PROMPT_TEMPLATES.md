# Documentación de Prompt Templates

## Visión General

Este documento describe cada template del sistema de gestión de prompts, su propósito, uso y configuración.

## Templates Principales (Chat Assistant)

### 1. Identity Template

**Archivo**: `templates/identity.ts`

**Propósito**: Define la identidad y rol del asistente financiero.

**Contenido**:
```typescript
"Eres un asistente financiero personal experto e integrado en una aplicación de billetera.
Tu función es ayudar al usuario a entender y gestionar sus finanzas personales de manera clara y práctica."
```

**Prioridad**: 10 (siempre incluido)

**Dependencias**: Ninguna

**Uso**:
```typescript
import { identityTemplate } from './templates/identity';
// Se usa automáticamente en PromptManager
```

---

### 2. Capabilities Template

**Archivo**: `templates/capabilities.ts`

**Propósito**: Lista las capacidades y funcionalidades del asistente.

**Contenido**:
```
CAPACIDADES DEL ASISTENTE:
- Puedes RESPONDER preguntas sobre finanzas
- Puedes CREAR transacciones, presupuestos, metas, cuentas y transferencias
- Puedes ANALIZAR patrones y ofrecer consejos proactivos
```

**Prioridad**: 9

**Dependencias**: identity

**Uso**: Automático en PromptManager cuando se incluye 'capabilities'

---

### 3. Instructions Template

**Archivo**: `templates/instructions.ts`

**Propósito**: Instrucciones críticas y reglas del asistente, organizadas por categoría.

**Secciones**:
- `accountsInstructions`: Instrucciones sobre cuentas
- `actionsVsQueriesInstructions`: Diferencia entre acciones y consultas
- `listAccountsInstructions`: Instrucciones sobre listado de cuentas
- `availableActionsInstructions`: Acciones disponibles
- `whenToUseFunctionsInstructions`: Cuándo usar funciones
- `generalBehaviorInstructions`: Comportamiento general
- `queryExamplesInstructions`: Ejemplos de consultas
- `correctionsInstructions`: Manejo de correcciones
- `limitsInstructions`: Respeto de límites

**Prioridad**: 8

**Dependencias**: identity, capabilities

**Personalización**: Se adapta según `userContext` (hasAccounts, hasTransactions, etc.)

**Uso**:
```typescript
import { getInstructionsTemplate } from './templates/instructions';

const template = getInstructionsTemplate({
  hasAccounts: true,
  hasTransactions: true,
  // ...
});
```

---

### 4. Context Template

**Archivo**: `templates/context.ts`

**Propósito**: Templates para formatear contexto dinámico del usuario.

**Funciones**:
- `formatAccountsSummary(context)`: Formatea resumen de cuentas
- `formatRecentTransactions(context, limit)`: Formatea transacciones recientes
- `formatTransactionsSummary(context)`: Formatea resumen del mes
- `formatBudgets(context)`: Formatea presupuestos activos
- `formatGoals(context)`: Formatea metas activas
- `formatAvailableAccounts(context)`: Formatea lista de cuentas
- `createContextTemplate(context, proactiveSuggestions)`: Crea template completo

**Prioridad**: 7

**Dependencias**: identity

**Uso**:
```typescript
import { createContextTemplate } from './templates/context';

const template = createContextTemplate(walletContext, proactiveSuggestions);
```

---

### 5. Examples Template

**Archivo**: `templates/examples.ts`

**Propósito**: Few-shot examples para diferentes tipos de consultas y situaciones.

**Secciones**:
- `queryExamples`: Ejemplos de consultas comunes
- `actionExamples`: Ejemplos de acciones
- `correctionExamples`: Ejemplos de correcciones

**Prioridad**: 5

**Dependencias**: instructions

**Opcional**: Solo se incluye si `includeExamples: true` en config

**Uso**:
```typescript
import { getExamplesTemplate } from './templates/examples';

const template = getExamplesTemplate(
  includeQueryExamples: true,
  includeActionExamples: true,
  includeCorrectionExamples: true
);
```

---

### 6. System Template

**Archivo**: `templates/system.ts`

**Propósito**: Template base que coordina la composición de todos los demás templates.

**Nota**: Este template se usa principalmente como coordinador. La composición real se hace en PromptManager.

**Prioridad**: 1

**Dependencias**: identity, capabilities, instructions, context

---

## Templates Especializados

### 7. Advisor Template

**Archivo**: `templates/advisor.ts`

**Propósito**: Template para generar consejos financieros personalizados.

**Uso**:
```typescript
import { createAdvisorTemplate, advisorSystemPrompt } from './prompts/templates/advisor';

const template = createAdvisorTemplate(financialData);
// Usar template.content como prompt
// Usar advisorSystemPrompt como system message
```

**Variables Requeridas**:
- `financialData`: Datos financieros del usuario (3 meses)

---

### 8. Categorization Template

**Archivo**: `templates/categorization.ts`

**Propósito**: Template para categorización automática de transacciones.

**Uso**:
```typescript
import { createCategorizationTemplate, categorizationSystemPrompt } from './prompts/templates/categorization';

const template = createCategorizationTemplate(
  description,
  amount,
  merchantInfo,
  categoriesList,
  transactionExamples
);
```

**Variables Requeridas**:
- `description`: Descripción de la transacción
- `amount`: Monto en centavos
- `categoriesList`: Lista de categorías disponibles
- `transactionExamples`: Ejemplos de transacciones previas

---

### 9. Anomaly Detection Template

**Archivo**: `templates/anomaly-detection.ts`

**Propósito**: Template para detección de anomalías y fraudes en transacciones.

**Uso**:
```typescript
import { createAnomalyDetectionTemplate, anomalyDetectionSystemPrompt } from './prompts/templates/anomaly-detection';

const template = createAnomalyDetectionTemplate(recentData, historicalStats);
```

**Variables Requeridas**:
- `recentData`: Transacciones recientes (últimos 30 días)
- `historicalStats`: Estadísticas históricas por categoría

---

### 10. Predictions Template

**Archivo**: `templates/predictions.ts`

**Propósito**: Template para predicciones de gastos futuros.

**Uso**:
```typescript
import { createPredictionsTemplate, predictionsSystemPrompt } from './prompts/templates/predictions';

const template = createPredictionsTemplate(monthlyDataStr);
```

**Variables Requeridas**:
- `monthlyDataStr`: JSON string con datos mensuales de los últimos 6 meses

---

### 11. Budget Optimizer Template

**Archivo**: `templates/budget-optimizer.ts`

**Propósito**: Template para optimización de presupuestos.

**Uso**:
```typescript
import { createBudgetOptimizerTemplate, budgetOptimizerSystemPrompt } from './prompts/templates/budget-optimizer';

const template = createBudgetOptimizerTemplate(budgetData);
```

**Variables Requeridas**:
- `budgetData`: Array con datos de presupuestos y gasto real

---

## Uso del PromptManager

### Generar System Prompt para Chat Assistant

```typescript
import { PromptManager } from './prompts/manager';

const systemPrompt = await PromptManager.generateChatSystemPrompt(
  walletContext,
  proactiveSuggestions,
  userId // Opcional, para caché
);
```

### Componer Prompt Personalizado

```typescript
import { PromptManager } from './prompts/manager';

const config = {
  components: ['identity', 'capabilities', 'instructions'],
  userContext: {
    hasAccounts: true,
    hasTransactions: false,
  },
  options: {
    includeOnlyRelevant: true,
    removeDuplicates: true,
    includeExamples: false,
  },
};

const composed = await PromptManager.composePrompt(
  config,
  walletContext,
  proactiveSuggestions,
  userId
);
```

## Caché de Prompts

### Obtener Prompt Cacheado

```typescript
import { getCachedPrompt } from './prompts/cache';

const cached = await getCachedPrompt(userId, components, context);
```

### Guardar Prompt en Caché

```typescript
import { setCachedPrompt } from './prompts/cache';

await setCachedPrompt(userId, composedPrompt, context);
```

### Invalidar Caché

```typescript
import { invalidatePromptCache } from './prompts/cache';

await invalidatePromptCache(userId);
```

## Mejores Prácticas

1. **Siempre usar PromptManager**: No construir prompts manualmente
2. **Aprovechar el caché**: Pasar `userId` cuando esté disponible
3. **Personalizar según contexto**: Usar `userContext` para optimizar
4. **Monitorear tokens**: Revisar `estimatedTokens` en `ComposedPrompt`
5. **Actualizar templates**: Modificar templates en lugar de código inline

## Extensión del Sistema

### Agregar Nuevo Template

1. Crear archivo en `templates/` con función exportada
2. Agregar al registro en `manager.ts` si es parte del sistema principal
3. Documentar en este archivo
4. Actualizar `ARCHITECTURE.md` si cambia el flujo

### Ejemplo de Nuevo Template

```typescript
// lib/ai/prompts/templates/mi-template.ts
import { PromptTemplate } from '../types';

export function createMiTemplate(data: any): PromptTemplate {
  return {
    name: 'system',
    version: '1.0.0',
    content: `Mi prompt con ${data}`,
    priority: 8,
    optional: false,
  };
}
```

