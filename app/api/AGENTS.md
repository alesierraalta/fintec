# AGENTS

## Grupo

`Backend API`

## Alcance

- Carpeta base: `app/api`
- Incluye endpoints HTTP, validaciones y contratos de respuesta.

## Responsabilidades

- Exponer operaciones de negocio al frontend.
- Coordinar servicios de `lib/` y repositorios de `repositories/`.
- Normalizar errores, permisos y formato de salida.

## Limites

- No renderizar componentes de interfaz.
- No concentrar reglas de dominio complejas en handlers.

## Notas para indice raiz

- Punto de entrada backend para clientes web y mobile.
- Define contratos entre UI y dominio.
- Depende de `lib/`, `repositories/` y `supabase/`.
