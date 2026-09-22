import { createHmac } from 'node:crypto';
import { type Browser, expect } from '@playwright/test';
import { authTokenName, authTokenSecret, baseUrl, isLoggedTokenName } from './constants';

const base64url = (input: Buffer | string): string =>
  (input instanceof Buffer ? input : Buffer.from(input)).toString('base64url');

/**
 * Signs a minimal HS256 JWT, matching what the backend produces with
 * `jsonwebtoken` (default HS256, `iat`/`exp` claims). We sign it here instead of
 * pulling `jsonwebtoken` into the Playwright runtime, which chokes on its CJS
 * dependencies under the ESM test loader.
 */
function signHs256(payload: Record<string, unknown>, secret: string, expiresInSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };
  const header = { alg: 'HS256', typ: 'JWT' };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(fullPayload))}`;
  const signature = createHmac('sha256', secret).update(signingInput).digest('base64url');

  return `${signingInput}.${signature}`;
}

/**
 * Resolves the seeded user by email and returns its database id + role.
 *
 * The id is a non-deterministic cuid regenerated on every reseed, so we look it
 * up by email (which is stable) rather than hardcoding it. Prisma is imported
 * lazily so the integration target never needs a database connection (PG_URL).
 */
async function resolveSeedUser(email: string): Promise<{ id: string; roleId: string }> {
  let db: typeof import('@sirena/db');
  try {
    db = await import('@sirena/db');
  } catch (error) {
    throw new Error(
      `Local auth: failed to load the Prisma client. Generate it first with \`pnpm db:generate\`. (${String(error)})`,
    );
  }
  const { prisma } = db;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, roleId: true },
  });

  if (!user) {
    throw new Error(
      `Local auth: no user found for email "${email}". Seed the local database first (e.g. \`pnpm op:seed\`).`,
    );
  }

  return user;
}

/**
 * Builds an authenticated storageState file by forging the `auth_token` cookie,
 * bypassing ProConnect. The backend is untouched: it already accepts any
 * `auth_token` signed with AUTH_TOKEN_SECRET_KEY for an existing user.
 */
export async function createLocalAuthFile(browser: Browser, email: string, authFile: string): Promise<void> {
  if (!authTokenSecret) {
    throw new Error('Local auth: AUTH_TOKEN_SECRET_KEY is required when E2E_TARGET=local.');
  }

  const { id, roleId } = await resolveSeedUser(email);
  const expiresInSeconds = 12 * 60 * 60; // 12h, enough to cover a full run
  const token = signHs256({ id, roleId }, authTokenSecret, expiresInSeconds);

  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  // Secure cookies are only sent over https (Chromium also trusts http on
  // localhost/127.0.0.1), so mirror the target protocol rather than hardcoding.
  const secure = new URL(baseUrl).protocol === 'https:';
  const context = await browser.newContext({ storageState: undefined });
  try {
    await context.addCookies([
      {
        // Read by the backend auth middleware.
        name: authTokenName,
        value: token,
        url: baseUrl,
        httpOnly: true,
        secure,
        sameSite: 'Strict',
        expires,
      },
      {
        // Read by the frontend router (document.cookie) to allow authenticated routes.
        name: isLoggedTokenName,
        value: 'true',
        url: baseUrl,
        httpOnly: false,
        secure,
        sameSite: 'Strict',
        expires,
      },
    ]);

    // Sanity check: the forged cookie must reach an authenticated /home.
    const page = await context.newPage();
    await page.goto(`${baseUrl}/home`);
    await expect(page).toHaveURL(`${baseUrl}/home`, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Liste des requêtes', level: 1 })).toBeVisible({ timeout: 15000 });

    await context.storageState({ path: authFile });
  } finally {
    await context.close();
  }
}
