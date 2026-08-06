/**
 * Shared user-facing strings for the PWA install surfaces. Single owner so
 * the same sentence is never hand-copied between the interruptive banner
 * (`install-prompt.tsx`) and the persistent settings entry
 * (`install-app-setting.tsx`) and left to drift.
 */

export const INSTALL_SURFACE_LABEL = 'Instalar FinTec';

export const INSTALL_TAGLINE = 'Accede más rápido desde tu pantalla de inicio';

/** Banner title (interruptive prompt) — distinct from the settings entry's title. */
export const INSTALL_BANNER_TITLE = 'Instala FinTec';

/** Settings entry title — distinct from the banner's title. */
export const INSTALL_APP_TITLE = 'Instalar app';

export const INSTALL_UNAVAILABLE_EXPLANATION =
  'El navegador aún no ofreció la instalación. Vuelve a intentarlo más tarde.';

export const INSTALL_NOT_SUPPORTED_EXPLANATION =
  'No disponible en este navegador o entorno.';

export const ALREADY_INSTALLED_TITLE = 'App instalada';

export const ALREADY_INSTALLED_DESCRIPTION =
  'FinTec ya está instalada en este dispositivo';

export const IOS_INSTRUCTIONS_TITLE = 'Instala FinTec en tu pantalla de inicio';

export const IOS_INSTRUCTIONS_DESCRIPTION = 'Agrégala a tu pantalla de inicio';
