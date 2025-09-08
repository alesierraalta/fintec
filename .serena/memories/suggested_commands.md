# Comandos Sugeridos para FinTec

## Comandos de Desarrollo

### Servidor de Desarrollo
```bash
npm run dev          # Inicia servidor de desarrollo en http://localhost:3000
npm run build        # Build de producción
npm run start        # Servidor de producción
```

### Linting y Formateo
```bash
npm run lint         # Ejecuta ESLint
npm run lint:fix     # Arregla errores de lint automáticamente
npm run format       # Formatea código con Prettier
npm run format:check # Verifica formato sin cambios
npm run type-check   # Verifica tipos TypeScript
```

### Testing
```bash
npm run test         # Tests unitarios con Jest
npm run test:watch   # Tests en modo watch
npm run test:coverage # Coverage de tests
npm run e2e          # Tests end-to-end con Playwright
npm run e2e:ui       # Tests e2e con interfaz visual
```

### Utilidades
```bash
npm run seed         # Ejecuta datos de prueba
npm run clean        # Limpia cache (.next, node_modules/.cache)
```

## Comandos del Sistema (Windows)

### Navegación y Archivos
```powershell
dir                  # Listar archivos y directorios
cd <directorio>      # Cambiar directorio
type <archivo>       # Ver contenido de archivo
findstr "texto" *.ts # Buscar texto en archivos TypeScript
```

### Git
```bash
git status           # Estado del repositorio
git add .            # Agregar todos los cambios
git commit -m "msg"  # Commit con mensaje
git push             # Subir cambios
git pull             # Bajar cambios
```

### Node.js y npm
```bash
node --version       # Versión de Node.js
npm --version        # Versión de npm
npm install          # Instalar dependencias
npm list             # Listar dependencias instaladas
```

## Flujo de Trabajo Recomendado

1. **Antes de empezar a trabajar:**
   ```bash
   git pull
   npm install
   npm run type-check
   ```

2. **Durante el desarrollo:**
   ```bash
   npm run dev          # En una terminal
   npm run test:watch   # En otra terminal (opcional)
   ```

3. **Antes de hacer commit:**
   ```bash
   npm run lint:fix
   npm run format
   npm run type-check
   npm run test
   npm run build
   ```

4. **Para testing completo:**
   ```bash
   npm run test:coverage
   npm run e2e
   ```

## Comandos de Debugging

### Análisis de Bundle
```bash
npm run build        # Verificar tamaño del bundle
```

### Logs y Debugging
```bash
# En desarrollo, usar console.log (pero remover antes de commit)
# ESLint mostrará warning para console.log
```

### Performance
```bash
# Next.js incluye métricas de performance automáticamente
# Revisar en DevTools -> Lighthouse
```