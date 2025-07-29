import { closeSync, existsSync, openSync, unlinkSync } from 'node:fs';
import { type Browser, type BrowserContext, expect } from '@playwright/test';
import { baseUrl, ENTITY_ADMIN_USER } from './constants';
import { loginWithProconnect } from './login';

export interface AuthConfig {
  user: string;
  password: string;
  organisation: string;
  fileName: string;
}

export const AUTH_CONFIGS = {
  ENTITY_ADMIN_USER_1: {
    user: ENTITY_ADMIN_USER.user,
    password: ENTITY_ADMIN_USER.password,
    organisation: 'ville de paris',
    fileName: `${ENTITY_ADMIN_USER.user}.json`,
  },
} as const;

/**
 * Ensures authentication file exists, creating it if necessary with proper locking
 * to prevent race conditions between parallel workers.
 *
 * @param browser Playwright browser instance
 * @param config Authentication configuration
 * @returns Path to the authentication file
 */
export async function ensureAuthenticated(browser: Browser, config: AuthConfig): Promise<string> {
  const authFile = `playwright/.auth/${config.fileName}`;
  const lockFile = `${authFile}.lock`;

  if (existsSync(authFile)) {
    return authFile;
  }

  let hasLock = false;
  try {
    const fd = openSync(lockFile, 'wx');
    closeSync(fd);
    hasLock = true;
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      const maxWaitMs = 60000; // 60 seconds timeout
      const pollIntervalMs = 100;
      const startTime = Date.now();

      // Poll until auth file appears or timeout
      while (!existsSync(authFile) && Date.now() - startTime < maxWaitMs) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }

      if (existsSync(authFile)) {
        return authFile;
      } else {
        throw new Error(`Timeout waiting for authentication file: ${authFile}`);
      }
    }
    throw error;
  }

  try {
    // Double-check in case file appeared between lock acquisition and this check
    if (existsSync(authFile)) {
      return authFile;
    }

    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    try {
      await loginWithProconnect(page, {
        user: config.user,
        password: config.password,
        organisation: config.organisation || 'ville de paris',
      });

      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(`${baseUrl}/home`);

      await context.storageState({ path: authFile });
    } finally {
      await context.close();
    }
  } finally {
    // clean up the lock file
    if (hasLock && existsSync(lockFile)) {
      try {
        unlinkSync(lockFile);
      } catch (error) {
        console.warn(`⚠️ Failed to remove lock file: ${lockFile}`, error);
      }
    }
  }

  return authFile;
}

/**
 * Forces creation of a new authentication session by removing existing files
 *
 * @param browser Playwright browser instance
 * @param config Authentication configuration
 * @returns Path to the new authentication file
 */
export async function forceNewAuthentication(browser: Browser, config: AuthConfig): Promise<string> {
  const authFile = `playwright/.auth/${config.fileName}`;
  const lockFile = `${authFile}.lock`;

  // Remove existing files if they exist
  [authFile, lockFile].forEach((file) => {
    if (existsSync(file)) {
      unlinkSync(file);
    }
  });

  return ensureAuthenticated(browser, config);
}

export async function getCurrentUserId(context: BrowserContext): Promise<string> {
  const storageState = await context.storageState();
  const jwtCookie = storageState?.cookies?.find((x) => x?.name === 'auth_token')?.value;

  const currentUserId = jwtCookie?.split('.')[1];
  if (!currentUserId) {
    throw new Error('No JWT cookie found');
  }

  const payload = JSON.parse(atob(currentUserId));
  if (!payload.id) {
    throw new Error('No user ID found in JWT payload');
  }

  return payload.id;
}
