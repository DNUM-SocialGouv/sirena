/** biome-ignore-all lint/style/noNonNullAssertion: <Env vars are checked in globalSetup files> */

/**
 * USER CREDENTIALS
 */
export const ENTITY_ADMIN_USER = {
  user: process.env.E2E_ENTITY_ADMIN_USER_1_EMAIL!,
  password: process.env.E2E_ENTITY_ADMIN_USER_1_PASSWORD!,
};

/** URLS */
export const baseUrl = process.env.FRONTEND_URI!;
export const loginUrl = `${baseUrl}/login`;
