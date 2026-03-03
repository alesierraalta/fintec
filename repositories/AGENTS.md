# AGENTS

## Grupo

`Acceso a Datos`

## Alcance

- Carpeta base: `repositories`
- Incluye contratos y adaptadores para persistencia.

## Responsabilidades

- Aislar consultas y escrituras de datos del resto del sistema.
- Exponer interfaces claras para la capa de dominio.
- Permitir cambio de backend sin romper casos de uso.

## Limites

- No mezclar logica de presentacion.
- No definir reglas de negocio de alto nivel.

## Notas para indice raiz

- Capa puente entre dominio e infraestructura de datos.
- Soporta implementaciones locales y Supabase.
- Consumida por `lib/` y `app/api/`.
