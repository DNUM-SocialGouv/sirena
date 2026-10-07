import { closeSync, existsSync, openSync, readFileSync, unlinkSync } from 'node:fs';
import { type Browser, type BrowserContext, expect } from '@playwright/test';
import { authTokenName, baseUrl, E2E_TARGET, ENTITY_ADMIN_USER, isLocalTarget } from './constants';
import { createLocalAuthFile } from './localAuth';
import { loginWithProconnect } from './login';

export interface AuthConfig {
  user: string;
  password?: string;
  organisation: string;
  fileName: string;
}

export const AUTH_CONFIGS = {
  ENTITY_ADMIN_USER_1: {
    user: ENTITY_ADMIN_USER.user,
    password: ENTITY_ADMIN_USER.password,
    organisation: 'Commune de clamart - Mairie',
    // Namespaced by target: local (forged cookie) and integration (ProConnect)
    // cookies are domain-bound, so they must not share a cache file.
    fileName: `${ENTITY_ADMIN_USER.user}.${E2E_TARGET}.json`,
  },
} as const;

/**
 * Other seeded users (`pnpm op:seed:e2e`). They have no ProConnect account, so
 * they are only available on the local target, where the auth cookie is forged.
 */
export const LOCAL_AUTH_CONFIGS = {
  /** ENTITY_ADMIN of ARS Normandie: the other entity of multi-entity requests. */
  OTHER_ENTITY_ADMIN: {
    user: 'user18@yopmail.com',
    organisation: '',
    fileName: 'user18@yopmail.com.local.json',
  },
  /** READER of ARS Normandie. */
  READER: {
    user: 'reader@yopmail.com',
    organisation: '',
    fileName: 'reader@yopmail.com.local.json',
  },
} as const satisfies Record<string, AuthConfig>;

const LOCAL_AUTH_MIN_REMAINING_SECONDS = 5 * 60;

type StoredCookie = { name: string; expires: number };

function hasValidLocalAuthCookie(authFile: string): boolean {
  try {
    const { cookies } = JSON.parse(readFileSync(authFile, 'utf8')) as { cookies?: StoredCookie[] };
    const authCookie = cookies?.find((cookie) => cookie.name === authTokenName);
    return authCookie !== undefined && authCookie.expires > Date.now() / 1000 + LOCAL_AUTH_MIN_REMAINING_SECONDS;
  } catch {
    return false;
  }
}

function isAuthFileUsable(authFile: string): boolean {
  if (!existsSync(authFile)) {
    return false;
  }
  return !isLocalTarget || hasValidLocalAuthCookie(authFile);
}

export async function ensureAuthenticationFileExists(browser: Browser, config: AuthConfig): Promise<string> {
  const authFile = `playwright/.auth/${config.fileName}`;
  const lockFile = `${authFile}.lock`;

  if (isAuthFileUsable(authFile)) {
    return authFile;
  }

  if (existsSync(authFile)) {
    unlinkSync(authFile);
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
      while (!isAuthFileUsable(authFile) && Date.now() - startTime < maxWaitMs) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }

      if (isAuthFileUsable(authFile)) {
        return authFile;
      } else {
        throw new Error(`Timeout waiting for authentication file: ${authFile}`);
      }
    }
    throw error;
  }

  try {
    // Double-check in case file appeared between lock acquisition and this check
    if (isAuthFileUsable(authFile)) {
      return authFile;
    }

    if (isLocalTarget) {
      // Local target: forge the auth cookie, no ProConnect round-trip.
      await createLocalAuthFile(browser, config.user, authFile);
    } else {
      const context = await browser.newContext({ storageState: undefined });
      const page = await context.newPage();

      try {
        await loginWithProconnect(page, {
          user: config.user,
          password: config.password,
          organisation: config.organisation || 'Commune de clamart - Mairie',
        });

        await expect(page).toHaveURL(`${baseUrl}/home`, { timeout: 30000 });
        await expect(page.getByRole('heading', { name: 'Liste des requêtes', level: 1 })).toBeVisible({
          timeout: 10000,
        });

        await context.storageState({ path: authFile });
      } finally {
        await context.close();
      }
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

  return ensureAuthenticationFileExists(browser, config);
}

export async function getCurrentUserId(context: BrowserContext): Promise<string> {
  const storageState = await context.storageState();
  const jwtCookie = storageState?.cookies?.find((x) => x?.name === 'auth_token')?.value;

  const currentUserId = jwtCookie?.split('.')[1];
  if (!currentUserId) {
    throw new Error('No JWT cookie found');
  }

  let payload: { id?: string };

  try {
    payload = JSON.parse(atob(currentUserId));
  } catch {
    throw new Error('Invalid JWT payload');
  }

  if (!payload.id) {
    throw new Error('No user ID found in JWT payload');
  }

  return payload.id;
}
