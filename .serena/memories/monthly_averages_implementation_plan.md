# Plan de Implementación: Promedios Mensuales y Fix de Temperature

## Problemas Identificados

1. **Error de Temperature**: GPT-5-nano solo soporta temperature=1 (valor por defecto), pero el código usa 0.3
2. **Falta funcionalidad**: No existe herramienta para consultar promedios mensuales de ingresos y gastos

## Soluciones Propuestas

### 1. Fix de Temperature Parameter
- Crear función helper `getTemperatureConfig()` en `lib/ai/config.ts`
- Retornar objeto condicional según modelo
- Actualizar todos los archivos que usan temperature

### 2. Nueva Herramienta get_monthly_averages
- Agregar en `lib/ai/action-tools.ts`
- Implementar handler en `lib/ai/action-executor.ts`
- Usar `getMonthlyTotals()` del repositorio para eficiencia

## Archivos a Modificar

1. `lib/ai/config.ts` - Función helper para temperature
2. `lib/ai/action-tools.ts` - Nueva herramienta
3. `lib/ai/action-executor.ts` - Handler de la herramienta
4. Múltiples archivos - Actualizar uso de temperature

## Estado: Planificado