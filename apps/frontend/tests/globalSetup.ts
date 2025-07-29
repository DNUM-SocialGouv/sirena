import type { FullConfig } from '@playwright/test';

/**
 * Required environment variables for E2E tests
 */
const REQUIRED_ENV_VARS = [
  'FRONTEND_URI',
  'E2E_CI',
  'E2E_ENTITY_ADMIN_USER_1_EMAIL',
  'E2E_ENTITY_ADMIN_USER_1_PASSWORD',
] as const;

/**
 * Global setup for Playwright tests
 * Validates required environment variables before running tests
 */
export default async function globalSetup(_config: FullConfig) {
  let missingVars = false;
  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      console.error(varName);
      missingVars = true;
    }
  }

  // Crash if missing required variables
  if (missingVars) {
    console.error('❌ E2E Setup Failed: Missing required environment variables:');
    console.error(
      '\n💡 To fix this, add to your .env file at project root in local development. (CI envs are set by the CI/CD pipeline):',
    );
    process.exit(1);
  }
}
