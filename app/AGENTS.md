# AGENTS

## Grupo

`Frontend Web`

## Alcance

- Carpeta base: `app`
- Incluye rutas, paginas y flujos de interfaz del producto.

## Responsabilidades

- Definir experiencia de usuario y navegacion.
- Conectar UI con APIs y hooks sin mover logica pesada a la vista.
- Mantener consistencia con componentes compartidos.

## Limites

- No implementar acceso directo a base de datos.
- No duplicar logica de negocio que ya vive en `lib/`.

## Notas para indice raiz

- Capa de presentacion principal de la app.
- Orquesta pantallas y flujos de usuario.
- Consume `components/`, `hooks/` y `app/api/`.
