# AGENTS

## Grupo

`Base de Datos y Plataforma`

## Alcance

- Carpeta base: `supabase`
- Incluye migraciones, configuracion y artefactos de plataforma.

## Responsabilidades

- Gestionar evolucion de esquema y objetos de BD.
- Mantener integridad y trazabilidad de cambios de datos.
- Documentar dependencias con autenticacion y seguridad.

## Limites

- No incluir logica de UI.
- Evitar duplicar reglas ya modeladas en la capa de dominio.

## Notas para indice raiz

- Fuente de verdad de cambios estructurales de datos.
- Integrado con `repositories/` y `lib/supabase/`.
- Clave para despliegues y auditoria tecnica.
