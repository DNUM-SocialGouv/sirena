import type { FullConfig } from '@playwright/test';
import { isLocalTarget } from './utils/constants';

/**
 * Required env vars depend on the target:
 * - integration (default): real ProConnect login, needs the test user credentials.
 * - local: forged auth cookie, needs the token secret and a database to resolve
 *   the seeded user id (PG_URL). No ProConnect password required.
 */
const COMMON_ENV_VARS = ['FRONTEND_URI', 'E2E_CI', 'E2E_ENTITY_ADMIN_USER_1_EMAIL'] as const;

const INTEGRATION_ENV_VARS = ['E2E_ENTITY_ADMIN_USER_1_PASSWORD'] as const;

const LOCAL_ENV_VARS = ['AUTH_TOKEN_SECRET_KEY', 'PG_URL'] as const;

/**
 * Global setup for Playwright tests
 * Validates required environment variables before running tests
 */
export default async function globalSetup(_config: FullConfig) {
  const rawTarget = process.env.E2E_TARGET;
  if (rawTarget !== undefined && rawTarget !== 'local' && rawTarget !== 'integration') {
    console.error(`❌ E2E Setup Failed: unknown E2E_TARGET "${rawTarget}". Use "local" or "integration".`);
    process.exit(1);
  }

  const requiredVars = [...COMMON_ENV_VARS, ...(isLocalTarget ? LOCAL_ENV_VARS : INTEGRATION_ENV_VARS)];

  let missingVars = false;
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`Missing required environment variable: ${varName}`);
      missingVars = true;
    }
  }

  if (missingVars) {
    console.error(`❌ E2E Setup Failed (target: ${isLocalTarget ? 'local' : 'integration'})`);
    console.error(
      '\n💡 To fix this, add to your .env file at project root in local development. (CI envs are set by the CI/CD pipeline):',
    );
    process.exit(1);
  }
}
