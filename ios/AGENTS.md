# AGENTS

## Grupo

`Mobile iOS`

## Alcance

- Carpeta base: `ios`
- Incluye proyecto nativo iOS y configuracion de Xcode.

## Responsabilidades

- Empaquetar y ejecutar la app en iOS.
- Mantener assets nativos, workspace y ajustes de build.
- Soportar integraciones nativas requeridas por la app.

## Limites

- No duplicar reglas de negocio que ya viven en capas compartidas.
- Evitar mezclar decisiones de UI web en configuracion nativa.

## Notas para indice raiz

- Capa de despliegue y runtime iOS.
- Complementa `android/` en mobile.
- Consume el bundle y logica compartida del proyecto.
