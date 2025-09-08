# Checklist de Completación de Tareas - FinTec

## Antes de Considerar una Tarea Completada

### 1. Verificación de Código

#### Linting y Formateo
```bash
npm run lint:fix     # Arreglar errores de ESLint
npm run format       # Formatear con Prettier
npm run type-check   # Verificar tipos TypeScript
```

#### Estándares de Código
- [ ] Nombres de variables/funciones siguen camelCase
- [ ] Componentes usan PascalCase
- [ ] Imports organizados correctamente
- [ ] No hay `console.log` en código de producción
- [ ] Tipos TypeScript explícitos donde sea necesario
- [ ] Comentarios JSDoc para funciones públicas

### 2. Testing

#### Tests Unitarios
```bash
npm run test         # Ejecutar todos los tests
npm run test:coverage # Verificar cobertura
```

#### Tests E2E (cuando aplique)
```bash
npm run e2e          # Tests end-to-end
```

#### Checklist de Testing
- [ ] Tests unitarios pasan
- [ ] Cobertura de tests adecuada (>80% para funciones críticas)
- [ ] Tests E2E pasan (para funcionalidades de UI)
- [ ] No hay tests rotos o skipped sin justificación

### 3. Build y Deployment

#### Verificación de Build
```bash
npm run build        # Build de producción debe ser exitoso
```

#### Checklist de Build
- [ ] Build de producción exitoso
- [ ] No hay errores de TypeScript
- [ ] No hay warnings críticos
- [ ] Tamaño del bundle razonable

### 4. Funcionalidad

#### Testing Manual
```bash
npm run dev          # Probar en desarrollo
```

#### Checklist Funcional
- [ ] Funcionalidad implementada según especificaciones
- [ ] UI responsive en diferentes tamaños de pantalla
- [ ] Modo oscuro funciona correctamente
- [ ] Navegación funciona correctamente
- [ ] Formularios validan datos correctamente
- [ ] Estados de carga y error manejados

### 5. Performance y Accesibilidad

#### Checklist de Performance
- [ ] Componentes optimizados (memo, useMemo, useCallback cuando sea necesario)
- [ ] Imágenes optimizadas
- [ ] Lazy loading implementado donde corresponde
- [ ] No hay re-renders innecesarios

#### Checklist de Accesibilidad
- [ ] Elementos interactivos tienen labels apropiados
- [ ] Contraste de colores adecuado
- [ ] Navegación por teclado funciona
- [ ] Screen readers pueden interpretar el contenido

### 6. Documentación

#### Código
- [ ] Funciones complejas tienen comentarios explicativos
- [ ] README actualizado si es necesario
- [ ] Tipos TypeScript documentados

#### Cambios
- [ ] Commit messages descriptivos
- [ ] PR description clara (si aplica)
- [ ] Breaking changes documentados

### 7. Integración

#### Base de Datos (cuando aplique)
- [ ] Migraciones funcionan correctamente
- [ ] Datos de prueba no afectan producción
- [ ] Rollback plan disponible

#### APIs
- [ ] Endpoints funcionan correctamente
- [ ] Validación de datos implementada
- [ ] Manejo de errores apropiado
- [ ] Rate limiting considerado

## Comandos de Verificación Rápida

### Script Completo de Verificación
```bash
# Ejecutar en secuencia antes de considerar tarea completa
npm run lint:fix && \
npm run format && \
npm run type-check && \
npm run test && \
npm run build
```

### Verificación de Desarrollo
```bash
# Para verificación rápida durante desarrollo
npm run type-check && npm run test
```

## Criterios de Definición de "Hecho"

Una tarea se considera completada cuando:

1. ✅ **Funcionalidad**: Cumple todos los requisitos especificados
2. ✅ **Calidad**: Pasa todos los checks de código y tests
3. ✅ **Performance**: No introduce regresiones de rendimiento
4. ✅ **Accesibilidad**: Cumple estándares básicos de accesibilidad
5. ✅ **Documentación**: Código y cambios están documentados
6. ✅ **Integración**: Se integra correctamente con el resto del sistema
7. ✅ **Testing**: Tiene cobertura de tests adecuada

## Casos Especiales

### Hotfixes
- Pueden saltarse algunos pasos de testing E2E
- Requieren verificación manual extra
- Deben incluir plan de rollback

### Features Experimentales
- Pueden tener cobertura de tests reducida
- Deben estar detrás de feature flags
- Requieren documentación extra sobre limitaciones

### Refactoring
- Debe mantener funcionalidad existente
- Tests de regresión obligatorios
- Performance debe mantenerse o mejorar