import { envVars } from '../../config/env.js';

const MAX_REDIRECT_PATH_LENGTH = 2048;

/**
 * Keeps the page asked for before login only when it is a path of the application: never another
 * site (`//host`, `/\\host`), never the login page itself.
 */
export const getSafeRedirectPath = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length > MAX_REDIRECT_PATH_LENGTH) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are what is rejected
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  if (value === '/login' || value.startsWith('/login?') || value.startsWith('/login/')) return null;
  return value;
};

/** Where the frontend lands after login: the page asked for, or the home page. */
export const getPostLoginRedirectUrl = (redirectPath: string | null) =>
  redirectPath ? new URL(redirectPath, envVars.FRONTEND_URI).href : envVars.FRONTEND_REDIRECT_URI;
