import type { FullConfig } from '@playwright/test';
import { E2E_TARGET, E2E_TARGETS, isE2ETarget } from './utils/constants';

/**
 * Required env vars depend on the target:
 * - integration (default): real ProConnect login, needs the test user credentials.
 * - local: forged auth cookie, needs the token secret, the cookie names and a database
 *   to resolve the seeded user id (PG_URL). No ProConnect password required.
 */
const COMMON_ENV_VARS = ['FRONTEND_URI', 'E2E_CI', 'E2E_ENTITY_ADMIN_USER_1_EMAIL'] as const;

const INTEGRATION_ENV_VARS = ['E2E_ENTITY_ADMIN_USER_1_PASSWORD'] as const;

const LOCAL_ENV_VARS = ['AUTH_TOKEN_SECRET_KEY', 'AUTH_TOKEN_NAME', 'IS_LOGGED_TOKEN_NAME', 'PG_URL'] as const;

/**
 * Global setup for Playwright tests
 * Validates required environment variables before running tests
 */
export default async function globalSetup(_config: FullConfig) {
  const rawTarget = process.env.E2E_TARGET;
  if (rawTarget !== undefined && !isE2ETarget(rawTarget)) {
    throw new Error(`E2E Setup Failed: unknown E2E_TARGET "${rawTarget}". Use one of: ${E2E_TARGETS.join(', ')}.`);
  }

  const requiredVars = [...COMMON_ENV_VARS, ...(E2E_TARGET === 'local' ? LOCAL_ENV_VARS : INTEGRATION_ENV_VARS)];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `E2E Setup Failed (target: ${E2E_TARGET}): missing required environment variables: ${missingVars.join(', ')}. ` +
        'Add them to the .env file at project root in local development (CI envs are set by the CI/CD pipeline).',
    );
  }
}
