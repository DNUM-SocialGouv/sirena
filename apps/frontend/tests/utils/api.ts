import { baseUrl } from './constants';

/**
 * Shared by the API helpers of the e2e tests: they go through the frontend `/api`
 * proxy with the browser context cookies, exactly like the app.
 */
export const apiUrl = (path: string) => `${baseUrl}/api${path}`;

// The backend CSRF guard (hono/csrf, apps/backend/src/app.ts) only accepts
// mutations that look same-origin. A browser always sends these headers, the
// Playwright request context does not.
export const originHeader = { origin: baseUrl, 'sec-fetch-site': 'same-origin' };
