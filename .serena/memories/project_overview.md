# FinTec - Proyecto Overview

## Propósito del Proyecto
FinTec es una plataforma moderna e inteligente de gestión de finanzas personales construida con Next.js 14, TypeScript y TailwindCSS. Permite a los usuarios gestionar sus finanzas personales con funcionalidades como:

- Gestión multi-moneda con conversión automática
- Manejo de cuentas (banco, tarjetas, efectivo, inversiones)
- Transacciones (ingresos, gastos, transferencias)
- Categorización con colores e iconos
- Presupuestos mensuales con alertas
- Metas de ahorro con seguimiento
- Reportes visuales y exportación CSV
- Cálculos precisos usando minor units (centavos)

## Tech Stack

### Frontend
- **Next.js 14** con App Router
- **TypeScript** estricto para type safety
- **React 18** con hooks modernos
- **TailwindCSS** con tema personalizado y modo oscuro
- **Framer Motion** para animaciones
- **Lucide React** para iconos

### Estado y Datos
- **Zustand** para manejo de estado global
- **React Hook Form** con validación Zod
- **TanStack Query** para manejo de datos
- **Dexie (IndexedDB)** para persistencia local
- **Stubs de Supabase** listos para migración

### UI y Visualización
- **Chart.js** y **Recharts** para gráficos
- **ECharts** para visualizaciones avanzadas
- **Date-fns** y **DayJS** para manejo de fechas
- **Clsx** y **Tailwind Merge** para clases CSS

### Testing
- **Jest** para tests unitarios
- **Testing Library** para tests de componentes
- **Playwright** para tests E2E

### Desarrollo
- **ESLint** con configuración Next.js
- **Prettier** con plugin de TailwindCSS
- **TypeScript** con configuración estricta

## Arquitectura
El proyecto sigue una arquitectura limpia con separación de responsabilidades:

- **app/**: App Router pages (Next.js 14)
- **components/**: Componentes React organizados por funcionalidad
- **lib/**: Utilidades y helpers
- **repositories/**: Capa de datos con contratos e implementaciones
- **providers/**: Proveedores de servicios
- **types/**: Tipos TypeScript
- **hooks/**: Custom hooks
- **contexts/**: Contextos de React

## Estado Actual
- ✅ Configuración base completa
- ✅ Modelos de dominio y tipos
- ✅ Capa de repositorios implementada
- ✅ Componentes UI base
- ✅ Dashboard con estadísticas
- ✅ Modo oscuro profesional
- 🚧 Páginas de gestión en desarrollo
- 🔮 Migración a Supabase planificada