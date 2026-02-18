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
        console.log(`[INFO] ${message}`, data);
      } else {
        console.log(`[INFO] ${message}`);
      }
    }
  },

  error: (message: string, error?: any) => {
    if (isDev) {
      if (error !== undefined) {
        console.error(`[ERROR] ${message}`, error);
      } else {
        console.error(`[ERROR] ${message}`);
      }
    }
  },

  warn: (message: string, data?: any) => {
    if (isDev) {
      if (data !== undefined) {
        console.warn(`[WARN] ${message}`, data);
      } else {
        console.warn(`[WARN] ${message}`);
      }
    }
  },

  debug: (message: string, data?: any) => {
    if (isDev) {
      if (data !== undefined) {
        console.debug(`[DEBUG] ${message}`, data);
      } else {
        console.debug(`[DEBUG] ${message}`);
      }
    }
  },
};
