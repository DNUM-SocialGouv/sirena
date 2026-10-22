import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { autoCloseAnnouncements } from './utils/announcements';
import { AUTH_CONFIGS, ensureAuthenticationFileExists } from './utils/authHelper';
import { baseUrl } from './utils/constants';

/**
 * "Annuler" links (RGAA 6.1): they target a previous page, so they must never be
 * announced as the current page.
 *
 * Prerequisites:
 * - Authenticated user has ENTITY_ADMIN role
 * - ADMIN_LOCAL_DIRECTIONS_SERVICES feature flag enabled and an entity allowed to create directions and services
 *   (canCreateDirection / canCreateService), otherwise the create pages redirect and the test times out
 */
test.describe('Back links', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const authFile = await ensureAuthenticationFileExists(browser, AUTH_CONFIGS.ENTITY_ADMIN_USER_1);
    context = await browser.newContext({ storageState: authFile });
    await autoCloseAnnouncements(context);
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('"Annuler" links of the admin forms are not flagged as the current page', async () => {
    for (const path of ['/admin/directions-services/directions/create', '/admin/directions-services/services/create']) {
      await page.goto(`${baseUrl}${path}`);
      const link = page.getByRole('link', { name: 'Annuler', exact: true });
      await expect(link).toHaveAttribute('href', '/admin/directions-services');
      await expect(link).not.toHaveAttribute('aria-current');
    }
  });
});
