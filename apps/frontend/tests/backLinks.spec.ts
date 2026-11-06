import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { autoCloseAnnouncements } from './utils/announcements';
import { AUTH_CONFIGS, ensureAuthenticationFileExists } from './utils/authHelper';
import { baseUrl } from './utils/constants';
import { type CreationCapabilities, ensureServiceCreationAllowed } from './utils/directionsServicesApi';

/**
 * "Annuler" links (RGAA 6.1): they target a previous page, so they must never be
 * announced as the current page.
 *
 * Prerequisites:
 * - Authenticated user has ENTITY_ADMIN role
 * - ADMIN_LOCAL_DIRECTIONS_SERVICES feature flag enabled
 * - Authenticated user is the admin of an administrative entity (an ARS, a CD…), the
 *   only level allowed to create both directions and services. When the entity has no
 *   direction yet, the e2e direction is created so that services can be created too.
 */
test.describe('Back links', () => {
  let context: BrowserContext;
  let page: Page;
  let capabilities: CreationCapabilities;

  test.beforeAll(async ({ browser }) => {
    const authFile = await ensureAuthenticationFileExists(browser, AUTH_CONFIGS.ENTITY_ADMIN_USER_1);
    context = await browser.newContext({ storageState: authFile });
    await autoCloseAnnouncements(context);
    page = await context.newPage();
    capabilities = await ensureServiceCreationAllowed(context.request);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('"Annuler" links of the admin forms are not flagged as the current page', async () => {
    // Both pages are always checked: a page the admin may not open redirects to the
    // list, and a regression of these capabilities must fail here, not be skipped.
    expect(
      capabilities,
      'The admin of an administrative entity must be able to create directions and services',
    ).toEqual({ canCreateDirection: true, canCreateService: true });

    for (const path of ['/admin/directions-services/directions/create', '/admin/directions-services/services/create']) {
      await page.goto(`${baseUrl}${path}`);
      const link = page.getByRole('link', { name: 'Annuler', exact: true });
      await expect(link).toHaveAttribute('href', '/admin/directions-services');
      await expect(link).not.toHaveAttribute('aria-current');
    }
  });
});
