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
 * - An entity allowed to create a direction or a service. Only the create pages it is
 *   allowed to open are checked: the others redirect to the list. When it has no
 *   direction yet, the e2e direction is created so the service page can be checked too.
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
    const paths = [
      ...(capabilities.canCreateDirection ? ['/admin/directions-services/directions/create'] : []),
      ...(capabilities.canCreateService ? ['/admin/directions-services/services/create'] : []),
    ];
    expect(paths, 'The admin entity can create neither a direction nor a service').not.toHaveLength(0);

    for (const path of paths) {
      await page.goto(`${baseUrl}${path}`);
      const link = page.getByRole('link', { name: 'Annuler', exact: true });
      await expect(link).toHaveAttribute('href', '/admin/directions-services');
      await expect(link).not.toHaveAttribute('aria-current');
    }
  });
});
