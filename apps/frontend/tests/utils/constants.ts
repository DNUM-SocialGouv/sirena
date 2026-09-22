/** biome-ignore-all lint/style/noNonNullAssertion: <Env vars are checked in globalSetup files> */

/**
 * TARGET
 *
 * `integration` (default): tests hit the deployed environment and authenticate
 * through the real ProConnect flow.
 * `local`: tests hit a local stack and authenticate by forging the `auth_token`
 * cookie (JWT signed with AUTH_TOKEN_SECRET_KEY), without calling ProConnect.
 */
export type E2ETarget = 'local' | 'integration';
export const E2E_TARGET: E2ETarget = process.env.E2E_TARGET === 'local' ? 'local' : 'integration';
export const isLocalTarget = E2E_TARGET === 'local';

/**
 * USER CREDENTIALS
 */
export const ENTITY_ADMIN_USER = {
  user: process.env.E2E_ENTITY_ADMIN_USER_1_EMAIL!,
  password: process.env.E2E_ENTITY_ADMIN_USER_1_PASSWORD!,
};

/**
 * AUTH TOKEN (local target only)
 *
 * The backend middleware authenticates any request carrying a valid `auth_token`
 * cookie as long as the user exists in database. In local target we sign that
 * cookie ourselves instead of going through ProConnect.
 */
export const authTokenName = process.env.AUTH_TOKEN_NAME ?? 'auth_token';
export const authTokenSecret = process.env.AUTH_TOKEN_SECRET_KEY!;
// Non-httpOnly cookie the frontend router reads to gate authenticated routes.
export const isLoggedTokenName = process.env.IS_LOGGED_TOKEN_NAME ?? 'is_logged_token';

/** URLS */
export const baseUrl = process.env.FRONTEND_URI!;
export const loginUrl = `${baseUrl}/login`;
