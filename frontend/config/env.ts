/**
 * Frontend Environment Configuration
 * Validates and exports all environment variables for Next.js
 * 
 * Only NEXT_PUBLIC_* variables are available in the browser
 * Server-side variables must be accessed differently
 */

interface ProcessEnv {
  [key: string]: string | undefined;
}

declare const process: { env: ProcessEnv };

/**
 * Safely access process.env in build time
 */
const getEnvVar = (key: string, defaultValue?: string): string => {
  try {
    const value = process?.env?.[key];
    return value || defaultValue || '';
  } catch {
    return defaultValue || '';
  }
};

/**
 * Client-side environment (available in browser)
 * These are the only vars safe to use in client components
 */
export const clientEnv = {
  apiUrl: getEnvVar('NEXT_PUBLIC_API_URL', '/api'),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
} as const;

/**
 * Server-side environment (only available in Node.js)
 * Use in API routes, middleware, etc.
 */
export const serverEnv = {
  apiUrl: getEnvVar('NEXT_PUBLIC_API_URL', '/api'),
  backendInternalUrl: getEnvVar('BACKEND_INTERNAL_URL', 'http://backend:3001'),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
} as const;

/**
 * Environment helper functions
 */
export const env = {
  isDevelopment: clientEnv.nodeEnv === 'development',
  isProduction: clientEnv.nodeEnv === 'production',
  isStaging: clientEnv.nodeEnv === 'staging',
  apiUrl: clientEnv.apiUrl,
} as const;

// Type exports for TypeScript
export type ClientEnv = typeof clientEnv;
export type Env = typeof env;
