# AGENTS

## Grupo

`Mobile Android`

## Alcance

- Carpeta base: `android`
- Incluye proyecto nativo Android y configuracion de build.

## Responsabilidades

- Empaquetar y ejecutar la app en Android.
- Mantener recursos nativos, manifest y gradle.
- Soportar integraciones nativas requeridas por la app.

## Limites

- No definir reglas de negocio duplicadas del web core.
- Evitar cambios de UI web dentro de artefactos nativos.

## Notas para indice raiz

- Capa de despliegue y runtime Android.
- Complementa `ios/` para estrategia mobile.
- Depende del codigo web compartido del proyecto.
