# 💼 FinTec

Una plataforma moderna e inteligente de gestión de finanzas personales construida con Next.js 14, TypeScript y TailwindCSS.

## ✨ Características

### 🏗️ Arquitectura
- **Next.js 14** con App Router
- **TypeScript** estricto para type safety
- **TailwindCSS** con tema personalizado en modo oscuro
- **Dexie (IndexedDB)** para persistencia local
- **Stubs de Supabase** listos para migración

### 💰 Funcionalidades Financieras
- **Multi-moneda** con conversión automática
- **Cuentas**: Banco, tarjetas, efectivo, inversiones
- **Transacciones**: Ingresos, gastos, transferencias
- **Categorización** con colores e iconos
- **Presupuestos** mensuales con alertas
- **Metas de ahorro** con seguimiento
- **Reportes** visuales y exportación CSV
- **Cálculos precisos** usando minor units (centavos)

### 🎨 Interfaz de Usuario
- **Modo oscuro** profesional
- **Dashboard** interactivo con estadísticas en tiempo real
- **Navegación intuitiva** con sidebar
- **Componentes reutilizables** y accesibles
- **Responsive design** para móvil y escritorio
- **Animaciones suaves** y micro-interacciones

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ 
- npm o yarn

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd FinTec
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

4. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

### Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Linter ESLint
npm run lint:fix     # Arreglar errores de lint
npm run type-check   # Verificar tipos TypeScript

# Testing
npm run test         # Tests unitarios
npm run test:watch   # Tests en modo watch
npm run test:coverage # Coverage de tests
npm run e2e          # Tests end-to-end
npm run e2e:ui       # Tests e2e con UI

# Utilidades
npm run seed         # Datos de prueba
npm run format       # Formatear código
npm run clean        # Limpiar cache
```

## 🏗️ Arquitectura del Proyecto

```
FinTec/
├── app/                    # App Router pages
│   ├── globals.css        # Estilos globales
│   ├── layout.tsx         # Layout principal
│   ├── page.tsx          # Página de inicio
│   ├── accounts/         # Página de cuentas
│   ├── transactions/     # Página de transacciones
│   ├── budgets/          # Página de presupuestos
│   ├── goals/            # Página de metas
│   ├── reports/          # Página de reportes
│   └── settings/         # Configuración
├── components/            # Componentes React
│   ├── ui/               # Componentes base (Button, Input, etc.)
│   ├── layout/           # Componentes de layout
│   └── dashboard/        # Componentes del dashboard
├── lib/                  # Utilidades
│   ├── utils.ts          # Utilidades generales
│   ├── money.ts          # Manejo de dinero
│   ├── dates.ts          # Utilidades de fechas
│   └── csv.ts            # Exportación CSV
├── repositories/         # Capa de datos
│   ├── contracts/        # Interfaces de repositorio
│   ├── local/            # Implementación local (Dexie)
│   └── supabase/         # Stubs de Supabase
├── providers/            # Proveedores de servicios
│   └── exchange-rate-provider.ts
├── types/                # Tipos TypeScript
│   ├── domain.ts         # Modelos de dominio
│   └── index.ts          # Exports de tipos
└── auth/                 # Sistema de autenticación
    ├── local-auth.ts     # Auth local (mock)
    └── supabase-auth.ts  # Auth Supabase (stub)
```

## 💾 Persistencia de Datos

### Actual: IndexedDB (Dexie)
- Almacenamiento local en el navegador
- Sin necesidad de servidor
- Datos persisten entre sesiones
- Funciona offline

### Futuro: Supabase (PostgreSQL)
- Base de datos en la nube
- Autenticación real
- Sincronización entre dispositivos
- Backups automáticos

## 🔧 Configuración

### Variables de Entorno (para Supabase)
Crea un archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Personalización
- **Colores**: Editar `tailwind.config.ts`
- **Categorías**: Modificar `repositories/local/db.ts`
- **Monedas**: Actualizar `lib/money.ts`

## 🧪 Testing

### Tests Unitarios
```bash
npm run test
```

### Tests E2E
```bash
npm run e2e
```

## 📊 Funcionalidades Implementadas

### ✅ Completadas
- [x] Configuración del proyecto (Next.js, TypeScript, TailwindCSS)
- [x] Modelos de dominio y tipos
- [x] Capa de repositorios con contratos
- [x] Implementación local con Dexie
- [x] Stubs de Supabase para migración
- [x] Utilidades de dinero, fechas y CSV
- [x] Proveedores de tasas de cambio
- [x] Componentes UI base
- [x] Layout y navegación
- [x] Dashboard con estadísticas
- [x] Modo oscuro profesional

### 🚧 En Desarrollo
- [ ] Páginas de gestión (Cuentas, Transacciones, etc.)
- [ ] Formularios de creación/edición
- [ ] Sistema de autenticación completo
- [ ] Datos de prueba (seed)
- [ ] Tests unitarios y e2e

### 🔮 Futuro
- [ ] Migración a Supabase
- [ ] Aplicación móvil (React Native)
- [ ] Notificaciones push
- [ ] Integración con bancos
- [ ] Machine Learning para categorización automática

## 🛠️ Migración a Supabase

Cuando estés listo para migrar a Supabase:

1. **Crear proyecto en Supabase**
2. **Configurar variables de entorno**
3. **Ejecutar schema SQL** (disponible en `repositories/supabase/types.ts`)
4. **Cambiar repositorio** en `repositories/index.ts`
5. **Implementar autenticación** real
6. **Migrar datos** existentes

Ver guía completa en `repositories/supabase/client.ts`

## 📱 Responsive Design

La aplicación está optimizada para:
- 📱 **Móvil**: 320px+
- 📱 **Tablet**: 768px+
- 💻 **Desktop**: 1024px+
- 🖥️ **Large Desktop**: 1440px+

## 🎨 Tema y Colores

### Paleta Principal
- **Primary**: Blue (#3b82f6)
- **Success**: Green (#22c55e)
- **Warning**: Yellow (#f59e0b)
- **Danger**: Red (#ef4444)
- **Background**: Gray 950 (modo oscuro)

### Personalización
Edita los colores en `tailwind.config.ts` para personalizar la apariencia.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Para soporte y preguntas:
- 📧 Email: support@miappfinanzas.com
- 💬 Discord: [Servidor de la comunidad]
- 🐛 Issues: [GitHub Issues]

---

**¡Hecho con ❤️ para ayudarte a gestionar mejor tus finanzas!**
