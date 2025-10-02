# 📋 CONVENCIONES DE NAMING - PROYECTO FINTEC

## 🎯 OBJETIVO
Establecer convenciones claras para el naming de archivos y prevenir la acumulación de archivos innecesarios en el proyecto.

## 📁 CONVENCIONES DE ARCHIVOS

### ✅ **ARCHIVOS PERMITIDOS**

#### **Tests**
- **Ubicación**: Solo en carpeta `tests/`
- **Formato**: `*.spec.ts` o `*.test.ts`
- **Ejemplos**: 
  - `tests/accounts.spec.ts`
  - `tests/transactions.test.ts`

#### **Debug**
- **Ubicación**: Solo en carpeta `debug/` (temporal)
- **Formato**: `debug-*.ts` o `debug-*.js`
- **Ejemplos**:
  - `debug/auth-debug.ts`
  - `debug/balance-debug.js`

#### **Documentación**
- **Ubicación**: Solo en carpeta `docs/`
- **Formato**: `*.md`
- **Ejemplos**:
  - `docs/API.md`
  - `docs/SETUP.md`

#### **Scripts Utilitarios**
- **Ubicación**: Solo en carpeta `scripts/`
- **Formato**: `*.js` o `*.ts`
- **Ejemplos**:
  - `scripts/setup-database.js`
  - `scripts/migrate-data.ts`

### ❌ **ARCHIVOS PROHIBIDOS EN RAÍZ**

#### **Archivos de Prueba Obsoletos**
- ❌ `test-*.js`
- ❌ `debug-*.js`
- ❌ `test_*.js`

#### **Scripts de Datos Obsoletos**
- ❌ `create-*.js`
- ❌ `insert-*.js`
- ❌ `init-database.js`

#### **Documentación Temporal**
- ❌ `*_ANALYSIS_*.md`
- ❌ `*_SOLUCION_*.md`
- ❌ `*_RESUMEN_*.md`

#### **Archivos de Resultados**
- ❌ `playwright-report/` (en raíz)
- ❌ `test-results/` (en raíz)
- ❌ `*.test-results.json`

#### **Archivos de Backup**
- ❌ `*_backup.*`
- ❌ `*.backup.*`

## 🛠️ SCRIPTS DE LIMPIEZA

### **Limpieza Temporal**
```bash
npm run clean:temp
```
Elimina archivos de resultados de testing y reportes temporales.

### **Limpieza de Documentación**
```bash
npm run clean:docs
```
Elimina documentación temporal y obsoleta.

### **Limpieza Completa**
```bash
npm run clean:all
```
Ejecuta todas las limpiezas automáticas.

## 🔍 VALIDACIÓN

### **Comando de Validación**
```bash
npm run validate:structure
```
Verifica que no hay archivos obsoletos en el proyecto.

## 📅 REVISIÓN PERIÓDICA

### **Frecuencia Recomendada**
- **Semanal**: Revisar archivos temporales y de testing
- **Mensual**: Revisar documentación obsoleta
- **Trimestral**: Revisión completa de estructura de archivos

## 🚨 ACCIONES CORRECTIVAS

Si se encuentran archivos que violan estas convenciones:

1. **Mover** el archivo a la ubicación correcta
2. **Renombrar** siguiendo las convenciones
3. **Eliminar** si es obsoleto o innecesario
4. **Documentar** en el commit el cambio realizado

## 📝 EJEMPLOS DE BUENAS PRÁCTICAS

### ✅ **Correcto**
```
tests/
  ├── accounts.spec.ts
  ├── transactions.test.ts
  └── integration/
      └── e2e.spec.ts

scripts/
  ├── setup-database.js
  ├── migrate-data.ts
  └── backup-db.js

docs/
  ├── API.md
  ├── SETUP.md
  └── ARCHITECTURE.md
```

### ❌ **Incorrecto**
```
├── test-accounts.js          # ❌ Archivo de prueba en raíz
├── debug-auth.js            # ❌ Debug en raíz
├── create-sample-data.js    # ❌ Script obsoleto en raíz
├── SOLUCION_BUG.md          # ❌ Documentación temporal en raíz
└── playwright-report/       # ❌ Resultados en raíz
```

## 🎯 BENEFICIOS

- **Mantenibilidad**: Código más organizado y fácil de mantener
- **Claridad**: Estructura predecible para nuevos desarrolladores
- **Performance**: Menos archivos que procesar en builds
- **Limpieza**: Proyecto más limpio y profesional

---

**⚠️ IMPORTANTE**: Estas convenciones son obligatorias para todos los desarrolladores del equipo. Cualquier violación debe ser corregida inmediatamente.
