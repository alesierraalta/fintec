# AGENTS

## Grupo

`Core y Servicios`

## Alcance

- Carpeta base: `lib`
- Incluye logica de negocio, utilidades y servicios compartidos.

## Responsabilidades

- Centralizar reglas de dominio y casos de uso.
- Encapsular integraciones externas y adaptadores tecnicos.
- Proveer funciones reutilizables para API y frontend.

## Limites

- No contener codigo de UI.
- No acoplarse a una sola ruta o pantalla.

## Notas para indice raiz

- Capa central del comportamiento de la aplicacion.
- Reutilizada por `app/api/`, `repositories/` y `tests/`.
- Reduce duplicacion de logica entre modulos.
