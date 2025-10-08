/**
 * Centralized logging utility
 * Console statements only appear in development mode
 * Silent in production builds
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  info: (message: string, data?: any) => {
    if (isDev) {
      if (data !== undefined) {
        // eslint-disable-next-line no-console
        console.log(`[INFO] ${message}`, data);
      } else {
        // eslint-disable-next-line no-console
        console.log(`[INFO] ${message}`);
      }
    }
  },
  
  error: (message: string, error?: any) => {
    if (isDev) {
      if (error !== undefined) {
        // eslint-disable-next-line no-console
        console.error(`[ERROR] ${message}`, error);
      } else {
        // eslint-disable-next-line no-console
        console.error(`[ERROR] ${message}`);
      }
    }
  },
  
  warn: (message: string, data?: any) => {
    if (isDev) {
      if (data !== undefined) {
        // eslint-disable-next-line no-console
        console.warn(`[WARN] ${message}`, data);
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[WARN] ${message}`);
      }
    }
  },
  
  debug: (message: string, data?: any) => {
    if (isDev) {
      if (data !== undefined) {
        // eslint-disable-next-line no-console
        console.debug(`[DEBUG] ${message}`, data);
      } else {
        // eslint-disable-next-line no-console
        console.debug(`[DEBUG] ${message}`);
      }
    }
  }
};

